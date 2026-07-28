import { ChevronDown, ChevronRight } from "lucide-react";
import type { Data, InventoryRecipeTree, Recipe, Shard } from "../../types/types";

/**
 * Non-component helpers shared byte-for-byte by RecipeTreeNode and
 * InventoryRecipeTreeNode. Kept out of shared.tsx so that file exports only
 * components (react-refresh/only-export-components).
 */

export const isReptileRecipe = (recipe: Recipe | undefined, input1Shard: Shard | undefined, input2Shard: Shard | undefined): boolean => {
  return (recipe?.isReptile || input1Shard?.family?.toLowerCase().includes("reptile") || input2Shard?.family?.toLowerCase().includes("reptile")) as boolean;
};

export const renderChevron = (isExpanded: boolean) => (isExpanded ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4 text-amber-400" />);

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
