import type { CalculationFormData } from "../schemas";
import type { CalculationParams } from "../types/types";

export const NO_FORTUNE_SHARDS = ["C19", "U4", "U16", "U28", "R24", "R25", "R27", "R60", "R64", "L4", "L15", "L30", "L33", "L48", "L51"];

/**
 * The nine shards whose attribute level the player sets by hand. Drives both the
 * form's level dropdowns and the Hypixel profile import.
 *
 * `rarity` feeds `fusedCountToTierLevel` on import; `ironmanOnly` marks the eight
 * lines the form hides on a normal profile, leaving Crocodile as the only level
 * shown there. Order is the display order of the dropdown grid.
 */
export const LEVELED_SHARDS = [
  { key: "newtLevel", label: "Newt", shardId: "C35", rarity: "common", ironmanOnly: true },
  { key: "salamanderLevel", label: "Salamander", shardId: "U8", rarity: "uncommon", ironmanOnly: true },
  { key: "lizardKingLevel", label: "Lizard King", shardId: "R8", rarity: "rare", ironmanOnly: true },
  { key: "leviathanLevel", label: "Leviathan", shardId: "E5", rarity: "epic", ironmanOnly: true },
  { key: "pythonLevel", label: "Python", shardId: "R9", rarity: "rare", ironmanOnly: true },
  { key: "kingCobraLevel", label: "King Cobra", shardId: "R54", rarity: "rare", ironmanOnly: true },
  { key: "seaSerpentLevel", label: "Sea Serpent", shardId: "E32", rarity: "epic", ironmanOnly: true },
  { key: "tiamatLevel", label: "Tiamat", shardId: "L6", rarity: "legendary", ironmanOnly: true },
  { key: "crocodileLevel", label: "Crocodile", shardId: "R45", rarity: "rare", ironmanOnly: false },
] as const satisfies ReadonlyArray<{
  // `keyof CalculationFormData` is the load-bearing part: a typo in a key, or a field
  // renamed in the schema, fails the build here instead of silently writing a level
  // nobody reads.
  key: keyof CalculationFormData;
  label: string;
  shardId: string;
  rarity: string;
  ironmanOnly: boolean;
}>;

/** The nine form fields `LEVELED_SHARDS` writes to. */
export type ShardLevelKey = (typeof LEVELED_SHARDS)[number]["key"];

/**
 * Neutral calculation params: no fortune/pet bonuses, in-game rate (time) cost, no
 * Kuudra. Used where a structural, player-independent cost ordering is needed — e.g.
 * the fusion-graph view's cost-based edge pruning (`rateAsCoinValue: false` so cost =
 * 1 / acquisition rate, i.e. acquisition difficulty).
 */
export const DEFAULT_CALCULATION_PARAMS: CalculationParams = {
  customRates: {},
  hunterFortune: 0,
  excludeChameleon: false,
  frogBonus: false,
  newtLevel: 0,
  salamanderLevel: 0,
  lizardKingLevel: 0,
  leviathanLevel: 0,
  pythonLevel: 0,
  kingCobraLevel: 0,
  seaSerpentLevel: 0,
  tiamatLevel: 0,
  crocodileLevel: 0,
  kuudraTier: "none",
  moneyPerHour: null,
  customKuudraTime: false,
  kuudraTimeSeconds: null,
  noWoodenBait: false,
  rateAsCoinValue: false,
  craftPenalty: 0,
};

import type { ShardDescriptions } from "../types/shardDescription";
import DESC_JSON from "../desc.json";
export const SHARD_DESCRIPTIONS = DESC_JSON as unknown as ShardDescriptions;

export const WOODEN_BAIT_SHARDS = ["R29", "L23", "R59", "R23", "R49"];

export const BLACK_HOLE_SHARD: { [key: string]: boolean } = {
  L47: false,
  L27: false,
  L26: false,
  L17: false,
  E33: true,
  E29: false,
  E20: false,
  E18: true,
  E17: false,
  E14: false,
  R56: false,
  R49: false,
  R42: false,
  R39: true,
  R38: false,
  R36: true,
  R31: true,
  R21: false,
  R18: false,
  R6: true,
  U38: true,
  U36: true,
  U33: true,
  U32: true,
  U30: false,
  U29: false,
  U27: false,
  U18: true,
  U15: true,
  U12: true,
  C36: true,
  C33: true,
  C30: true,
  C27: false,
  C21: true,
  C20: false,
  C15: true,
  C14: false,
  C12: true,
  C9: true,
  C8: false,
};

export const MAX_QUANTITIES = {
  common: 96,
  uncommon: 64,
  rare: 48,
  epic: 32,
  legendary: 24,
} as const;

export const KUUDRA_TIERS = [
  { value: "none", label: "No Kuudra" },
  { value: "t1", label: "T1" },
  { value: "t2", label: "T2" },
  { value: "t3", label: "T3" },
  { value: "t4", label: "T4" },
  { value: "t5", label: "T5" },
] as const;

export const SHARD_LEVELS = Array.from({ length: 11 }, (_, i) => i).reverse();

// Mapping of attribute level to required shard count by rarity
export const ATTRIBUTE_TIER_TO_SHARD_COUNT: Record<string, Record<number, number>> = {
  common: {
    1: 1,
    2: 3,
    3: 5,
    4: 6,
    5: 7,
    6: 8,
    7: 10,
    8: 14,
    9: 18,
    10: 24,
  },
  uncommon: {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 12,
    10: 16,
  },
  rare: {
    1: 1,
    2: 2,
    3: 3,
    4: 3,
    5: 4,
    6: 4,
    7: 5,
    8: 6,
    9: 8,
    10: 12,
  },
  epic: {
    1: 1,
    2: 1,
    3: 2,
    4: 2,
    5: 3,
    6: 3,
    7: 4,
    8: 4,
    9: 5,
    10: 7,
  },
  legendary: {
    1: 1,
    2: 1,
    3: 1,
    4: 2,
    5: 2,
    6: 2,
    7: 3,
    8: 3,
    9: 4,
    10: 5,
  },
};

export function fusedCountToTierLevel(fusedCount: number, rarity: string): number {
  const tierMap = ATTRIBUTE_TIER_TO_SHARD_COUNT[rarity.toLowerCase()];
  if (!tierMap) return 0;
  
  // Calculate cumulative counts for each tier
  let cumulative = 0;
  for (let tier = 1; tier <= 10; tier++) {
    cumulative += tierMap[tier] ?? 0;
    if (fusedCount < cumulative) {
      return tier - 1;
    } else if (fusedCount === cumulative) {
      return tier;
    }
  }

  return 10;
}
