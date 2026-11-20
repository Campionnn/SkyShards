export interface Shard {
  id: string;
  name: string;
  family: string;
  type: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  fuse_amount: number;
  internal_id: string;
  rate: number;
}

export type Shards = {
  [shardId: string]: Shard;
};

export type Recipe = {
  inputs: [string, string];
  outputQuantity: number;
  isReptile: boolean;
};

export type Recipes = {
  [shardId: string]: Recipe[];
};

export type RecipeOverride = {
  shardId: string;
  recipe: Recipe | null;
};

export interface Data {
  recipes: Recipes;
  shards: Shards;
}

/**
 * The raw on-disk shape of `public/fusion-data.json`: recipes nested output -> output
 * quantity -> input pairs, and shards keyed by id.
 *
 * `Data` is what the app runs on; this is what gets parsed off the wire and fed to
 * `CalculationService.buildData` / `fusionDataToData`. `id` and `rate` are not present
 * in the file itself — they are filled in by whoever builds the `Shard` objects
 * (`DataService.loadShards`, `buildData`) — but readers of this type only touch
 * `name` / `family` / `rarity` / `fuse_amount` / `internal_id`.
 */
export type FusionJson = {
  recipes: Record<string, Record<string, [string, string][]>>;
  shards: Record<string, Shard>;
};

export interface RecipeChoice {
  recipe: Recipe | null;
}

/** One fusion inside a recipe cycle: `outputShard` is made by `recipe`. */
export interface CycleStep {
  outputShard: string;
  recipe: Recipe;
}

/*
 * Tree node variants, shared by RecipeTree and InventoryRecipeTree. The recursive ones
 * take the tree type their children belong to, so each tree stays closed over itself.
 */

/** A shard farmed directly. */
export interface DirectTreeNode {
  shard: string;
  method: "direct";
  quantity: number;
  craftsNeeded?: number;
}

/** A shard fused from two inputs, `craftsNeeded` times. */
export interface FusionTreeNode<Tree> {
  shard: string;
  method: "recipe";
  quantity: number;
  recipe: Recipe;
  inputs: [Tree, Tree];
  craftsNeeded: number;
}

/**
 * A shard produced by a loop of recipes (only reachable through recipe overrides).
 * `inputRecipe` is how the loop is first entered; `cycleInputs` are the external
 * inputs consumed on every lap.
 */
export interface CycleTreeNode<Tree> {
  shard: string;
  method: "cycle";
  quantity: number;
  steps: CycleStep[];
  multiplier: number;
  craftsNeeded: number;
  inputRecipe: Tree;
  cycleInputs: Tree[];
}

/** A shard taken from the player's inventory (inventory calculations only). */
export interface InventoryTreeNode {
  shard: string;
  method: "inventory";
  quantity: number;
}

export type RecipeTree = DirectTreeNode | FusionTreeNode<RecipeTree> | CycleTreeNode<RecipeTree>;

export interface CalculationParams {
  customRates: { [shardId: string]: number };
  hunterFortune: number;
  excludeChameleon: boolean;
  frogBonus: boolean;
  newtLevel: number;
  salamanderLevel: number;
  lizardKingLevel: number;
  leviathanLevel: number;
  pythonLevel: number;
  kingCobraLevel: number;
  seaSerpentLevel: number;
  tiamatLevel: number;
  crocodileLevel: number;
  kuudraTier: "none" | "t1" | "t2" | "t3" | "t4" | "t5";
  moneyPerHour: number | null;
  customKuudraTime: boolean;
  kuudraTimeSeconds: number | null;
  noWoodenBait: boolean;
  rateAsCoinValue: boolean;
  craftPenalty: number;
}

export interface CalculationResult {
  timePerShard: number;
  totalTime: number;
  totalShardsProduced: number;
  craftsNeeded: number;
  totalQuantities: Map<string, number>;
  craftTime: number;
  tree: RecipeTree | null;
  materialBreakdown?: Map<string, Map<string, number>>;
}

export interface ShardWithDirectInfo extends Shard {
  isDirect: boolean;
}

// Alternative recipe types
export interface AlternativeRecipeOption {
  recipe: Recipe | null;
  cost: number;
  timePerShard: number;
  isCurrent: boolean;
}

export interface AlternativeSelectionContext {
  isDirectInput?: boolean;
  inputShard?: string;
  otherInputShard?: string;
  outputShard?: string;
  currentRecipe?: Recipe | null;
  requiredQuantity?: number;
}

export interface InventoryCalculationResult {
  timePerShard: number;
  totalTime: number;
  totalShardsProduced: number;
  craftsNeeded: number;
  totalQuantities: Map<string, number>;
  craftTime: number;
  tree: InventoryRecipeTree | null;
  remainingInventory?: Map<string, number>;
}

/**
 * RecipeTree plus inventory leaves and array nodes. An array is one shard demand split
 * across several ways of satisfying it (e.g. part from inventory, part crafted).
 * A RecipeTree is structurally assignable to this type.
 */
export type InventoryRecipeTree =
  InventoryRecipeTree[] | DirectTreeNode | InventoryTreeNode | FusionTreeNode<InventoryRecipeTree> | CycleTreeNode<InventoryRecipeTree>;
