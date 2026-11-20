import type { CalculationParams, Data, Recipe, RecipeChoice, RecipeOverride } from "../types/types";
import { calculateMultipliers, getDirectCost, getEffectiveOutputQuantity, areRecipesEqual } from "./fusionMath";

export interface MinCostResult {
  /** Cheapest cost of one unit of each shard (hours in time mode, coins in coin mode). */
  minCosts: Map<string, number>;
  /** How each shard is obtained at that cost: a recipe, or null for direct. */
  choices: Map<string, RecipeChoice>;
}

/** Placeholder cost for override cycles that have no finite way in, so relaxation can price them. */
const OVERRIDE_CYCLE_SEED_COST = 1e10;

/**
 * Bellman-Ford style relaxation over the recipe graph (a SPFA work queue).
 *
 * Every shard starts at its direct cost; a shard is re-examined whenever one of its
 * inputs gets cheaper, until nothing improves by more than the tolerance. A shard with
 * a recipe override is pinned to that recipe (or to direct for a null override)
 * instead of taking the cheapest one.
 */
export const computeMinCosts = (data: Data, params: CalculationParams, recipeOverrides: RecipeOverride[] = []): MinCostResult => {
  const minCosts = new Map<string, number>();
  const choices = new Map<string, RecipeChoice>();
  const shards = Object.keys(data.shards);
  const { crocodileMultiplier, craftPenalty } = calculateMultipliers(params);
  const tolerance = params.rateAsCoinValue ? 1e-2 : 1e-10;

  // First override per shard wins, matching a linear `find`.
  const overrides = new Map<string, Recipe | null>();
  for (const override of recipeOverrides) {
    if (!overrides.has(override.shardId)) overrides.set(override.shardId, override.recipe);
  }

  const unitCost = (recipe: Recipe, effectiveOutputQuantity: number): number => {
    const [input1, input2] = recipe.inputs;
    const costInput1 = minCosts.get(input1)! * data.shards[input1].fuse_amount;
    const costInput2 = minCosts.get(input2)! * data.shards[input2].fuse_amount;
    return (costInput1 + costInput2 + craftPenalty) / effectiveOutputQuantity;
  };

  // Reverse edges: which shards use each shard as an input.
  const dependents: Record<string, Set<string>> = {};
  for (const shard of shards) dependents[shard] = new Set();
  for (const outputShard of shards) {
    for (const recipe of data.recipes[outputShard] || []) {
      for (const input of recipe.inputs) dependents[input].add(outputShard);
    }
  }

  const effectiveOutputs: Record<string, number[]> = {};
  for (const shard of shards) {
    effectiveOutputs[shard] = (data.recipes[shard] || []).map((recipe) => getEffectiveOutputQuantity(recipe, crocodileMultiplier));
  }

  for (const shard of shards) {
    minCosts.set(shard, getDirectCost(data.shards[shard], params.rateAsCoinValue));
    choices.set(shard, { recipe: null });
  }

  // Overridden shards start out already on their pinned recipe, but priced at their
  // direct cost. Because the recipe is then already "current", relaxation only moves
  // the price when the recipe is cheaper — so an override can lower a shard's cost
  // below direct but never raise it. Long-standing behaviour, pinned by the goldens.
  for (const override of recipeOverrides) {
    if (override.recipe !== null) choices.set(override.shardId, { recipe: override.recipe });
  }
  if (recipeOverrides.length > 0) seedOverrideCycles(choices, minCosts);

  const queue: string[] = [...shards];
  const inQueue = new Set<string>(queue);
  const update = (shard: string, cost: number, recipe: Recipe | null) => {
    minCosts.set(shard, cost);
    choices.set(shard, { recipe });
    for (const dependent of dependents[shard]) {
      if (!inQueue.has(dependent)) {
        queue.push(dependent);
        inQueue.add(dependent);
      }
    }
  };

  for (let head = 0; head < queue.length; head++) {
    const outputShard = queue[head];
    inQueue.delete(outputShard);

    const currentCost = minCosts.get(outputShard)!;
    const currentRecipe = choices.get(outputShard)!.recipe;

    if (overrides.has(outputShard)) {
      const overrideRecipe = overrides.get(outputShard)!;
      if (overrideRecipe === null) {
        const directCost = getDirectCost(data.shards[outputShard], params.rateAsCoinValue);
        if (Math.abs(directCost - currentCost) > tolerance) update(outputShard, directCost, null);
      } else {
        const newCost = unitCost(overrideRecipe, getEffectiveOutputQuantity(overrideRecipe, crocodileMultiplier));
        if (newCost < currentCost - tolerance || !areRecipesEqual(overrideRecipe, currentRecipe)) update(outputShard, newCost, overrideRecipe);
      }
      continue;
    }

    const recipes = data.recipes[outputShard] || [];
    let bestCost = currentCost;
    let bestRecipe = currentRecipe;
    for (let i = 0; i < recipes.length; i++) {
      const cost = unitCost(recipes[i], effectiveOutputs[outputShard][i]);
      if (cost < bestCost - tolerance) {
        bestCost = cost;
        bestRecipe = recipes[i];
      }
    }

    if (bestCost < currentCost - tolerance || bestRecipe !== currentRecipe) update(outputShard, bestCost, bestRecipe);
  }

  return { minCosts, choices };
};

/**
 * Overrides can pin shards into a loop. If no shard in such a loop has a finite
 * direct cost, every recipe in it prices at Infinity and relaxation can never get a
 * foothold, so give the loop a large finite starting cost instead.
 */
