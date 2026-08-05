export const formatTime = (decimalHours: number): string => {
  const totalSeconds = Math.round(decimalHours * 3600);

  if (totalSeconds < 60) {
    return `${totalSeconds} sec`;
  }


  console.group("Format Time");
  console.log(decimalHours);
  console.groupEnd();

  const days = Math.floor(decimalHours / 24);
  const hours = Math.floor(decimalHours) - (days * 24);
  const minutes = Math.round((decimalHours - hours - (days * 24)) * 60);



  if (days === 0) {
  if (hours === 0) {
    return `${minutes} min`;
  }
  if (minutes === 0 || isNaN(minutes)) {
    return `${hours} hr`;
  }
  return `${hours} hr ${minutes} min`;
  }
  return `${days} d ${hours} hr ${minutes} min`
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

// Function to find the longest common prefix between two strings
const findCommonPrefix = (str1: string, str2: string): string => {
  let i = 0;
  while (i < str1.length && i < str2.length && str1[i].toLowerCase() === str2[i].toLowerCase()) {
    i++;
  }
  return str1.substring(0, i);
};

const RARITY_ORDER: Record<string, number> = { C: 1, U: 2, R: 3, E: 4, L: 5 };

// A shard key is a rarity letter + base number, optionally followed by a "-N"
// duplicate-placeholder suffix (e.g. "U17", "U17-1"). The full string is always
// the canonical unique key — never strip the suffix to identify a shard. This
// only parses the key into sortable components; suffix defaults to 0.
export interface ParsedShardKey {
  rarity: string;
  base: number;
  suffix: number;
}

export const parseShardKey = (key: string): ParsedShardKey | null => {
  const match = key.match(/^([CUREL])(\d+)(?:-(\d+))?$/);
  if (!match) return null;
  const [, rarity, base, suffix] = match;
  return {
    rarity,
    base: parseInt(base, 10),
    suffix: suffix ? parseInt(suffix, 10) : 0,
  };
};

// Sort by (rarity, base number, suffix) so a "-N" shard sorts immediately after
// its base: U17 → U17-1 → U18.
export const compareShardKeys = (aKey: string, bKey: string): number => {
  const a = parseShardKey(aKey);
  const b = parseShardKey(bKey);

  if (!a || !b) {
    return aKey.localeCompare(bKey);
  }

  if (RARITY_ORDER[a.rarity] !== RARITY_ORDER[b.rarity]) {
    return RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
  }
  if (a.base !== b.base) {
    return a.base - b.base;
  }
  return a.suffix - b.suffix;
};

// Helper function to sort by shard ID (rarity letter + number [+ suffix])
export const sortByShardKey = (a: { id: string }, b: { id: string }): number =>
  compareShardKeys(a.id, b.id);

// Sorting function that sorts by ID when names share a common prefix, otherwise alphabetically
export const sortShardsByNameWithPrefixAwareness = (a: { name: string; id: string }, b: { name: string; id: string }): number => {
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
