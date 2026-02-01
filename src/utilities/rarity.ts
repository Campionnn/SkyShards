export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/**
 * Centralized rarity color mappings
 * Single source of truth for all rarity-based styling
 */
export const RARITY_COLORS = {
  common: {
    text: "text-white",
    bg: "bg-slate-500/20 border-slate-500/30",
    border: "border-slate-500/50",
  },
  uncommon: {
    text: "text-green-400",
    bg: "bg-green-500/20 border-green-500/30",
    border: "border-green-500/50",
  },
  rare: {
    text: "text-blue-400",
    bg: "bg-blue-500/20 border-blue-500/30",
    border: "border-blue-500/50",
  },
  epic: {
    text: "text-purple-400",
    bg: "bg-purple-500/20 border-purple-500/30",
    border: "border-purple-500/50",
  },
  legendary: {
    text: "text-yellow-400",
    bg: "bg-yellow-500/20 border-yellow-500/30",
    border: "border-yellow-500/50",
  },
} as const;

const DEFAULT_RARITY = "common";

export function getRarityTextColor(rarity: string): string {
  const key = rarity.toLowerCase() as Rarity;
  return RARITY_COLORS[key]?.text ?? RARITY_COLORS[DEFAULT_RARITY].text;
}

export function getRarityBgColor(rarity: string): string {
  const key = rarity.toLowerCase() as Rarity;
  return RARITY_COLORS[key]?.bg ?? RARITY_COLORS[DEFAULT_RARITY].bg;
}

export function getRarityBorderColor(rarity: string): string {
  const key = rarity.toLowerCase() as Rarity;
  return RARITY_COLORS[key]?.border ?? RARITY_COLORS[DEFAULT_RARITY].border;
}

export function getRarityClasses(rarity: string): {
  text: string;
  bg: string;
  border: string;
} {
  return {
    text: getRarityTextColor(rarity),
    bg: getRarityBgColor(rarity),
    border: getRarityBorderColor(rarity),
  };
}

export function formatRarity(rarity: string): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1).toLowerCase();
}