const seedOverrideCycles = (choices: Map<string, RecipeChoice>, minCosts: Map<string, number>): void => {
  for (const cycle of findCycleNodes(choices)) {
    const allInfinite = cycle.every((shardId) => !isFinite(minCosts.get(shardId) || Infinity));
    if (allInfinite) {
      for (const shardId of cycle) minCosts.set(shardId, OVERRIDE_CYCLE_SEED_COST);
    }
  }
};

/**
 * Strongly-connected components (Tarjan) of the graph formed by the chosen recipes,
 * keeping only real loops: components of 2+ shards, or a shard that consumes itself.
 */
export const findCycleNodes = (choices: Map<string, RecipeChoice>): string[][] => {
  const graph = new Map<string, string[]>();
  for (const [shard, choice] of choices) {
    if (choice.recipe) graph.set(shard, choice.recipe.inputs);
  }

  let index = 0;
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const cycles: string[][] = [];

  const strongConnect = (node: string) => {
    indices.set(node, index);
    lowLinks.set(node, index);
    index++;
    stack.push(node);
    onStack.add(node);

    for (const neighbor of graph.get(node) || []) {
      if (!graph.has(neighbor)) continue;

      if (!indices.has(neighbor)) {
        strongConnect(neighbor);
        lowLinks.set(node, Math.min(lowLinks.get(node)!, lowLinks.get(neighbor)!));
      } else if (onStack.has(neighbor)) {
        lowLinks.set(node, Math.min(lowLinks.get(node)!, indices.get(neighbor)!));
      }
    }

    if (lowLinks.get(node) === indices.get(node)) {
      const scc: string[] = [];
      let member: string;
      do {
        member = stack.pop()!;
        onStack.delete(member);
        scc.push(member);
      } while (member !== node);

      if (scc.length > 1 || graph.get(node)!.includes(node)) {
        cycles.push(scc);
      }
    }
  };

  for (const node of graph.keys()) {
    if (!indices.has(node)) strongConnect(node);
  }

  return cycles;
};

/** Cycle detection only matters when the choices can contain a loop; the shipped data has none without overrides. */
export const findCycleNodesIfNeeded = (choices: Map<string, RecipeChoice>, params: CalculationParams, recipeOverrides: RecipeOverride[]): string[][] =>
  params.crocodileLevel > 0 || recipeOverrides.length > 0 ? findCycleNodes(choices) : [];

/**
 * How irreplaceable each shard is as a recipe input, in [0, 1]: high when a shard
 * appears in (nearly) every recipe for a valuable output. Used by the inventory
 * calculation as an opportunity cost for consuming owned shards.
 */
export const computeExclusivityScores = (data: Data, minCosts: Map<string, number>): Map<string, number> => {
  // A shard has to be in at least this share of an output's recipes to count as exclusive.
  const EXCLUSIVE_PRESENCE = 0.8;

  const shardIds = Object.keys(data.shards);
  const maxExclusivity = new Map<string, number>();
  for (const shardId of shardIds) maxExclusivity.set(shardId, 0);

  let maxOutputValue = 0;
  for (const shardId of shardIds) {
    const value = minCosts.get(shardId) || 0;
    if (isFinite(value)) maxOutputValue = Math.max(maxOutputValue, value);
  }
  if (maxOutputValue === 0) maxOutputValue = 1;

  for (const outputShard of shardIds) {
    const recipes = data.recipes[outputShard] || [];
    if (recipes.length === 0) continue;

    const outputValue = minCosts.get(outputShard) || 0;
    if (outputValue <= 0 || !isFinite(outputValue)) continue;
    const normalizedValue = outputValue / maxOutputValue;

    // Different output quantities are different "products", so score them separately.
    const recipesByQuantity = new Map<number, Recipe[]>();
    for (const recipe of recipes) {
      const group = recipesByQuantity.get(recipe.outputQuantity);
      if (group) group.push(recipe);
      else recipesByQuantity.set(recipe.outputQuantity, [recipe]);
    }

    for (const [outputQty, quantityRecipes] of recipesByQuantity) {
      // sqrt dampens the effect: 2x output isn't 2x as important.
      const weight = normalizedValue * Math.sqrt(outputQty);

      // Recipes each input appears in (a shard used twice in one recipe counts once).
      const inputUsageCounts = new Map<string, number>();
      for (const recipe of quantityRecipes) {
        for (const input of new Set(recipe.inputs)) {
          inputUsageCounts.set(input, (inputUsageCounts.get(input) || 0) + 1);
        }
      }

      for (const [inputShard, usageCount] of inputUsageCounts) {
        const presenceRatio = usageCount / quantityRecipes.length;
        if (presenceRatio < EXCLUSIVE_PRESENCE) continue;

        // Rescale [0.8, 1] to [0, 1]. (A literal 0.2, not `1 - 0.8`, which is 0.19999999999999996.)
        const exclusivityStrength = (presenceRatio - EXCLUSIVE_PRESENCE) / 0.2;
        const weightedExclusivity = exclusivityStrength * weight;
        if (weightedExclusivity > (maxExclusivity.get(inputShard) || 0)) {
          maxExclusivity.set(inputShard, weightedExclusivity);
        }
      }
    }
  }

  // Raw scores capped at 1, deliberately not normalised: the inventory logic multiplies
  // them by the shard's own minCost, which provides the scaling.
  const result = new Map<string, number>();
  for (const [shardId, score] of maxExclusivity) {
    result.set(shardId, Math.min(1, Math.max(0, score)));
  }
  return result;
};
