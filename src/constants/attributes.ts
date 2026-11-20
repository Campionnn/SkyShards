/** Shards needed to max an attribute (level 10), by lowercase rarity. */
export const MAX_QUANTITIES = {
  common: 96,
  uncommon: 64,
  rare: 48,
  epic: 32,
  legendary: 24,
} as const;

/** `MAX_QUANTITIES` for any rarity string (case-insensitive); unknown rarities use the common cap. */
export const maxQuantityForRarity = (rarity: string): number => MAX_QUANTITIES[rarity.toLowerCase() as keyof typeof MAX_QUANTITIES] ?? MAX_QUANTITIES.common;

/** Shards consumed by each attribute level-up (index 0 = level 1 … index 9 = level 10). Each row sums to `MAX_QUANTITIES`. */
const SHARDS_PER_LEVEL: Record<keyof typeof MAX_QUANTITIES, readonly number[]> = {
  common: [1, 3, 5, 6, 7, 8, 10, 14, 18, 24],
  uncommon: [1, 2, 3, 4, 5, 6, 7, 8, 12, 16],
  rare: [1, 2, 3, 3, 4, 4, 5, 6, 8, 12],
  epic: [1, 1, 2, 2, 3, 3, 4, 4, 5, 7],
  legendary: [1, 1, 1, 2, 2, 2, 3, 3, 4, 5],
};

/** Attribute level (0-10) reached after fusing `fusedCount` shards of the given rarity; unknown rarity -> 0. */
export function fusedCountToTierLevel(fusedCount: number, rarity: string): number {
  const perLevel = SHARDS_PER_LEVEL[rarity.toLowerCase() as keyof typeof SHARDS_PER_LEVEL];
  if (!perLevel) return 0;

  let cumulative = 0;
  for (let level = 1; level <= perLevel.length; level++) {
    cumulative += perLevel[level - 1];
    if (fusedCount < cumulative) return level - 1;
  }
  return perLevel.length;
}
