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

export const formatLargeNumber = (num: number): string => {
  const absNum = Math.abs(num);
  let formatted: string;
  if (absNum >= 1000000000) {
    formatted = (absNum / 1000000000).toFixed(2) + "B";
  } else if (absNum >= 1000000) {
    formatted = (absNum / 1000000).toFixed(2) + "M";
  } else if (absNum >= 1000) {
    formatted = (absNum / 1000).toFixed(2) + "K";
  } else {
    formatted = absNum.toFixed(2);
  }
  formatted = formatted.replace(/\.00(?=[KMB]|$)/, "");
  return num < 0 ? "-" + formatted : formatted;
};

export function debounce<TArgs extends unknown[], TReturn>(func: (...args: TArgs) => TReturn, wait: number): (...args: TArgs) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return (...args: TArgs) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

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
  "α": { color: "text-blue-400", keywords: ["Sea Creature Chance"] },
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
  "❃": { color: "text-fuchsia-400", keywords: ["Tracking"] },
  "✿": { color: "text-green-600", keywords: ["Mythological"] },
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

// Function to find the longest common prefix between two strings
const findCommonPrefix = (str1: string, str2: string): string => {
  let i = 0;
  while (i < str1.length && i < str2.length && str1[i].toLowerCase() === str2[i].toLowerCase()) {
    i++;
  }
  return str1.substring(0, i);
};

// Helper function to sort by shard ID (rarity letter + number)
const sortByShardKey = (a: { key: string }, b: { key: string }): number => {
  const aMatch = a.key.match(/^([CUREL])(\d+)$/);
  const bMatch = b.key.match(/^([CUREL])(\d+)$/);

  if (!aMatch || !bMatch) {
    return a.key.localeCompare(b.key);
  }

  const [, aRarity, aNum] = aMatch;
  const [, bRarity, bNum] = bMatch;

  const rarityOrder: Record<string, number> = { C: 1, U: 2, R: 3, E: 4, L: 5 };

  if (rarityOrder[aRarity] !== rarityOrder[bRarity]) {
    return rarityOrder[aRarity] - rarityOrder[bRarity];
  }

  return parseInt(aNum) - parseInt(bNum);
};

// Sorting function that sorts by ID when names share a common prefix, otherwise alphabetically
export const sortShardsByNameWithPrefixAwareness = (a: { name: string; key: string }, b: { name: string; key: string }): number => {
  const aName = a.name.toLowerCase();
  const bName = b.name.toLowerCase();
  
  // Find the common prefix
  const commonPrefix = findCommonPrefix(aName, bName);
  
  // If they share a common prefix of at least 3 characters, sort by ID
  if (commonPrefix.length >= 3) {
    return sortByShardKey(a, b);
  }
  
  // Otherwise, sort alphabetically by name
  return aName.localeCompare(bName);
};

export { isValidShardName } from "./isValidShardName";
