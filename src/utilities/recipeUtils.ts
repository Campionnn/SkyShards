import type { ShardWithKey } from "../types/types";

export interface FusionData {
  recipes: Record<string, Record<string, string[][]>>;
  shards: Record<
    string,
    {
      name: string;
      family: string;
      type: string;
      rarity: string;
      fuse_amount: number;
      internal_id: string;
    }
  >;
}

export interface OutputGroup {
  output: string;
  fuseAmount: number;
  partners: string[];
  quantities: Map<string, number>;
  selectedPosition: "first" | "second"; // Position of the selected shard for this output
}

export interface Recipe {
  input1: string;
  input2: string;
  quantity: number;
}

export interface GroupedRecipe {
  recipes: Recipe[];
  isGroup: boolean;
  commonShard: string;
  commonPosition: "input1" | "input2" | "";
  fusionType: "special" | "id" | "chameleon";
}

export interface CategorizedRecipes {
  special: GroupedRecipe[];
  id: GroupedRecipe[];
  chameleon: GroupedRecipe[];
}

const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"];

const iterateRecipes = (fusionData: FusionData, callback: (outputId: string, recipe: string[], quantity: number) => void) => {
  Object.entries(fusionData.recipes).forEach(([outputShardId, recipeData]) => {
    Object.entries(recipeData).forEach(([quantityStr, recipeList]) => {
      const outputQuantity = parseInt(quantityStr, 10);
      recipeList.forEach((recipe) => {
        if (recipe.length === 2) {
          // Keep the original order for display, don't normalize here
          callback(outputShardId, recipe, outputQuantity);
        }
      });
    });
  });
};

const sortByRarity = (a: string, b: string, fusionData: FusionData) => {
  const shardA = fusionData.shards[a];
  const shardB = fusionData.shards[b];
  const rarityA = RARITY_ORDER.indexOf((shardA?.rarity || "common").toLowerCase());
  const rarityB = RARITY_ORDER.indexOf((shardB?.rarity || "common").toLowerCase());
  if (rarityA !== rarityB) return rarityA - rarityB;
  return (shardA?.name || "").localeCompare(shardB?.name || "");
};

export const processInputRecipes = (selectedShard: ShardWithKey, fusionData: FusionData): OutputGroup[] => {
  const outputMap = new Map<string, { partners: Set<string>; quantities: Map<string, number>; selectedPosition: "first" | "second" | null }>();

  iterateRecipes(fusionData, (outputShardId, recipe, outputQuantity) => {
    const [input1, input2] = recipe;

    let partnerShard = null;
    let selectedPosition: "first" | "second" | null = null;

    // Check if the selected shard matches either input in the original recipe
    if (input1 === selectedShard.key) {
      partnerShard = input2;
      selectedPosition = "first";
    } else if (input2 === selectedShard.key) {
      partnerShard = input1;
      selectedPosition = "second";
    }

    if (partnerShard && selectedPosition) {
      if (!outputMap.has(outputShardId)) {
        outputMap.set(outputShardId, {
          partners: new Set(),
          quantities: new Map(),
          selectedPosition,
        });
      }

      const outputData = outputMap.get(outputShardId)!;
      outputData.partners.add(partnerShard);
      outputData.quantities.set(partnerShard, outputQuantity);

      // Keep the first position we encounter for this output
      if (outputData.selectedPosition === null) {
        outputData.selectedPosition = selectedPosition;
      }
    }
  });

  const outputGroups: OutputGroup[] = Array.from(outputMap.entries()).map(([outputShardId, outputData]) => ({
    output: outputShardId,
    fuseAmount: fusionData.shards[outputShardId]?.fuse_amount || 2,
    partners: Array.from(outputData.partners).sort(),
    quantities: outputData.quantities,
    selectedPosition: outputData.selectedPosition!,
  }));

  outputGroups.sort((a, b) => sortByRarity(a.output, b.output, fusionData));
  return outputGroups;
};

export const processOutputRecipes = (selectedShard: ShardWithKey, fusionData: FusionData): Recipe[] => {
  const recipes: Recipe[] = [];

  iterateRecipes(fusionData, (outputShardId, recipe, outputQuantity) => {
    if (outputShardId === selectedShard.key) {
      const [input1, input2] = recipe;
      recipes.push({ input1, input2, quantity: outputQuantity });
    }
  });

  return recipes;
};

