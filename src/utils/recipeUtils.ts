import type { ShardWithKey } from "../types";

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
}

export interface Recipe {
  input1: string;
  input2: string;
  quantity: number;
}

const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"];

export const processInputRecipes = (selectedShard: ShardWithKey, fusionData: FusionData): OutputGroup[] => {
  const outputMap = new Map<string, { partners: Set<string>; quantities: Map<string, number> }>();

  Object.entries(fusionData.recipes).forEach(([outputShardId, recipeData]) => {
    Object.entries(recipeData).forEach(([quantityStr, recipeList]) => {
      const outputQuantity = parseInt(quantityStr, 10);
      recipeList.forEach((recipe) => {
        if (recipe.length === 2) {
          const [input1, input2] = recipe;

          // Only include recipes where selectedShard is in the first position
          if (input1 === selectedShard.key) {
            const partnerShard = input2;
            if (!outputMap.has(outputShardId)) {
              outputMap.set(outputShardId, { partners: new Set(), quantities: new Map() });
            }
            const outputData = outputMap.get(outputShardId)!;
            outputData.partners.add(partnerShard);
            outputData.quantities.set(partnerShard, outputQuantity);
          }
        }
      });
    });
  });

  const groups: OutputGroup[] = [];
  outputMap.forEach((outputData, outputShardId) => {
    const fuseAmount = fusionData.shards[outputShardId]?.fuse_amount || 2;
    groups.push({
      output: outputShardId,
      fuseAmount,
      partners: Array.from(outputData.partners).sort(),
      quantities: outputData.quantities,
    });
  });

  groups.sort((a, b) => {
    const shardA = fusionData.shards[a.output];
    const shardB = fusionData.shards[b.output];
    const rarityA = RARITY_ORDER.indexOf((shardA?.rarity || "common").toLowerCase());
    const rarityB = RARITY_ORDER.indexOf((shardB?.rarity || "common").toLowerCase());
    if (rarityA !== rarityB) return rarityA - rarityB;
    return (shardA?.name || "").localeCompare(shardB?.name || "");
  });

  return groups;
};

export const processOutputRecipes = (selectedShard: ShardWithKey, fusionData: FusionData): Recipe[] => {
  const recipes: Recipe[] = [];

  Object.entries(fusionData.recipes).forEach(([outputShardId, recipeData]) => {
    if (outputShardId === selectedShard.key) {
      Object.entries(recipeData).forEach(([quantityStr, recipeList]) => {
        const outputQuantity = parseInt(quantityStr, 10);
        recipeList.forEach((recipe) => {
          if (recipe.length === 2) {
            const [input1, input2] = recipe;
            recipes.push({ input1, input2, quantity: outputQuantity });
          }
        });
      });
    }
  });

  return recipes;
};

export const filterGroups = (groups: OutputGroup[], filterValue: string, fusionData: FusionData): OutputGroup[] => {
  if (!filterValue.trim()) return groups;

  return groups.filter((group) => {
    const outputShard = fusionData.shards[group.output];
    return (
      outputShard?.name.toLowerCase().includes(filterValue.toLowerCase()) || group.partners.some((partnerId) => fusionData.shards[partnerId]?.name.toLowerCase().includes(filterValue.toLowerCase()))
    );
  });
};

export const groupRecipesByInput = (recipes: Recipe[]): Map<string, Array<{ input2: string; quantity: number }>> => {
  const groupedRecipes = new Map<string, Array<{ input2: string; quantity: number }>>();

  recipes.forEach((recipe) => {
    if (!groupedRecipes.has(recipe.input1)) {
      groupedRecipes.set(recipe.input1, []);
    }
    groupedRecipes.get(recipe.input1)!.push({
      input2: recipe.input2,
      quantity: recipe.quantity,
    });
  });

  return groupedRecipes;
};

export const filterRecipeGroups = (
  groupedRecipes: Map<string, Array<{ input2: string; quantity: number }>>,
  filterValue: string,
  fusionData: FusionData
): Array<[string, Array<{ input2: string; quantity: number }>]> => {
  return Array.from(groupedRecipes.entries()).filter(([input1, partners]) => {
    if (!filterValue.trim()) return true;
    const input1Shard = fusionData.shards[input1];
    return input1Shard?.name.toLowerCase().includes(filterValue.toLowerCase()) || partners.some((partner) => fusionData.shards[partner.input2]?.name.toLowerCase().includes(filterValue.toLowerCase()));
  });
};
