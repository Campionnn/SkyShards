import type { CalculationFormData } from "../schemas";
import type { CalculationParams } from "../types/types";

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

/** Level dropdown options, highest first: [10, 9, …, 0]. */
export const SHARD_LEVELS = Array.from({ length: 11 }, (_, i) => 10 - i);

export const KUUDRA_TIERS = [
  { value: "none", label: "No Kuudra" },
  { value: "t1", label: "T1" },
  { value: "t2", label: "T2" },
  { value: "t3", label: "T3" },
  { value: "t4", label: "T4" },
  { value: "t5", label: "T5" },
] as const;

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
