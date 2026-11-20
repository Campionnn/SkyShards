import type { AlternativeRecipeOption, AlternativeSelectionContext, CalculationParams, Data, FusionJson, Recipe, RecipeOverride } from "../types/types";
import { DataService } from "./dataService";
import { buildData as buildShardData } from "./shardData";
import { areRecipesEqual, calculateMultipliers, computeCycleQuantities, getDirectCost, getEffectiveOutputQuantity, recipeUnitCost } from "./fusionMath";
import { computeExclusivityScores, computeMinCosts, findCycleNodes } from "./minCostSolver";
import { assignQuantities, buildRecipeTree, calculateTotalTimeFromQuantities, collectTreeStats } from "./recipeTree";

export { snapToInteger, craftsForQuantity } from "./fusionMath";

type GroupedAlternatives = { direct: AlternativeRecipeOption | null; grouped: Record<string, AlternativeRecipeOption[]> };

const DATA_CACHE_LIMIT = 50;

/**
 * Entry point to the calculation engine. The engine itself is the pure functions in
 * shardData / minCostSolver / recipeTree / fusionMath; this class adds loading and
 * caching of the built Data, and is what the UI talks to.
 */
export class CalculationService {
  private static instance: CalculationService | undefined;

  public static getInstance(): CalculationService {
    return (CalculationService.instance ??= new CalculationService());
  }

  /** Built Data per params, oldest evicted first. */
  private dataCache = new Map<string, Data>();
  private defaultRates: Record<string, number> = {};

  /** Base rates.json values (rate > 0 ⇒ directly obtainable). Available after the first parseData/buildData call; empty before that. */
  public getDefaultRates(): Record<string, number> {
    return this.defaultRates;
  }

  /** Every param buildData reads. craftPenalty is absent on purpose: it only affects computeMinCosts, never Data. */
  private getCacheKey(params: CalculationParams): string {
    return JSON.stringify({
      customRates: params.customRates,
      hunterFortune: params.hunterFortune,
      excludeChameleon: params.excludeChameleon,
      frogBonus: params.frogBonus,
      newtLevel: params.newtLevel,
      salamanderLevel: params.salamanderLevel,
      lizardKingLevel: params.lizardKingLevel,
      leviathanLevel: params.leviathanLevel,
      pythonLevel: params.pythonLevel,
      kingCobraLevel: params.kingCobraLevel,
      seaSerpentLevel: params.seaSerpentLevel,
      tiamatLevel: params.tiamatLevel,
      crocodileLevel: params.crocodileLevel,
      kuudraTier: params.kuudraTier,
      moneyPerHour: params.moneyPerHour,
      customKuudraTime: params.customKuudraTime,
      kuudraTimeSeconds: params.kuudraTimeSeconds,
      noWoodenBait: params.noWoodenBait,
      rateAsCoinValue: params.rateAsCoinValue,
    });
  }

  /** Loads fusion-data.json and rates.json (cached by DataService) and builds Data for these params. */
  async parseData(params: CalculationParams): Promise<Data> {
    const cacheKey = this.getCacheKey(params);
    const cached = this.dataCache.get(cacheKey);
    if (cached) return cached;

    try {
      const dataService = DataService.getInstance();
      const [fusionJson, defaultRates] = await Promise.all([dataService.loadFusionJson(), dataService.loadDefaultRates()]);
      const result = this.buildData(fusionJson, defaultRates, params);

      if (this.dataCache.size > DATA_CACHE_LIMIT) {
        const oldestKey = this.dataCache.keys().next().value;
        if (oldestKey) this.dataCache.delete(oldestKey);
      }
      this.dataCache.set(cacheKey, result);
      return result;
    } catch (error) {
      throw new Error(`Failed to parse data: ${error}`);
    }
  }

  buildData(fusionJson: FusionJson, defaultRates: Record<string, number>, params: CalculationParams): Data {
    this.defaultRates = defaultRates;
    return buildShardData(fusionJson, defaultRates, params);
  }

  // Pure engine functions, exposed on the instance for existing callers.
  calculateMultipliers = calculateMultipliers;
  getEffectiveOutputQuantity = getEffectiveOutputQuantity;
  getDirectCost = getDirectCost;
  areRecipesEqual = areRecipesEqual;
  computeMinCosts = computeMinCosts;
  computeExclusivityScores = computeExclusivityScores;
  findCycleNodes = findCycleNodes;
  buildRecipeTree = buildRecipeTree;
  assignQuantities = assignQuantities;
  computeCycleQuantities = computeCycleQuantities;
  collectTreeStats = collectTreeStats;
  calculateTotalTimeFromQuantities = calculateTotalTimeFromQuantities;

  /**
   * Options for the recipe-override modal. For a recipe node: every recipe for the
   * shard plus the direct option, with the current one marked. For a direct input:
   * every recipe, nothing marked.
   */
  async getAlternativesForTreeNode(
    shardId: string,
    params: CalculationParams,
    context: AlternativeSelectionContext,
    recipeOverrides: RecipeOverride[] = [],
  ): Promise<GroupedAlternatives> {
    try {
      const forDirectInput = !!context?.isDirectInput;
      const data = await this.parseData(params);
      const { minCosts } = computeMinCosts(data, params, recipeOverrides);
      const { craftPenalty, crocodileMultiplier } = calculateMultipliers(params);

      const alternatives: AlternativeRecipeOption[] = (data.recipes[shardId] || []).map((recipe) => {
        const cost = recipeUnitCost(recipe, data, minCosts, craftPenalty, crocodileMultiplier);
        return { recipe, cost, timePerShard: cost, isCurrent: false };
      });
      if (!forDirectInput) {
        const directCost = getDirectCost(data.shards[shardId], params.rateAsCoinValue);
        alternatives.push({ recipe: null, cost: directCost, timePerShard: directCost, isCurrent: false });
      }

      const result = groupAlternatives(alternatives);
      if (!forDirectInput) {
        if (result.direct) result.direct.isCurrent = areRecipesEqual(result.direct.recipe, context.currentRecipe);
        for (const group of Object.values(result.grouped)) {
          for (const alt of group) alt.isCurrent = areRecipesEqual(alt.recipe, context.currentRecipe);
        }
      }
      return result;
    } catch (error) {
      console.error("Error getting alternatives for tree node:", error);
      return { direct: null, grouped: {} };
    }
  }

  /** Replaces any existing override for `shardId` with `selectedRecipe` (null = obtain directly). */
  applyRecipeOverride(shardId: string, selectedRecipe: Recipe | null, existingOverrides: RecipeOverride[] = []): RecipeOverride[] {
    return [...existingOverrides.filter((o) => o.shardId !== shardId), { shardId, recipe: selectedRecipe }];
  }
}

/** Splits off the direct option, dedupes fusion recipes, and groups them by first input, cheapest first. */
const groupAlternatives = (alternatives: AlternativeRecipeOption[]): GroupedAlternatives => {
  const direct = alternatives.find((alt) => alt.recipe === null) || null;

  const seen = new Set<string>();
  const grouped: Record<string, AlternativeRecipeOption[]> = {};
  for (const alt of alternatives) {
    if (!alt.recipe) continue;
    const key = `${alt.recipe.inputs[0]}-${alt.recipe.inputs[1]}-${alt.recipe.outputQuantity}`;
    if (seen.has(key)) continue;
    seen.add(key);
    (grouped[alt.recipe.inputs[0]] ??= []).push(alt);
  }

  for (const group of Object.values(grouped)) {
    group.sort((a, b) => a.timePerShard - b.timePerShard);
  }
  return { direct, grouped };
};
