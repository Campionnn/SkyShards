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
}

export interface Recipe {
  input1: string;
  input2: string;
  quantity: number;
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

const sortByRarity = (a: string, b: string, fusionData: FusionData) => {
  const shardA = fusionData.shards[a];
  const shardB = fusionData.shards[b];
  const rarityA = RARITY_ORDER.indexOf((shardA?.rarity || "common").toLowerCase());
  const rarityB = RARITY_ORDER.indexOf((shardB?.rarity || "common").toLowerCase());
  if (rarityA !== rarityB) return rarityA - rarityB;
  return (shardA?.name || "").localeCompare(shardB?.name || "");
};

export const processInputRecipes = (selectedShard: ShardWithKey, fusionData: FusionData): OutputGroup[] => {
  const outputMap = new Map<string, { partners: Set<string>; quantities: Map<string, number> }>();

  iterateRecipes(fusionData, (outputShardId, recipe, outputQuantity) => {
    const [input1, input2] = recipe;
    const partnerShard = input1 === selectedShard.key ? input2 : input2 === selectedShard.key ? input1 : null;

    if (partnerShard) {
      if (!outputMap.has(outputShardId)) {
        outputMap.set(outputShardId, { partners: new Set(), quantities: new Map() });
      }
      const outputData = outputMap.get(outputShardId)!;
      outputData.partners.add(partnerShard);
      outputData.quantities.set(partnerShard, outputQuantity);
    }
  });

  const groups: OutputGroup[] = Array.from(outputMap.entries()).map(([outputShardId, outputData]) => ({
    output: outputShardId,
    fuseAmount: fusionData.shards[outputShardId]?.fuse_amount || 2,
    partners: Array.from(outputData.partners).sort(),
    quantities: outputData.quantities,
  }));

  groups.sort((a, b) => sortByRarity(a.output, b.output, fusionData));
  return groups;
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
  if (!filterValue.trim()) return Array.from(groupedRecipes.entries());

  const searchTerm = filterValue.toLowerCase();
  return Array.from(groupedRecipes.entries()).filter(([input1, partners]) => {
    const input1Shard = fusionData.shards[input1];
    return input1Shard?.name.toLowerCase().includes(searchTerm) || partners.some((partner) => fusionData.shards[partner.input2]?.name.toLowerCase().includes(searchTerm));
  });
};