export const filterGroups = (groups: OutputGroup[], filterValue: string, fusionData: FusionData): OutputGroup[] => {
  if (!filterValue.trim()) return groups;

  const searchTerm = filterValue.toLowerCase();
  return groups.filter((group) => {
    const outputShard = fusionData.shards[group.output];
    return outputShard?.name.toLowerCase().includes(searchTerm) || group.partners.some((partnerId) => fusionData.shards[partnerId]?.name.toLowerCase().includes(searchTerm));
  });
};

// Determine fusion type per spec.
const classifyFusion = (recipe: Recipe): "special" | "id" | "chameleon" => {
  const isChameleon = recipe.input1 === "L4" || recipe.input2 === "L4";
  if (isChameleon) return "chameleon"; // Chameleon overrides other types
  if (recipe.quantity === 2) return "special";
  return "id"; // quantity === 1 (or other) default to id per description
};

// Create a normalized key for recipe comparison (always put lexicographically smaller shard first)
const createRecipeKey = (input1: string, input2: string, quantity: number): string => {
  const sortedInputs = [input1, input2].sort();
  return `${sortedInputs[0]}-${sortedInputs[1]}-${quantity}`;
};

// Analyze shard position frequency across all recipes
const analyzeShardPositions = (recipes: Recipe[]) => {
  const position1Count = new Map<string, number>();
  const position2Count = new Map<string, number>();
  
  recipes.forEach(recipe => {
    position1Count.set(recipe.input1, (position1Count.get(recipe.input1) || 0) + 1);
    position2Count.set(recipe.input2, (position2Count.get(recipe.input2) || 0) + 1);
  });
  
  return { position1Count, position2Count };
};

// Determine the preferred position for a shard based on frequency
const getPreferredPosition = (shardId: string, position1Count: Map<string, number>, position2Count: Map<string, number>): "input1" | "input2" => {
  const count1 = position1Count.get(shardId) || 0;
  const count2 = position2Count.get(shardId) || 0;
  return count1 >= count2 ? "input1" : "input2";
};

// Choose the better recipe variant based on rarity and position frequency
const chooseBetterRecipe = (recipe1: Recipe, recipe2: Recipe, fusionData: FusionData, positionAnalysis: { position1Count: Map<string, number>, position2Count: Map<string, number> }): Recipe => {
  const shard1A = fusionData.shards[recipe1.input1];
  const shard1B = fusionData.shards[recipe1.input2];
  const shard2A = fusionData.shards[recipe2.input1];
  const shard2B = fusionData.shards[recipe2.input2];
  
  // Get rarity indices (lower = more common)
  const getRarityIndex = (rarity?: string) => RARITY_ORDER.indexOf((rarity || "common").toLowerCase());
  
  // Strategy 1: Prefer recipe where lower rarity shard comes first
  const rarity1A = getRarityIndex(shard1A?.rarity);
  const rarity1B = getRarityIndex(shard1B?.rarity);
  const rarity2A = getRarityIndex(shard2A?.rarity);
  const rarity2B = getRarityIndex(shard2B?.rarity);
  
  if (rarity1A < rarity1B && rarity2A >= rarity2B) return recipe1;
  if (rarity2A < rarity2B && rarity1A >= rarity1B) return recipe2;
  
  // Strategy 2: Prefer recipe where shards are in their most frequent positions
  const { position1Count, position2Count } = positionAnalysis;
  
  const recipe1Score = 
    (getPreferredPosition(recipe1.input1, position1Count, position2Count) === "input1" ? 1 : 0) +
    (getPreferredPosition(recipe1.input2, position1Count, position2Count) === "input2" ? 1 : 0);
    
  const recipe2Score = 
    (getPreferredPosition(recipe2.input1, position1Count, position2Count) === "input1" ? 1 : 0) +
    (getPreferredPosition(recipe2.input2, position1Count, position2Count) === "input2" ? 1 : 0);
  
  if (recipe1Score !== recipe2Score) {
    return recipe1Score > recipe2Score ? recipe1 : recipe2;
  }
  
  // Strategy 3: Lexicographic fallback for consistency
  return recipe1.input1.localeCompare(recipe2.input1) <= 0 ? recipe1 : recipe2;
};

