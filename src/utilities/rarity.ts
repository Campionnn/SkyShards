// Rarity color utilities for crops and mutations

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/**
 * Get the Tailwind text color class for a rarity level
 * @param rarity - The rarity level
 * @returns Tailwind CSS class string
 */
export function getRarityTextColor(rarity: string): string {
  switch (rarity.toLowerCase()) {
    case "common":
      return "text-white";
    case "uncommon":
      return "text-green-400";
    case "rare":
      return "text-blue-400";
    case "epic":
      return "text-purple-400";
    case "legendary":
      return "text-yellow-400";
    default:
      return "text-white";
  }
}

/**
 * Get the Tailwind background + border color classes for a rarity level
 * @param rarity - The rarity level
 * @returns Tailwind CSS class string (combined bg and border)
 */
export function getRarityBgColor(rarity: string): string {
  switch (rarity.toLowerCase()) {
    case "common":
      return "bg-slate-500/20 border-slate-500/30";
    case "uncommon":
      return "bg-green-500/20 border-green-500/30";
    case "rare":
      return "bg-blue-500/20 border-blue-500/30";
    case "epic":
      return "bg-purple-500/20 border-purple-500/30";
    case "legendary":
      return "bg-yellow-500/20 border-yellow-500/30";
    default:
      return "bg-slate-500/20 border-slate-500/30";
  }
}

/**
 * Get the Tailwind border color class for a rarity level
 * @param rarity - The rarity level
 * @returns Tailwind CSS class string
 */
export function getRarityBorderColor(rarity: string): string {
  switch (rarity.toLowerCase()) {
    case "common":
      return "border-slate-500/50";
    case "uncommon":
      return "border-green-500/50";
    case "rare":
      return "border-blue-500/50";
    case "epic":
      return "border-purple-500/50";
    case "legendary":
      return "border-yellow-500/50";
    default:
      return "border-slate-500/50";
  }
}

/**
 * Get all rarity-related classes combined (text, background, border)
 * Useful for badges or tags
 * @param rarity - The rarity level
 * @returns Object with text, bg, and border classes
 */
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

/**
 * Format rarity name for display (capitalize first letter)
 * @param rarity - The rarity level
 * @returns Formatted string
 */
export function formatRarity(rarity: string): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1).toLowerCase();
}
