import { MAX_QUANTITIES } from "../constants";
import type { Shard } from "../types/types";

export const formatTime = (decimalHours: number): string => {
  const totalSeconds = Math.round(decimalHours * 3600);

  if (totalSeconds < 60) {
    return `${totalSeconds} sec`;
  }

  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);

  if (hours === 0) {
    return `${minutes} min`;
  }
  if (minutes === 0 || isNaN(minutes)) {
    return `${hours} hr`;
  }
  return `${hours} hr ${minutes} min`;
};

export const formatMoney = (amount: number): string => {
    if (amount < 1000) {
        return `${amount.toFixed(2)}`;
    }
    if (amount < 1_000_000) {
        return `${(amount / 1000).toFixed(2)}K`;
    }
    if (amount < 1_000_000_000) {
        return `${(amount / 1_000_000).toFixed(2)}M`;
    }
    return `${(amount / 1_000_000_000).toFixed(2)}B`;
}

export const getMaxQuantityForRarity = (rarity: string): number => {
  return MAX_QUANTITIES[rarity as keyof typeof MAX_QUANTITIES] || 1;
};

export const formatNumber = (num: number): string => {
  if (num === 0) return "0";
  if (num < 0.01) return num.toFixed(4);
  if (num < 1) return num.toFixed(2);
  return num.toFixed(2).replace(/\.00$/, "");
};

export const getRarityColor = (rarity: string): string => {
  const colors = {
    common: "text-white",
    uncommon: "text-green-400",
    rare: "text-blue-400",
    epic: "text-purple-400",
    legendary: "text-yellow-400",
  };
  return colors[rarity as keyof typeof colors] || "text-white";
};

export const getRarityBorderColor = (rarity: string): string => {
  const colors = {
    common: "border-gray-400/20",
    uncommon: "border-green-400/20",
    rare: "border-blue-400/20",
    epic: "border-purple-400/20",
    legendary: "border-yellow-400/20",
  };
  return colors[rarity as keyof typeof colors] || "border-gray-400/20";
};

export const getShardDetails = (shard: Shard, isDirect: boolean = false): string => {
  const details = [
    `Name: ${shard.name}`,
    `Family: ${shard.family}`,
    `Type: ${shard.type}`,
    `Rarity: ${shard.rarity}`,
    `Fuse Amount: ${shard.fuse_amount}`,
    `Internal ID: ${shard.internal_id}`,
    `Rate: ${shard.rate}`,
  ];

  if (!isDirect) {
    details.unshift(`ID: ${shard.id}`);
  }

  return details.join("\n");
};

export const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Stat icon configurations for color mapping
interface StatIconConfig {
  color: string;
  keywords: readonly string[];
  specific?: Record<string, string>;
}

const STAT_ICON_CONFIG: Record<string, StatIconConfig> = {
  "❤": { color: "text-red-400", keywords: ["Health"] },
  "❁": { color: "text-red-400", keywords: ["Strength", "Damage"] },
  "☠": { color: "text-red-400", keywords: ["Crit Damage"] },
  "♨": { color: "text-red-400", keywords: ["Vitality"], specific: { "Heat Resistance": "text-orange-400" } },
  "❈": { color: "text-green-400", keywords: ["Defense"] },
  "❣": { color: "text-green-400", keywords: ["Health Regen"] },
  "∮": { color: "text-green-600", keywords: ["Sweep"] },
  "✎": { color: "text-blue-400", keywords: ["Intelligence"] },
  α: { color: "text-blue-400", keywords: ["Sea Creature Chance"] },
  "⚓": { color: "text-blue-400", keywords: ["Double Hook Chance"] },
  "⚶": { color: "text-blue-400", keywords: ["Respiration"] },
  "☂": { color: "text-sky-400", keywords: ["Fishing Speed"] },
  "❍": { color: "text-cyan-400", keywords: ["Pressure Resistance"] },
  "☘": {
    color: "text-fuchsia-400",
    keywords: ["Hunter Fortune"],
    specific: {
      "Mining Fortune": "text-yellow-400",
      "Farming Fortune": "text-yellow-400",
      "Foraging Fortune": "text-yellow-400",
      "Fig Fortune": "text-yellow-400",
      "Mangrove Fortune": "text-yellow-400",
      "Block Fortune": "text-yellow-400",
    },
  },
  "⚔": { color: "text-orange-400", keywords: ["Bonus Attack Speed", "Attack Speed"] },
  "✯": { color: "text-yellow-400", keywords: ["Magic Find"] },
  "♔": { color: "text-yellow-400", keywords: ["Trophy Fish Chance"] },
  "⸕": { color: "text-yellow-400", keywords: ["Mining Speed"] },
  "♣": { color: "text-pink-400", keywords: ["Pet Luck"] },
  "☯": {
    color: "text-purple-400",
    keywords: ["Foraging Wisdom", "Fishing Wisdom", "Hunting Wisdom", "Mining Wisdom", "Farming Wisdom", "Enchanting Wisdom", "Taming Wisdom", "Combat Wisdom", "Wisdom"],
  },
  "✦": { color: "text-white", keywords: ["Speed"] },
  "❂": { color: "text-white", keywords: ["True Defense"] },
  "✧": { color: "text-white", keywords: ["Pristine"] },
};

