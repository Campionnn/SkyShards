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

export type Recipe = {
  inputs: [string, string];
  outputQuantity: number;
};

export type Recipes = {
  [shardId: string]: Recipe[];
};

export type Shards = {
  [shardId: string]: Shard;
};

export interface Data {
  recipes: Recipes;
  shards: Shards;
}

export interface RecipeChoice {
  recipe: Recipe | null;
}

export interface RecipeTree {
  shard: string;
  method: "direct" | "recipe";
  quantity: number;
  recipe?: Recipe;
  inputs?: RecipeTree[];
}

export interface CalculationParams {
  customRates: { [shardId: string]: number };
  hunterFortune: number;
  excludeChameleon: boolean;
  frogPet: boolean;
  newtLevel: number;
  salamanderLevel: number;
  lizardKingLevel: number;
  leviathanLevel: number;
  pythonLevel: number;
  kingCobraLevel: number;
  seaSerpentLevel: number;
  tiamatLevel: number;
  kuudraTier: "none" | "t1" | "t2" | "t3" | "t4" | "t5";
  moneyPerHour: number;
  noWoodenBait: boolean;
}

export interface CalculationResult {
  timePerShard: number;
  totalTime: number;
  totalShardsProduced: number;
  craftsNeeded: number;
  totalQuantities: Map<string, number>;
  totalFusions: number;
  craftTime: number;
  tree: RecipeTree;
}

export interface ShardWithKey extends Shard {
  key: string;
}
