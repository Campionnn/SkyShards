import type { CalculationParams, CycleStep, Data, Recipe, Shard } from "../types/types";

/*
 * Small pure helpers shared by every stage of the calculation. The float handling in
 * here is deliberate and pinned by the golden tests — change arithmetic order with care.
 */

const INTEGER_EPSILON = 1e-12;

/** Rounds `value` to the nearest integer if it is only float noise away from it. */
export const snapToInteger = (value: number): number => {
  if (!Number.isFinite(value)) return value;
  const rounded = Math.round(value);
  return Math.abs(value - rounded) <= INTEGER_EPSILON * Math.max(1, Math.abs(value)) ? rounded : value;
};

/** Crafts needed to make `quantity`, robust to e.g. `12 / 1.2` landing a hair above 10. */
export const craftsForQuantity = (quantity: number, outputQuantity: number): number => Math.ceil(snapToInteger(quantity / outputQuantity));

/**
 * Pet multipliers derived from the params. Tiamat boosts Sea Serpent, which boosts
 * Python (black-hole shard rate) and King Cobra (black-hole shard fortune). Crocodile
 * scales the output of reptile recipes.
 *
 * `craftPenalty` is the cost charged per fusion: seconds converted to hours in time
 * mode, used raw in coin mode.
 */
export const calculateMultipliers = (params: CalculationParams) => {
  const tiamatMultiplier = 1 + (5 * params.tiamatLevel) / 100;
  const seaSerpentMultiplier = 1 + ((2 * params.seaSerpentLevel) / 100) * tiamatMultiplier;
  const crocodileMultiplier = 1 + (2 * params.crocodileLevel) / 100;
  const pythonMultiplier = ((5 * params.pythonLevel) / 100) * seaSerpentMultiplier;
  const kingCobraMultiplier = (params.kingCobraLevel / 100) * seaSerpentMultiplier;
  const craftPenalty = params.rateAsCoinValue ? params.craftPenalty : params.craftPenalty / 3600;
  return {
    tiamatMultiplier,
    seaSerpentMultiplier,
    crocodileMultiplier,
    pythonMultiplier,
    kingCobraMultiplier,
    craftPenalty,
  };
};

/** Expected output of one craft: reptile recipes are scaled by the crocodile multiplier (so may be fractional). */
export const getEffectiveOutputQuantity = (recipe: { isReptile: boolean; outputQuantity: number }, crocodileMultiplier: number): number =>
  recipe.isReptile ? recipe.outputQuantity * crocodileMultiplier : recipe.outputQuantity;

/** Cost of obtaining one shard directly: its coin price, or 1/rate hours. Infinity when it can't be obtained. */
export const getDirectCost = (shard: Shard, rateAsCoinValue: boolean): number => {
  if (shard.rate <= 0) return Infinity;
  return rateAsCoinValue ? shard.rate : 1 / shard.rate;
};

/** Cost per output shard of `recipe`, given the current per-shard costs. */
export const recipeUnitCost = (recipe: Recipe, data: Data, minCosts: Map<string, number>, craftPenalty: number, crocodileMultiplier: number): number => {
  const [input1, input2] = recipe.inputs;
  const cost1 = minCosts.get(input1) || Infinity;
  const cost2 = minCosts.get(input2) || Infinity;
  const totalCost = cost1 * data.shards[input1].fuse_amount + cost2 * data.shards[input2].fuse_amount + craftPenalty;
  return totalCost / getEffectiveOutputQuantity(recipe, crocodileMultiplier);
};

/** Same inputs (in either order), output quantity and reptile flag. Two nulls are equal. */
export const areRecipesEqual = (a: Recipe | null, b: Recipe | null | undefined): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;

  const aInputs = [...a.inputs].sort();
  const bInputs = [...b.inputs].sort();
  return aInputs[0] === bInputs[0] && aInputs[1] === bInputs[1] && a.outputQuantity === b.outputQuantity && a.isReptile === b.isReptile;
};

/**
 * Quantity math for a cycle node: how many crafts the loop needs to run to yield
 * `requiredQuantity` of `shard`, and how much of each external input that costs.
 *
 * Returns null when `steps` holds no recipe producing `shard`; every caller treats
 * that as "leave the node alone".
 *
 * `netOutputPerCycle` is the sensitive part: a float subtraction feeding a ceil, so
 * e.g. `2 * 1.2 - 2` lands on 0.3999999999999999, which used to round a 250-craft
 * loop up to 252. `craftsForQuantity` snaps the ratio back onto the whole number it
 * is a hair away from.
 */
export const computeCycleQuantities = (
  shard: string,
  steps: CycleStep[],
  requiredQuantity: number,
  data: Data,
  crocodileMultiplier: number,
): { roundedCrafts: number; stepCount: number; quantityForInput: (inputShard: string) => number } | null => {
  const outputStep = steps.find((step) => step.outputShard === shard);
  if (!outputStep) return null;

  const expectedOutput = getEffectiveOutputQuantity(outputStep.recipe, crocodileMultiplier);

  // How much of the target the loop eats on its way round, so a cycle that consumes
  // more than it makes still terminates (via the expectedOutput fallback below).
  let totalInputsConsumed = 0;
  for (const step of steps) {
    for (const inputId of step.recipe.inputs) {
      if (inputId === shard) totalInputsConsumed += data.shards[inputId].fuse_amount;
    }
  }

  // Snapped before the sign test: `5 * 1.2 - 6` is 8.9e-16, i.e. a loop that nets
  // exactly nothing would otherwise read as net-positive and demand a preposterous
  // number of crafts instead of falling through to the expectedOutput branch.
  const netOutputPerCycle = snapToInteger(expectedOutput - totalInputsConsumed);
  const expectedCrafts = craftsForQuantity(requiredQuantity, netOutputPerCycle > 0 ? netOutputPerCycle : expectedOutput);
  const stepCount = steps.length;
  // Every step of the loop runs the same number of times, so round up to a whole
  // number of laps.
  const roundedCrafts = Math.ceil(expectedCrafts / stepCount) * stepCount;

  // Inputs produced inside the loop are already accounted for by the loop itself;
  // only the ones that have to come from outside get a quantity.
  const outputShards = new Set(steps.map((step) => step.outputShard));
  const inputQuantities = new Map<string, number>();
  for (const step of steps) {
    for (const inputId of step.recipe.inputs) {
      if (!outputShards.has(inputId)) {
        inputQuantities.set(inputId, (inputQuantities.get(inputId) || 0) + data.shards[inputId].fuse_amount);
      }
    }
  }

  return {
    roundedCrafts,
    stepCount,
    quantityForInput: (inputShard) => (inputQuantities.get(inputShard) || 0) * (roundedCrafts / stepCount),
  };
};
