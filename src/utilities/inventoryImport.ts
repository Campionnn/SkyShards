import type { ShardWithKey } from "../types/types";

/**
 * Raw inventory data format from Hypixel SkyBlock profile export
 */
export interface ImportedInventory {
  hunting_box?: Record<string, number>;
  attribute_menu?: Record<string, number>;
}

/**
 * Result of parsing inventory JSON
 */
export interface ParsedInventoryResult {
  success: boolean;
  shardQuantities: Array<{ shard: ShardWithKey; quantity: number }>;
  selectedShardKeys: string[];
  errors: string[];
  unknownKeys: string[];
  totalShards: number;
  uniqueTypes: number;
}

/**
 * Validates a shard key format (e.g., C17, U24, R4, E15, L51)
 */
export function validateShardKey(key: string): boolean {
  return /^[CUREL]\d+$/.test(key);
}

/**
 * Comparator for sorting shard keys by rarity order, then number
 */
function compareShardKeys(a: string, b: string): number {
  const rarityOrder: Record<string, number> = { C: 1, U: 2, R: 3, E: 4, L: 5 };
  const aMatch = a.match(/^([CUREL])(\d+)$/);
  const bMatch = b.match(/^([CUREL])(\d+)$/);

  if (!aMatch || !bMatch) return 0;

  const [, aRarity, aNum] = aMatch;
  const [, bRarity, bNum] = bMatch;

  if (rarityOrder[aRarity] !== rarityOrder[bRarity]) {
    return rarityOrder[aRarity] - rarityOrder[bRarity];
  }

  return parseInt(aNum) - parseInt(bNum);
}

/**
 * Merges multiple inventory boxes, summing quantities for duplicate keys
 */
export function mergeInventories(
  boxes: Array<Record<string, number> | undefined>
): Record<string, number> {
  const merged: Record<string, number> = {};

  for (const box of boxes) {
    if (!box) continue;
    for (const [key, quantity] of Object.entries(box)) {
      if (typeof quantity === "number" && quantity > 0) {
        merged[key] = (merged[key] || 0) + quantity;
      }
    }
  }

  return merged;
}

/**
 * Parses inventory JSON and maps to ShardWithKey objects
 */
export function parseInventoryJson(
  jsonString: string,
  allShards: ShardWithKey[]
): ParsedInventoryResult {
  const errors: string[] = [];
  const unknownKeys: string[] = [];

  // Parse JSON
  let parsed: ImportedInventory;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return {
      success: false,
      shardQuantities: [],
      selectedShardKeys: [],
      errors: ["Invalid JSON format. Please check your input."],
      unknownKeys: [],
      totalShards: 0,
      uniqueTypes: 0,
    };
  }

  // Validate structure
  if (typeof parsed !== "object" || parsed === null) {
    return {
      success: false,
      shardQuantities: [],
      selectedShardKeys: [],
      errors: ["Invalid data structure. Expected an object."],
      unknownKeys: [],
      totalShards: 0,
      uniqueTypes: 0,
    };
  }

  // Check if we have at least one valid box
  const hasHuntingBox =
    parsed.hunting_box && typeof parsed.hunting_box === "object";
  const hasAttributeMenu =
    parsed.attribute_menu && typeof parsed.attribute_menu === "object";

  if (!hasHuntingBox && !hasAttributeMenu) {
    return {
      success: false,
      shardQuantities: [],
      selectedShardKeys: [],
      errors: [
        'No valid inventory data found. Expected "hunting_box" or "attribute_menu" properties.',
      ],
      unknownKeys: [],
      totalShards: 0,
      uniqueTypes: 0,
    };
  }

  // Merge boxes
  const merged = mergeInventories([parsed.hunting_box, parsed.attribute_menu]);

  // Create shard lookup map
  const shardMap = new Map<string, ShardWithKey>();
  for (const shard of allShards) {
    shardMap.set(shard.key, shard);
  }

  // Map to ShardWithKey objects
  const shardQuantities: Array<{ shard: ShardWithKey; quantity: number }> = [];
  const selectedShardKeys: string[] = [];
  let totalShards = 0;

  for (const [key, quantity] of Object.entries(merged)) {
    // Validate key format
    if (!validateShardKey(key)) {
      errors.push(`Invalid shard key format: "${key}"`);
      continue;
    }

    // Look up shard
    const shard = shardMap.get(key);
    if (!shard) {
      unknownKeys.push(key);
      continue;
    }

    // Skip zero or negative quantities
    if (quantity <= 0) {
      continue;
    }

    shardQuantities.push({ shard, quantity });
    selectedShardKeys.push(key);
    totalShards += quantity;
  }

  // Sort by shard key (rarity order, then number)
  shardQuantities.sort((a, b) => compareShardKeys(a.shard.key, b.shard.key));
  selectedShardKeys.sort(compareShardKeys);

  return {
    success: shardQuantities.length > 0,
    shardQuantities,
    selectedShardKeys,
    errors,
    unknownKeys,
    totalShards,
    uniqueTypes: shardQuantities.length,
  };
}
