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

export interface Recipe {
  input1: string;
  input2: string;
  quantity: number;
  output: string;
}

export interface GroupedRecipe {
  recipes: Recipe[];
  isGroup: boolean;
  commonShard: string;
  commonPosition: "input1" | "input2" | "";
  fusionType: "special" | "id" | "chameleon";
  // matrix grouping (both sides variable)
  matrix?: boolean;
  variantLeft?: string[]; // set A
  variantRight?: string[]; // set B
  output?: string; // common output for matrix
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
          callback(outputShardId, recipe, outputQuantity);
        }
      });
    });
  });
};

export const processOutputRecipes = (selectedShard: ShardWithKey, fusionData: FusionData): Recipe[] => {
  const recipes: Recipe[] = [];
  iterateRecipes(fusionData, (outputShardId, recipe, outputQuantity) => {
    if (outputShardId === selectedShard.key) {
      const [input1, input2] = recipe;
      recipes.push({ input1, input2, quantity: outputQuantity, output: outputShardId });
    }
  });
  return recipes;
};

const classifyFusion = (recipe: Recipe): "special" | "id" | "chameleon" => {
  const isChameleon = recipe.input1 === "L4" || recipe.input2 === "L4";
  if (isChameleon) return "chameleon";
  if (recipe.quantity === 2) return "special";
  return "id";
};

const createRecipeKey = (input1: string, input2: string, quantity: number): string => {
  const sortedInputs = [input1, input2].sort();
  return `${sortedInputs[0]}-${sortedInputs[1]}-${quantity}`;
};

const analyzeShardPositions = (recipes: Recipe[]) => {
  const position1Count = new Map<string, number>();
  const position2Count = new Map<string, number>();
  
  recipes.forEach(recipe => {
    position1Count.set(recipe.input1, (position1Count.get(recipe.input1) || 0) + 1);
    position2Count.set(recipe.input2, (position2Count.get(recipe.input2) || 0) + 1);
  });
  
  return { position1Count, position2Count };
};

const getPreferredPosition = (shardId: string, position1Count: Map<string, number>, position2Count: Map<string, number>): "input1" | "input2" => {
  const count1 = position1Count.get(shardId) || 0;
  const count2 = position2Count.get(shardId) || 0;
  return count1 >= count2 ? "input1" : "input2";
};

const chooseBetterRecipe = (recipe1: Recipe, recipe2: Recipe, fusionData: FusionData, positionAnalysis: { position1Count: Map<string, number>, position2Count: Map<string, number> }): Recipe => {
  const shard1A = fusionData.shards[recipe1.input1];
  const shard1B = fusionData.shards[recipe1.input2];
  const shard2A = fusionData.shards[recipe2.input1];
  const shard2B = fusionData.shards[recipe2.input2];

  const getRarityIndex = (rarity?: string) => RARITY_ORDER.indexOf((rarity || "common").toLowerCase());

  const rarity1A = getRarityIndex(shard1A?.rarity);
  const rarity1B = getRarityIndex(shard1B?.rarity);
  const rarity2A = getRarityIndex(shard2A?.rarity);
  const rarity2B = getRarityIndex(shard2B?.rarity);
  
  if (rarity1A < rarity1B && rarity2A >= rarity2B) return recipe1;
  if (rarity2A < rarity2B && rarity1A >= rarity1B) return recipe2;

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

  return recipe1.input1.localeCompare(recipe2.input1) <= 0 ? recipe1 : recipe2;
};

const groupRecipesByCommonShard = (recipes: Recipe[]): GroupedRecipe[] => {
  const groups: GroupedRecipe[] = [];
  const processed = new Set<number>();
  recipes.forEach((recipe, index) => {
    if (processed.has(index)) return;
    const sameInput1 = recipes.filter((r, i) => i !== index && !processed.has(i) && r.input1 === recipe.input1 && r.output === recipe.output);
    const sameInput2 = recipes.filter((r, i) => i !== index && !processed.has(i) && r.input2 === recipe.input2 && r.output === recipe.output);
    if (sameInput1.length > 0) {
      const groupRecipes = [recipe, ...sameInput1];
      groups.push({
        recipes: groupRecipes,
        isGroup: true,
        commonShard: recipe.input1,
        commonPosition: "input1",
        fusionType: classifyFusion(recipe),
      });
      processed.add(index);
      sameInput1.forEach(r => processed.add(recipes.indexOf(r)));
    } else if (sameInput2.length > 0) {
      const groupRecipes = [recipe, ...sameInput2];
      groups.push({
        recipes: groupRecipes,
        isGroup: true,
        commonShard: recipe.input2,
        commonPosition: "input2",
        fusionType: classifyFusion(recipe),
      });
      processed.add(index);
      sameInput2.forEach(r => processed.add(recipes.indexOf(r)));
    } else {
      groups.push({
        recipes: [recipe],
        isGroup: false,
        commonShard: "",
        commonPosition: "",
        fusionType: classifyFusion(recipe),
      });
      processed.add(index);
    }
  });
  return groups;
};

