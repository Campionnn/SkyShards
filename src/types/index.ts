import type { CalculationFormData } from "../schemas/validation";

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
  isReptile: boolean;
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
  crocodileLevel: number;
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

export interface ShardWithDirectInfo extends ShardWithKey {
  isDirect: boolean;
}

// calculator form
export interface CalculatorFormProps {
  onSubmit: (data: CalculationFormData) => void;
}
export interface PetLevelDropdownProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
}

export interface KuudraDropdownProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

//calcutation results
export interface CalculationResultsProps {
  result: CalculationResult;
  data: Data;
  targetShardName: string;
}

//fusiun tree
export interface RecipeTreeNodeProps {
  tree: RecipeTree;
  data: Data;
  isTopLevel?: boolean;
  totalShardsProduced?: number;
  nodeId: string;
  expandedStates: Map<string, boolean>;
  onToggle: (nodeId: string) => void;
}

// searchbar
export interface ShardAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (shard: ShardWithKey) => void;
  placeholder?: string;
  className?: string;
}

export interface SuggestionItemProps {
  shard: ShardWithKey;
  index: number;
  focusedIndex: number;
  onSelect: (shard: ShardWithKey) => void;
  isSelecting: boolean;
  setFocusedIndex: (index: number) => void;
}
