import type { Recipe, Recipes } from "../types/types";

/**
 * Fusion order sensitivity.
 *
 * The fusion table is keyed on the *ordered* input pair, and roughly 5% of pairs are
 * asymmetric: Grove + Phanflare yields Phanpyrus, while Phanflare + Grove yields
 * Phanpyre instead. A recipe is safe to swap only when the same output also lists the
 * mirrored pair, so "order matters" is decided per output shard rather than globally.
 */

/**
 * The `"<input1>|<input2>"` keys an output shard can be fused from, built once per
 * output and memoised against the `Recipes` map it came from.
 *
 * Popular outputs carry thousands of recipes and the tree asks about the same handful
 * of outputs on every render, so the sets are cached rather than rescanned. The
 * WeakMap keys on the map itself: recalculating with new params builds a fresh
 * `Recipes`, which misses the cache and lets the old entry be collected.
 */
const pairKeyCache = new WeakMap<Recipes, Map<string, Set<string>>>();

const pairKeysFor = (recipes: Recipes, outputShardId: string): Set<string> => {
  let byOutput = pairKeyCache.get(recipes);
  if (!byOutput) {
    byOutput = new Map();
    pairKeyCache.set(recipes, byOutput);
  }

  let keys = byOutput.get(outputShardId);
  if (!keys) {
    keys = new Set((recipes[outputShardId] ?? []).map(({ inputs }) => `${inputs[0]}|${inputs[1]}`));
    byOutput.set(outputShardId, keys);
  }
  return keys;
};

/**
 * Whether `recipe`'s inputs have to be fused in the order they are written.
 *
 * Quantity is deliberately ignored when looking for the mirror: no pair in the data
 * yields a different amount when reversed, and matching on it too would only risk
 * warning about recipes that are in fact swappable.
 */
export const isOrderSensitiveRecipe = (outputShardId: string, recipe: Recipe, recipes: Recipes): boolean => {
  const [input1, input2] = recipe.inputs;
  if (input1 === input2) return false;

  const keys = pairKeysFor(recipes, outputShardId);
  // An unknown forward pair means the recipe did not come from this table (a stale
  // override, say), and its mirror's absence proves nothing. Stay quiet instead.
  if (!keys.has(`${input1}|${input2}`)) return false;

  return !keys.has(`${input2}|${input1}`);
};
