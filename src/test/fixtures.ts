import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DEFAULT_CALCULATION_PARAMS } from "../constants";
import type { CalculationParams, Data, FusionJson, InventoryRecipeTree, Recipe, RecipeTree } from "../types/types";

export const PUBLIC_DIR = fileURLToPath(new URL("../../public/", import.meta.url));

const readJson = <T>(name: string): T => JSON.parse(readFileSync(PUBLIC_DIR + name, "utf8")) as T;

/**
 * The real shipped data, not a fixture copy. Goldens are only meaningful if they
 * are pinned against what the app actually loads; the cost of that is that a
 * `update-fusions.yml` data sync legitimately changes the snapshots.
 */
export const loadFusionJson = () => readJson<FusionJson>("fusion-data.json");
export const loadDefaultRates = () => readJson<Record<string, number>>("rates.json");

export const makeParams = (overrides: Partial<CalculationParams> = {}): CalculationParams => ({
  ...DEFAULT_CALCULATION_PARAMS,
  ...overrides,
});

/**
 * Stand-in Bazaar prices for the `rateAsCoinValue` path, derived from rates.json so
 * they are deterministic and committed. Cheaper-to-farm shards come out cheaper to
 * buy, which is the shape of the real price data.
 */
export const coinValueRates = (): Record<string, number> => {
  const rates = loadDefaultRates();
  const prices: Record<string, number> = {};
  for (const [shardId, rate] of Object.entries(rates)) {
    if (rate > 0) prices[shardId] = Math.round(1_000_000 / rate);
  }
  return prices;
};

/** 6 significant figures, so a genuine math change shows but float reassociation doesn't. */
export const fmtCost = (n: number | undefined): string => {
  if (n === undefined) return "<missing>";
  if (!isFinite(n)) return n > 0 ? "Infinity" : "-Infinity";
  return n.toPrecision(6);
};

const fmtRecipe = (recipe: Recipe): string => `${recipe.inputs[0]}+${recipe.inputs[1]} x${recipe.outputQuantity}${recipe.isReptile ? " reptile" : ""}`;

/**
 * One line per shard: `cost <- how it is made`. Sorted by shard id so the snapshot
 * diff points at the shards that actually moved.
 */
export const summarizeMinCosts = (data: Data, minCosts: Map<string, number>, choices: Map<string, { recipe: Recipe | null }>): string[] =>
  Object.keys(data.shards)
    .sort()
    .map((shardId) => {
      const recipe = choices.get(shardId)?.recipe;
      return `${shardId} ${fmtCost(minCosts.get(shardId))} <- ${recipe ? fmtRecipe(recipe) : "direct"}`;
    });

/**
 * Indented tree dump covering every field assignQuantities writes. Handles both tree
 * shapes: the inventory variant adds `method: "inventory"` leaves and array nodes
 * (a node split across several ways of satisfying it).
 */
export const serializeTree = (tree: RecipeTree | InventoryRecipeTree, depth = 0): string[] => {
  const pad = "  ".repeat(depth);

  if (Array.isArray(tree)) {
    return [`${pad}split:`, ...tree.flatMap((branch) => serializeTree(branch, depth + 1))];
  }

  switch (tree.method) {
    case "direct":
      return [`${pad}${tree.shard} direct qty=${tree.quantity}`];

    case "inventory":
      return [`${pad}${tree.shard} inventory qty=${tree.quantity}`];

    case "recipe":
      return [
        `${pad}${tree.shard} recipe qty=${tree.quantity} crafts=${tree.craftsNeeded} [${fmtRecipe(tree.recipe)}]`,
        ...serializeTree(tree.inputs[0], depth + 1),
        ...serializeTree(tree.inputs[1], depth + 1),
      ];

    case "cycle":
      return [
        `${pad}${tree.shard} cycle qty=${tree.quantity} crafts=${tree.craftsNeeded} mult=${fmtCost(tree.multiplier)}`,
        ...tree.steps.map((step) => `${pad}  step ${step.outputShard} = ${fmtRecipe(step.recipe)}`),
        `${pad}  inputRecipe:`,
        ...serializeTree(tree.inputRecipe, depth + 2),
        `${pad}  cycleInputs:`,
        ...tree.cycleInputs.flatMap((input) => serializeTree(input, depth + 2)),
      ];
  }
};

/** Map -> plain object, sorted, so snapshots are stable and readable. */
export const sortedEntries = (map: Map<string, number>): Record<string, number> =>
  Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
