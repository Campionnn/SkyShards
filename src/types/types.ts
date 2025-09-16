import React from "react";

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

export interface LevelDropdownProps {
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

//calcutation results
export interface CalculationResultsProps {
  result: CalculationResult;
  data: Data;
  targetShardName: string;
  targetShard: string;
  requiredQuantity: number;
  params: CalculationParams;
  onResultUpdate: (result: CalculationResult) => void;
  recipeOverrides: RecipeOverride[];
  onRecipeOverridesUpdate: (overrides: RecipeOverride[]) => void;
  onResetRecipeOverrides: () => void;
  ironManView: boolean;
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
  onShowAlternatives?: (shardId: string, context: AlternativeSelectionContext) => void;
  noWoodenBait?: boolean;
  ironManView: boolean;
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

// Component props interfaces
export interface AlternativeRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Changed: alternatives is now grouped
  alternatives: { direct: AlternativeRecipeOption | null; grouped: Record<string, AlternativeRecipeOption[]> };
  onSelect: (recipe: Recipe | null) => void;
  shardName: string;
  data: Data;
  loading: boolean;
  requiredQuantity?: number;
  params: CalculationParams;
}

export interface RecipeOverrideManagerProps {
  targetShard: string;
  requiredQuantity: number;
  params: CalculationParams;
  onResultUpdate: (result: CalculationResult) => void;
  recipeOverrides: RecipeOverride[];
  onRecipeOverridesUpdate: (overrides: RecipeOverride[]) => void;
  onResetRecipeOverrides: () => void;
  children: (props: { showAlternatives: (shardId: string, context: AlternativeSelectionContext) => void; recipeOverrides: RecipeOverride[]; resetAlternatives: () => void }) => React.ReactNode;
}
