import type { ShardDescriptions } from "../types/shardDescription";
import DESC_JSON from "../desc.json";

/** Exporter-generated titles, descriptions and how-to-hunt text, keyed by shard id. */
export const SHARD_DESCRIPTIONS = DESC_JSON as unknown as ShardDescriptions;

/** Shards whose acquisition rate ignores Hunter Fortune. */
export const NO_FORTUNE_SHARDS: readonly string[] = ["C19", "U4", "U16", "U28", "R24", "R25", "R27", "R60", "R64", "L4", "L15", "L30", "L33", "L48", "L51"];

/** Shards caught with wooden bait; excluded when the "no wooden bait" option is on. */
export const WOODEN_BAIT_SHARDS: readonly string[] = ["R29", "L23", "R59", "R23", "R49"];

/**
 * Black-hole shards. Every listed shard gets the King Cobra fortune bonus; those
 * mapped to `true` also get the Python rate bonus.
 */
export const BLACK_HOLE_SHARD: Readonly<Record<string, boolean>> = {
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
