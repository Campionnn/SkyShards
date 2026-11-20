import { DEFAULT_CALCULATION_PARAMS } from "../constants";
import type { CalculationParams, Data, Recipe } from "../types/types";
import { getEffectiveOutputQuantity } from "./fusionMath";
import { computeMinCosts } from "./minCostSolver";
import { afterTax, worstSpread, type MarketData, type MarketSettings } from "./profitCalculator";
import { buildQuantifiedTree, collectTreeStats } from "./recipeTree";
import type { RecipeTree } from "../types/types";

/*
 * Multi-step fusion profits ("Fusion chains"): what each shard costs when every input is
 * either bought or fused itself, whichever is cheaper, all the way down. This is the
 * calculator's own min-cost solver run in coin mode with Bazaar buy prices as the direct
 * costs, so the chains match what the calculator would build for the same prices.
 *
 * Only top-of-book prices are used (no order-book walking), and fusing costs no coins.
 */

export interface ChainRow {
  outputId: string;
  /** The cheapest final recipe; its inputs may themselves be fused. */
  recipe: Recipe;
  /** Shards one final fusion yields (fractional for reptile recipes with a Crocodile pet). */
  outputQuantity: number;
  /** Coins per output shard: buying every raw input and fusing up the cheapest way. */
  costPerShard: number;
  /** Sale price per shard, before tax. */
  price: number;
  /** Per output shard, after tax. */
  profit: number;
  /** profit / costPerShard. */
  margin: number;
  /** Fusion steps in the cheapest path: 1 = the inputs are bought, more = some inputs are fused first. */
  depth: number;
  /** Fusions needed for one batch (`batchSize` output shards), counting every step. */
  fusionsPerBatch: number;
  /** profit × batchSize. */
  batchProfit: number;
  /** Raw shards bought for one batch. */
  materials: Map<string, number>;
  /** Selling volume of the result, per hour (the selected sell mode's side). */
  volume: number;
  /** Largest spread among the result and every bought material, as a share of the buy order. */
  maxSpread: number;
  /** Whether any price on the path is one of the user's overrides. */
  usesOverride: boolean;
}

/** Output shards one chain row is worked out for: enough to make whole crafts meaningful. */
export const CHAIN_BATCH_SIZE = 10;

/** Coin-mode params: direct cost = buy price (Infinity when a shard can't be bought), no craft cost. */
const coinParams = (buyPrices: Record<string, number>, crocodileLevel: number): CalculationParams => ({
  ...DEFAULT_CALCULATION_PARAMS,
  rateAsCoinValue: true,
  customRates: buyPrices,
  craftPenalty: 0,
  crocodileLevel,
});

/** `data` with every shard's rate replaced by its buy price, as the solver reads it in coin mode. */
const withPriceRates = (data: Data, buyPrices: Record<string, number>): Data => ({
  recipes: data.recipes,
  shards: Object.fromEntries(Object.entries(data.shards).map(([id, shard]) => [id, { ...shard, rate: buyPrices[id] ?? Infinity }])),
});

/** Fusion steps on the longest branch of a tree (0 for a bought shard). */
const treeDepth = (tree: RecipeTree): number => {
  if (tree.method === "direct") return 0;
  if (tree.method === "recipe") return 1 + Math.max(treeDepth(tree.inputs[0]), treeDepth(tree.inputs[1]));
  return 1 + Math.max(treeDepth(tree.inputRecipe), ...tree.cycleInputs.map(treeDepth));
};

export interface ChainResult {
  rows: ChainRow[];
  /** The priced data the trees were built from, for drawing a row's tree. */
  pricedData: Data;
  /** The cheapest path to a batch of a shard, quantified. */
  treeFor: (outputId: string) => RecipeTree;
}

/**
 * Every fusable shard whose cheapest path is a fusion (not buying it), priced with buy prices
 * for the materials and the sale price for the result.
 */
export const getChainRows = (data: Data, market: MarketData, settings: MarketSettings, crocodileLevel: number): ChainResult => {
  const keep = afterTax(settings.taxPercent);
  const params = coinParams(market.buyPrices, crocodileLevel);
  const pricedData = withPriceRates(data, market.buyPrices);
  const { minCosts, choices } = computeMinCosts(pricedData, params);
  // The shipped recipes have no loops; cycles only appear through recipe overrides, which the
  // Profits page doesn't use. Skip shards whose path loops anyway, rather than mispricing them.
  const treeFor = (outputId: string) => buildQuantifiedTree(pricedData, outputId, CHAIN_BATCH_SIZE, choices, [], params);
  const crocodileMultiplier = 1 + (2 * crocodileLevel) / 100;

  const rows: ChainRow[] = [];
  for (const [outputId, choice] of choices) {
    const recipe = choice.recipe;
    const price = market.sellPrices[outputId];
    const costPerShard = minCosts.get(outputId);
    if (!recipe || price === undefined || costPerShard === undefined || !Number.isFinite(costPerShard)) continue;

    let tree: RecipeTree;
    try {
      tree = treeFor(outputId);
    } catch {
      continue;
    }
    const stats = collectTreeStats(tree, params);
    const materials = stats.totalQuantities;
    const profit = price * keep - costPerShard;
    const volume = settings.sellMode === "offer" ? (market.volumes[outputId]?.instantBuy ?? 0) : (market.volumes[outputId]?.instantSell ?? 0);
    rows.push({
      outputId,
      recipe,
      outputQuantity: getEffectiveOutputQuantity(recipe, crocodileMultiplier),
      costPerShard,
      price,
      profit,
      margin: costPerShard > 0 ? profit / costPerShard : 0,
      depth: treeDepth(tree),
      fusionsPerBatch: stats.craftsNeeded,
      batchProfit: profit * CHAIN_BATCH_SIZE,
      materials,
      volume,
      maxSpread: worstSpread([outputId, ...materials.keys()], market.orderBooks),
      usesOverride: market.sellOverrides.has(outputId) || [...materials.keys()].some((id) => market.buyOverrides.has(id)),
    });
  }
  return { rows, pricedData, treeFor };
};
