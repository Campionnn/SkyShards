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

export type RecipeTree =
  | {
      shard: string;
      method: "direct";
      quantity: number;
      craftsNeeded?: number;
    }
  | {
      shard: string;
      method: "recipe";
      quantity: number;
      recipe: Recipe;
      inputs: [RecipeTree, RecipeTree];
      craftsNeeded: number;
    }
  | {
      shard: string;
      method: "cycle";
      quantity: number;
      steps: {
        outputShard: string;
        recipe: Recipe;
      }[];
      multiplier: number;
      craftsNeeded: number;
      inputRecipe: RecipeTree;
      cycleInputs: RecipeTree[];
    };

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

export type InventoryRecipeTree =
  | InventoryRecipeTree[]
  | {
      shard: string;
      method: "direct";
      quantity: number;
      craftsNeeded?: number;
    }
  | {
      shard: string;
      method: "inventory";
      quantity: number;
    }
  | {
      shard: string;
      method: "recipe";
      quantity: number;
      recipe: Recipe;
      inputs: [InventoryRecipeTree, InventoryRecipeTree];
      craftsNeeded: number;
    }
  | {
      shard: string;
      method: "cycle";
      quantity: number;
      steps: {
        outputShard: string;
        recipe: Recipe;
      }[];
      multiplier: number;
      craftsNeeded: number;
      inputRecipe: InventoryRecipeTree;
      cycleInputs: InventoryRecipeTree[];
    };
