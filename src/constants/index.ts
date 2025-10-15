export const NO_FORTUNE_SHARDS = ["C19", "U4", "U16", "U28", "R24", "R25", "R27", "R60", "R64", "E12", "L4", "L15", "L30", "L33"];

import SHARD_DESCRIPTIONS from "../desc.json";
export { SHARD_DESCRIPTIONS };

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
