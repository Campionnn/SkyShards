import type { Data, RecipeTree } from "../../types/types";
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

/** Sum node quantities by `keyOf(node)`, visiting every node (keyOf returns null to skip one). */
const sumNodes = (tree: RecipeTree, keyOf: (node: RecipeTree) => string | null): Map<string, number> => {
  const totals = new Map<string, number>();
  const visit = (node: RecipeTree | undefined) => {
    if (!node) return;
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

const NO_FRILLS_SOURCE: Record<RecipeTree["method"], NoFrillsSource> = { direct: "Direct", recipe: "Fuse", cycle: "Cycle" };

const encode = (prefix: string, payload: unknown) => prefix + gzipBase64(JSON.stringify(payload));

const toMaterialList = (quantities: Map<string, number>, data: Data): MaterialList =>
  Array.from(quantities, ([shardId, needed]) => ({ name: data.shards[shardId].name, needed }));

export const skyOceanTreeString = (tree: RecipeTree): string => encode("<SkyOceanRecipe>(V2):", toSkyOcean(tree));

/** Every node, tagged with how it is obtained. */
export const noFrillsTreeString = (tree: RecipeTree, data: Data): string => {
  const totals = sumNodes(tree, (node) => `${node.shard}|${NO_FRILLS_SOURCE[node.method]}`);
  const list = Array.from(totals, ([key, needed]) => {
    const [shardId, source] = key.split("|");
    return { name: data.shards[shardId].name, needed, source: source as NoFrillsSource };
  });
  return encode("<NoFrillsRecipe>(V1):", list);
};

/** Only the directly-gathered leaves. */
export const skyHanniTreeString = (tree: RecipeTree, data: Data): string =>
  encode(
    "<SkyHanniRecipe>(V1):",
    toMaterialList(
      sumNodes(tree, (node) => (node.method === "direct" ? node.shard : null)),
      data,
    ),
  );

/** A flat material total (multi-shard mode), every entry treated as directly gathered. */
export const noFrillsMaterialsString = (totalQuantities: Map<string, number>, data: Data): string =>
  encode(
    "<NoFrillsRecipe>(V1):",
    toMaterialList(totalQuantities, data).map((item) => ({ ...item, source: "Direct" as const })),
  );

export const skyHanniMaterialsString = (totalQuantities: Map<string, number>, data: Data): string =>
  encode("<SkyHanniRecipe>(V1):", toMaterialList(totalQuantities, data));
