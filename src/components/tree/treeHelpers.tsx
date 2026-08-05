import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Data, InventoryRecipeTree, Recipe, Shard } from "../../types/types";

/**
 * Non-component helpers used by both tree renderers. Kept out of shared.tsx so that
 * file exports only components (react-refresh/only-export-components).
 */

export const isReptileRecipe = (recipe: Recipe | undefined, input1Shard: Shard | undefined, input2Shard: Shard | undefined): boolean => {
  return (recipe?.isReptile || input1Shard?.family?.toLowerCase().includes("reptile") || input2Shard?.family?.toLowerCase().includes("reptile")) as boolean;
};

export const renderChevron = (isExpanded: boolean) => (isExpanded ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4 text-amber-400" />);

/**
 * Read a node's expand/collapse state, seeding a default the first time an id is seen.
 *
 * `expandedStates` is a plain Map owned by the page, held outside React state so
 * toggling one node doesn't rebuild the whole tree. Seeding a default is a write, and
 * writing during render is impure, so defaults are buffered in a ref and flushed in an
 * effect after commit.
 *
 * The Map must end up populated: the page's toggle handler computes the next value as
 * `!expandedStates.get(id)`, which would read `undefined` for an unseeded node and
 * flip a defaulted-open node straight back to open.
 */
export const useExpansionState = (expandedStates: Map<string, boolean>) => {
  const pendingDefaults = React.useRef<Map<string, boolean>>(new Map());

  React.useEffect(() => {
    if (pendingDefaults.current.size === 0) return;
    for (const [id, value] of pendingDefaults.current) {
      if (!expandedStates.has(id)) {
        expandedStates.set(id, value);
      }
    }
    pendingDefaults.current.clear();
  });

  return (id: string, defaultState: boolean = true): boolean => {
    if (expandedStates.has(id)) {
      return expandedStates.get(id)!;
    }
    pendingDefaults.current.set(id, defaultState);
    return defaultState;
  };
};

/**
 * How many Pure Reptile procs the player needs for this node, or null when
 * Crocodile can't double anything here.
 *
 * Typed against InventoryRecipeTree because that is the wider of the two trees — a
 * RecipeTree is structurally assignable to it, and its inputs are never arrays, so
 * the array guards below simply never fire for the plain renderer.
 */
export const getCrocodileProcs = (tree: InventoryRecipeTree, data: Data): number | null => {
  if (Array.isArray(tree)) return null;

  if (tree.method === "cycle") {
    const hasReptile = tree.steps.some((step) => {
      const recipe = step.recipe;
      const input1Shard = data.shards[recipe.inputs[0]];
      const input2Shard = data.shards[recipe.inputs[1]];
      return isReptileRecipe(recipe, input1Shard, input2Shard);
    });
    return hasReptile ? Math.ceil(tree.quantity / 2) : null;
  }

  if (tree.method === "recipe") {
    const recipe = tree.recipe;
    const input1Shard = data.shards[recipe.inputs[0]];
    const input2Shard = data.shards[recipe.inputs[1]];
    if (isReptileRecipe(recipe, input1Shard, input2Shard)) {
      const requiredOutputQuantity = tree.quantity;
      let inputQuantityOfReptile = 0;
      let inputFuseAmount = 0;
      if (input1Shard?.family?.toLowerCase().includes("reptile")) {
        inputQuantityOfReptile = Array.isArray(tree.inputs[0]) ? 0 : tree.inputs[0].quantity;
        inputFuseAmount = input1Shard.fuse_amount;
      } else if (input2Shard?.family?.toLowerCase().includes("reptile")) {
        inputQuantityOfReptile = Array.isArray(tree.inputs[1]) ? 0 : tree.inputs[1].quantity;
        inputFuseAmount = input2Shard.fuse_amount;
      }
      return Math.ceil(requiredOutputQuantity / tree.recipe.outputQuantity - inputQuantityOfReptile / inputFuseAmount);
    }
  }

  return null;
};
