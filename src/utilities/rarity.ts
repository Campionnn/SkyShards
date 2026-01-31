export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

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