const RARITY_COLORS = {
  common: "text-white",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
} as const;

export const formatShardDescription = (description: string): string => {
  let result = description;

  // Apply stat icon coloring
  for (const [icon, config] of Object.entries(STAT_ICON_CONFIG)) {
    // Handle specific keyword overrides first
    if (config.specific) {
      for (const [keyword, color] of Object.entries(config.specific)) {
        const regex = new RegExp(`(${icon})\\s*(${keyword})`, "gi");
        result = result.replace(regex, `<span class="${color}">$1 $2</span>`);
      }
    }

    // Handle general keywords
    if (config.keywords.length > 0) {
      const keywordPattern = config.keywords.join("|");
      const regex = new RegExp(`(${icon})\\s*(${keywordPattern})`, "gi");
      result = result.replace(regex, `<span class="${config.color}">$1 $2</span>`);
    }

    // Handle standalone icons
    const negativePattern = config.keywords.length > 0 ? `(?!\\s*(${config.keywords.join("|")}))` : "";
    const specificPattern = config.specific ? `(?!\\s*(${Object.keys(config.specific).join("|")}))` : "";
    const standaloneRegex = new RegExp(`(${icon})${negativePattern}${specificPattern}`, "gi");
    result = result.replace(standaloneRegex, `<span class="${config.color}">$1</span>`);
  }

  return applyRangeConversion(result);
};

const applyRangeConversion = (text: string): string => {
  // Convert single values to ranges with context-aware coloring
  let result = text.replace(/\+(\d+(?:\.\d+)?)([%s]?)/g, (match, number, unit, offset, string) => {
    const num = parseFloat(number);
    const max = num * 10;
    const context = string.substring(Math.max(0, offset - 50), offset + match.length + 50);

    const colorClass = determineStatColor(context);
    return `<span class="${colorClass}">+${number}${unit} to +${max}${unit}</span>`;
  });

  // Apply rarity coloring
  for (const [rarity, color] of Object.entries(RARITY_COLORS)) {
    result = result.replace(new RegExp(`\\b${rarity}\\b`, "gi"), `<span class="${color}">${rarity.toUpperCase()}</span>`);
  }

  return result;
};

const determineStatColor = (context: string): string => {
  const lowerContext = context.toLowerCase();

  // Check for specific stat patterns
  for (const [icon, config] of Object.entries(STAT_ICON_CONFIG)) {
    if (lowerContext.includes(icon)) {
      if (config.specific) {
        for (const [keyword, color] of Object.entries(config.specific)) {
          if (lowerContext.includes(keyword.toLowerCase())) {
            return color;
          }
        }
      }
      return config.color;
    }
  }

  return "text-green-400"; // default
};

export const convertToRangeDescription = (description: string): string => {
  let result = description.replace(/\+(\d+)\s*([%]?)\s*([^/]*?)\s*per level/gi, (_, amount, percent, rest) => {
    const min = amount;
    const max = parseInt(amount) * 10;
    const restText = rest.trim();

    if (restText.toLowerCase().includes("hunter fortune")) {
      return `<span class="text-fuchsia-400">+${min}${percent} to +${max}${percent} ${restText}</span>`;
    }
    return `<span class="text-green-400">+${min}${percent} to +${max}${percent}</span> ${restText}`;
  });

  // Apply rarity and pet name coloring
  result = result
    .replace(/\bCOMMON\b/gi, '<span class="text-white">COMMON</span>')
    .replace(/\bUNCOMMON\b/gi, '<span class="text-green-400">UNCOMMON</span>')
    .replace(/\bRARE\b/gi, '<span class="text-blue-400">RARE</span>')
    .replace(/\bEPIC\b/gi, '<span class="text-purple-400">EPIC</span>')
    .replace(/\bLEGENDARY\b/gi, '<span class="text-yellow-400">LEGENDARY</span>')
    .replace(/\bSea Serpent\b/gi, '<span class="text-purple-400">Sea Serpent</span>')
    .replace(/\bTiamat\b/gi, '<span class="text-yellow-400">Tiamat</span>')
    .replace(/\bPython\b/gi, '<span class="text-blue-400">Python</span>')
    .replace(/\bKing Cobra\b/gi, '<span class="text-blue-400">King Cobra</span>');

  return result;
};

export { isValidShardName } from "./isValidShardName";
