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

export type RecipeTree =
  | {
      shard: string;
      method: "direct";
      quantity: number;
      craftsNeeded?: number; // Not needed for direct, but for type safety
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
      cycles: {
        steps: {
          outputShard: string;
          recipe: Recipe;
        }[];
        expectedCrafts: number;
        expectedOutput: number;
        baseOutput: number;
        multiplier: number;
      }[];
      craftsNeeded: number;
      inputRecipe: RecipeTree;
    }
  | {
      shard: string;
      method: "cycleNode";
      quantity: number;
      recipe: Recipe;
      inputs: [RecipeTree, RecipeTree];
      craftsNeeded: number;
    };

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
  moneyPerHour: number | null;
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
  tooltipTitle?: string;
  tooltipContent?: string;
  tooltipShardName?: string;
  tooltipShardIcon?: string;
  tooltipRarity?: string;
  tooltipWarning?: string;
  tooltipFamily?: string;
  tooltipType?: string;
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
  noWoodenBait?: boolean;
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
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  searchMode?: "enhanced" | "name-only";
}

export interface SuggestionItemProps {
  shard: ShardWithKey;
  index: number;
  focusedIndex: number;
  onSelect: (shard: ShardWithKey) => void;
  isSelecting: boolean;
  setFocusedIndex: (index: number) => void;
}