export const categorizeAndGroupRecipes = (recipes: Recipe[], fusionData: FusionData): CategorizedRecipes => {
  const positionAnalysis = analyzeShardPositions(recipes);
  const recipeMap = new Map<string, Recipe>();
  const duplicates = new Map<string, Recipe[]>();
  recipes.forEach(recipe => {
    const key = createRecipeKey(recipe.input1, recipe.input2, recipe.quantity) + `-${recipe.output}`;
    if (recipeMap.has(key)) {
      const existing = recipeMap.get(key)!;
      if (!duplicates.has(key)) duplicates.set(key, [existing]);
      duplicates.get(key)!.push(recipe);
    } else {
      recipeMap.set(key, recipe);
    }
  });
  duplicates.forEach((group, key) => {
    let best = group[0];
    for (let i = 1; i < group.length; i++) best = chooseBetterRecipe(best, group[i], fusionData, positionAnalysis);
    recipeMap.set(key, best);
  });
  const culled = Array.from(recipeMap.values());
  const byType: Record<string, Recipe[]> = { special: [], id: [], chameleon: [] };
  culled.forEach(r => byType[classifyFusion(r)].push(r));

  const build = (list: Recipe[]): GroupedRecipe[] => {
    // Partition by output only (ignore quantity to allow flexible grouping)
    const partitions = new Map<string, Recipe[]>();
    list.forEach(r => {
      const k = r.output;
      (partitions.get(k) || partitions.set(k, []).get(k)!).push(r);
    });
    const result: GroupedRecipe[] = [];

    partitions.forEach(recList => {
      const used = new Set<number>();

      // Build partner map: each shard -> set of its partners
      const partnerMap = new Map<string, Set<string>>();
      recList.forEach(r => {
        if (!partnerMap.has(r.input1)) partnerMap.set(r.input1, new Set());
        if (!partnerMap.has(r.input2)) partnerMap.set(r.input2, new Set());
        partnerMap.get(r.input1)!.add(r.input2);
        partnerMap.get(r.input2)!.add(r.input1);
      });

      // Group shards by identical partner sets
      const signatureMap = new Map<string, string[]>(); // signature -> shards sharing it
      partnerMap.forEach((partners, shard) => {
        const arr = Array.from(partners).sort();
        if (arr.length < 2) return; // need at least 2 partners to be worth grouping
        const sig = arr.join("|");
        (signatureMap.get(sig) || signatureMap.set(sig, []).get(sig)!).push(shard);
      });

      // Create matrix groups from signatures with multiple shards
      signatureMap.forEach((shards, sig) => {
        if (shards.length < 2) return; // need at least 2 shards sharing the same partners
        const partners = sig.split("|");
        if (partners.length < 2) return; // need at least 2 partners

        const variantLeft = shards.sort();
        const variantRight = partners.sort();

        // Avoid duplicate groups by consistent ordering
        if (variantLeft[0] > variantRight[0]) return;

        // Collect all recipes that connect these variant sets
        const groupRecipes: Recipe[] = [];
        recList.forEach((r, idx) => {
          const aInLeft = variantLeft.includes(r.input1) && variantRight.includes(r.input2);
          const bInLeft = variantLeft.includes(r.input2) && variantRight.includes(r.input1);
          if (aInLeft || bInLeft) {
            groupRecipes.push(r);
            used.add(idx);
          }
        });

        if (groupRecipes.length >= 2) {
          result.push({
            recipes: groupRecipes,
            isGroup: true,
            commonShard: "",
            commonPosition: "",
            fusionType: classifyFusion(groupRecipes[0]),
            matrix: true,
            variantLeft,
            variantRight,
            output: groupRecipes[0].output,
          });
        }
      });

      // Handle remaining ungrouped recipes
      const remaining = recList.filter((_, idx) => !used.has(idx));
      if (remaining.length) {
        // Group by quantity for traditional grouping
        const byQty = new Map<number, Recipe[]>();
        remaining.forEach(r => {
          (byQty.get(r.quantity) || byQty.set(r.quantity, []).get(r.quantity)!).push(r);
        });
        byQty.forEach(sub => {
          result.push(...groupRecipesByCommonShard(sub));
        });
      }
    });

    return result;
  };

  return {
    special: build(byType.special),
    id: build(byType.id),
    chameleon: build(byType.chameleon),
  };
};

export const filterCategorizedRecipes = (categorized: CategorizedRecipes, filterValue: string, fusionData: FusionData): CategorizedRecipes => {
  if (!filterValue.trim()) return categorized;
  const term = filterValue.toLowerCase();
  const filter = (arr: GroupedRecipe[]) =>
    arr.filter(g => g.recipes.some(r => {
      const s1 = fusionData.shards[r.input1]?.name.toLowerCase() || "";
      const s2 = fusionData.shards[r.input2]?.name.toLowerCase() || "";
      const outId = (r as Recipe).output as string | undefined;
      const outName = outId ? (fusionData.shards[outId]?.name.toLowerCase() || "") : "";
      return s1.includes(term) || s2.includes(term) || outName.includes(term);
    }));
  return {
    special: filter(categorized.special),
    id: filter(categorized.id),
    chameleon: filter(categorized.chameleon),
  };
};