// Group recipes that share a common shard in the same position
const groupRecipesByCommonShard = (recipes: Recipe[]): GroupedRecipe[] => {
  const groups: GroupedRecipe[] = [];
  const processed = new Set<string>();
  
  recipes.forEach((recipe, index) => {
    if (processed.has(index.toString())) return;
    
    // Find all recipes that share input1 with this recipe
    const sameInput1 = recipes.filter((r, i) => 
      i !== index && !processed.has(i.toString()) && r.input1 === recipe.input1
    );
    
    // Find all recipes that share input2 with this recipe
    const sameInput2 = recipes.filter((r, i) => 
      i !== index && !processed.has(i.toString()) && r.input2 === recipe.input2
    );
    
    if (sameInput1.length > 0) {
      // Group by common input1
      const groupRecipes = [recipe, ...sameInput1];
      groups.push({
        recipes: groupRecipes,
        isGroup: true,
        commonShard: recipe.input1,
        commonPosition: "input1",
        fusionType: classifyFusion(recipe),
      });
      
      // Mark as processed
      processed.add(index.toString());
      sameInput1.forEach((_, i) => {
        const originalIndex = recipes.findIndex(r => r === sameInput1[i]);
        processed.add(originalIndex.toString());
      });
    } else if (sameInput2.length > 0) {
      // Group by common input2
      const groupRecipes = [recipe, ...sameInput2];
      groups.push({
        recipes: groupRecipes,
        isGroup: true,
        commonShard: recipe.input2,
        commonPosition: "input2",
        fusionType: classifyFusion(recipe),
      });
      
      // Mark as processed
      processed.add(index.toString());
      sameInput2.forEach((_, i) => {
        const originalIndex = recipes.findIndex(r => r === sameInput2[i]);
        processed.add(originalIndex.toString());
      });
    } else {
      // Single recipe, no grouping
      groups.push({
        recipes: [recipe],
        isGroup: false,
        commonShard: "",
        commonPosition: "",
        fusionType: classifyFusion(recipe),
      });
      processed.add(index.toString());
    }
  });
  
  return groups;
};

export const categorizeAndGroupRecipes = (recipes: Recipe[], fusionData: FusionData): CategorizedRecipes => {
  // Step 1: Analyze position frequencies for intelligent culling
  const positionAnalysis = analyzeShardPositions(recipes);
  
  // Step 2: Cull duplicate recipes (mirrored recipes like A+B vs B+A)
  const recipeMap = new Map<string, Recipe>();
  const duplicates = new Map<string, Recipe[]>();
  
  recipes.forEach(recipe => {
    const key = createRecipeKey(recipe.input1, recipe.input2, recipe.quantity);
    if (recipeMap.has(key)) {
      // Found duplicate, store both for comparison
      const existing = recipeMap.get(key)!;
      if (!duplicates.has(key)) {
        duplicates.set(key, [existing]);
      }
      duplicates.get(key)!.push(recipe);
    } else {
      recipeMap.set(key, recipe);
    }
  });
  
  // Step 3: For each duplicate group, choose the better recipe
  duplicates.forEach((recipeGroup, key) => {
    let bestRecipe = recipeGroup[0];
    for (let i = 1; i < recipeGroup.length; i++) {
      bestRecipe = chooseBetterRecipe(bestRecipe, recipeGroup[i], fusionData, positionAnalysis);
    }
    recipeMap.set(key, bestRecipe);
  });
  
  // Step 4: Group culled recipes by common shards
  const culledRecipes = Array.from(recipeMap.values());
  
  // Separate by fusion type first
  const specialRecipes = culledRecipes.filter(r => classifyFusion(r) === "special");
  const idRecipes = culledRecipes.filter(r => classifyFusion(r) === "id");
  const chameleonRecipes = culledRecipes.filter(r => classifyFusion(r) === "chameleon");
  
  return {
    special: groupRecipesByCommonShard(specialRecipes),
    id: groupRecipesByCommonShard(idRecipes),
    chameleon: groupRecipesByCommonShard(chameleonRecipes),
  };
};

export const filterCategorizedRecipes = (categorized: CategorizedRecipes, filterValue: string, fusionData: FusionData): CategorizedRecipes => {
  if (!filterValue.trim()) return categorized;
  const term = filterValue.toLowerCase();
  const filter = (arr: GroupedRecipe[]) =>
    arr.filter(g => g.recipes.some(r => {
      const s1 = fusionData.shards[r.input1]?.name.toLowerCase() || "";
      const s2 = fusionData.shards[r.input2]?.name.toLowerCase() || "";
      return s1.includes(term) || s2.includes(term);
    }));
  return {
    special: filter(categorized.special),
    id: filter(categorized.id),
    chameleon: filter(categorized.chameleon),
  };
};