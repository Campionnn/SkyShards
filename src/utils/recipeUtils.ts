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
  positions: Map<string, "first" | "second">;
}

export interface Recipe {
  input1: string;
  input2: string;
  quantity: number;
}

const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"];

export const processInputRecipes = (selectedShard: ShardWithKey, fusionData: FusionData): OutputGroup[] => {
  const outputMap = new Map<string, { partners: Set<string>; quantities: Map<string, number>; positions: Map<string, "first" | "second"> }>();
  const seenRecipes = new Set<string>(); // Track recipes we've already processed

  Object.entries(fusionData.recipes).forEach(([outputShardId, recipeData]) => {
    Object.entries(recipeData).forEach(([quantityStr, recipeList]) => {
      const outputQuantity = parseInt(quantityStr, 10);
      recipeList.forEach((recipe) => {
        if (recipe.length === 2) {
          const [input1, input2] = recipe;
          let partnerShard: string | null = null;
          let position: "first" | "second" | null = null;

          if (input1 === selectedShard.key) {
            partnerShard = input2;
            position = "first";
          } else if (input2 === selectedShard.key) {
            partnerShard = input1;
            position = "second";
          }

          if (partnerShard && position) {
            // Create a unique recipe identifier for deduplication
            // Sort the inputs to ensure consistent ordering for comparison
            const sortedInputs = [selectedShard.key, partnerShard].sort();
            const recipeKey = `${sortedInputs[0]}-${sortedInputs[1]}-${outputShardId}`;

            // Skip if we've already processed this recipe combination
            if (seenRecipes.has(recipeKey)) {
              return;
            }
            seenRecipes.add(recipeKey);

            // Create a unique key for each output-position combination
            const outputKey = `${outputShardId}-${position}`;

            if (!outputMap.has(outputKey)) {
              outputMap.set(outputKey, { partners: new Set(), quantities: new Map(), positions: new Map() });
            }
            const outputData = outputMap.get(outputKey)!;
            outputData.partners.add(partnerShard);
            outputData.quantities.set(partnerShard, outputQuantity);
            outputData.positions.set(partnerShard, position);
          }
        }
      });
    });
  });

  const groups: OutputGroup[] = [];
  outputMap.forEach((outputData, outputKey) => {
    const outputShardId = outputKey.split("-")[0];
    const fuseAmount = fusionData.shards[outputShardId]?.fuse_amount || 2;
    groups.push({
      output: outputShardId,
      fuseAmount,
      partners: Array.from(outputData.partners).sort(),
      quantities: outputData.quantities,
      positions: outputData.positions,
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
