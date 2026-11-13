import type { Data, InventoryRecipeTree, RecipeTree, TreeExportOptions } from "../../types/types";
import { DEFAULT_TREE_EXPORT_OPTIONS } from "../../constants";
import { gzipBase64 } from "../../utilities";

/**
 * Clipboard formats understood by the SkyOcean, NoFrills and SkyHanni mods. Each is a
 * versioned prefix followed by gzipped, base64-encoded JSON.
 */

type SkyOceanTree =
  | { shard: string; method: "direct"; quantity: number }
  | {
      shard: string;
      method: "cycle";
      quantity: number;
      craftsExpected: number;
      outputQuantity: number;
      pureReptile: number;
      steps: { shard: string; inputs: [string, string] }[];
      inputRecipe?: SkyOceanTree;
      cycleInputs: SkyOceanTree[];
    }
  | {
      shard: string;
      method: "recipe";
      quantity: number;
      craftsExpected: number;
      outputQuantity: number;
      pureReptile: number;
      inputs: SkyOceanTree[];
    };

type NoFrillsSource = "Direct" | "Fuse" | "Cycle";
type MaterialList = { name: string; needed: number }[];

const toSkyOcean = (tree: RecipeTree): SkyOceanTree => {
  if (tree.method === "direct") return { shard: tree.shard, method: "direct", quantity: tree.quantity };

  if (tree.method === "cycle") {
    const outputQuantity = tree.steps[0].recipe.outputQuantity;
    return {
      shard: tree.shard,
      method: "cycle",
      quantity: tree.quantity,
      craftsExpected: tree.craftsNeeded,
      outputQuantity,
      pureReptile: tree.quantity / outputQuantity,
      steps: tree.steps.map((step) => ({ shard: step.outputShard, inputs: step.recipe.inputs })),
      inputRecipe: tree.inputRecipe ? toSkyOcean(tree.inputRecipe) : undefined,
      cycleInputs: tree.cycleInputs ? tree.cycleInputs.map(toSkyOcean) : [],
    };
  }

  const { outputQuantity } = tree.recipe;
  return {
    shard: tree.shard,
    method: "recipe",
    quantity: tree.quantity,
    craftsExpected: tree.craftsNeeded,
    outputQuantity,
    pureReptile: (tree.quantity - tree.craftsNeeded * outputQuantity) / outputQuantity,
    inputs: tree.inputs ? tree.inputs.map(toSkyOcean) : [],
  };
};

/** A single tree node: an inventory tree without its split (array) nodes. A RecipeTree node is one too. */
type TreeNode = Exclude<InventoryRecipeTree, InventoryRecipeTree[]>;

/**
 * Sum node quantities by `keyOf(node)`, visiting every node (keyOf returns null to skip one).
 * Takes inventory trees too: split nodes are walked into, and inventory leaves have no children.
 */
const sumNodes = (tree: InventoryRecipeTree, keyOf: (node: TreeNode) => string | null): Map<string, number> => {
  const totals = new Map<string, number>();
  const visit = (node: InventoryRecipeTree | undefined) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const key = keyOf(node);
    if (key !== null) totals.set(key, (totals.get(key) || 0) + node.quantity);
    if (node.method === "recipe") node.inputs?.forEach(visit);
    else if (node.method === "cycle") {
      visit(node.inputRecipe);
      node.cycleInputs.forEach(visit);
    }
  };
  visit(tree);
  return totals;
};

/**
 * Adds shards taken from the inventory to the entry `keyFor` picks for that shard. A shard
 * with no entry is skipped: it is fully covered by the inventory, so there is nothing to track.
 */
const addOwned = (totals: Map<string, number>, tree: InventoryRecipeTree, keyFor: (shardId: string) => string | undefined): void => {
  const owned = sumNodes(tree, (node) => (node.method === "inventory" ? node.shard : null));
  for (const [shardId, quantity] of owned) {
    const key = keyFor(shardId);
    if (key !== undefined) totals.set(key, (totals.get(key) || 0) + quantity);
  }
};

const NO_FRILLS_SOURCE: Record<RecipeTree["method"], NoFrillsSource> = { direct: "Direct", recipe: "Fuse", cycle: "Cycle" };

const encode = (prefix: string, payload: unknown) => prefix + gzipBase64(JSON.stringify(payload));

const toMaterialList = (quantities: Map<string, number>, data: Data): MaterialList =>
  Array.from(quantities, ([shardId, needed]) => ({ name: data.shards[shardId].name, needed }));

export const skyOceanTreeString = (tree: RecipeTree): string => encode("<SkyOceanRecipe>(V2):", toSkyOcean(tree));

/**
 * Every node, tagged with how it is obtained. With `countOwned`, shards taken from the inventory
 * are added to the entry of the same shard; without it they are left out, so only the remaining
 * work is listed.
 */
export const noFrillsTreeString = (tree: InventoryRecipeTree, data: Data, options: TreeExportOptions = DEFAULT_TREE_EXPORT_OPTIONS): string => {
  const totals = sumNodes(tree, (node) => (node.method === "inventory" ? null : `${node.shard}|${NO_FRILLS_SOURCE[node.method]}`));
  if (options.countOwned) addOwned(totals, tree, (shardId) => Array.from(totals.keys()).find((key) => key.startsWith(`${shardId}|`)));
  const list = Array.from(totals, ([key, needed]) => {
    const [shardId, source] = key.split("|");
    return { name: data.shards[shardId].name, needed, source: source as NoFrillsSource };
  });
  return encode("<NoFrillsRecipe>(V1):", list);
};

/**
 * Directly-gathered shards, plus:
 * - `includeFused`: fused (and cycled) shards, so the tracker also shows when enough are fused.
 * - `countOwned`: shards taken from the inventory, added to the listed shard they belong to.
 *   SkyHanni's tracker compares `needed` with the shards the player owns, so it needs the full
 *   amount; without them it shows owned / missing instead of owned / total.
 */
export const skyHanniTreeString = (tree: InventoryRecipeTree, data: Data, options: TreeExportOptions = DEFAULT_TREE_EXPORT_OPTIONS): string => {
  const totals = sumNodes(tree, (node) => {
    if (node.method === "direct") return node.shard;
    if (node.method === "inventory") return null;
    return options.includeFused ? node.shard : null;
  });
  if (options.countOwned) addOwned(totals, tree, (shardId) => (totals.has(shardId) ? shardId : undefined));
  return encode("<SkyHanniRecipe>(V1):", toMaterialList(totals, data));
};

/** A flat material total (multi-shard mode), every entry treated as directly gathered. */
export const noFrillsMaterialsString = (totalQuantities: Map<string, number>, data: Data): string =>
  encode(
    "<NoFrillsRecipe>(V1):",
    toMaterialList(totalQuantities, data).map((item) => ({ ...item, source: "Direct" as const })),
  );

export const skyHanniMaterialsString = (totalQuantities: Map<string, number>, data: Data): string =>
  encode("<SkyHanniRecipe>(V1):", toMaterialList(totalQuantities, data));
