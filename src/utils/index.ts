import { MAX_QUANTITIES } from "../constants";
import type { Shard } from "../types";

export const formatTime = (decimalHours: number): string => {
  const totalSeconds = Math.round(decimalHours * 3600); // Convert hours to seconds

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

  // Only include ID for non-direct shards (craftable shards)
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

export const convertToRangeDescription = (description: string): string => {
  // Convert "Provides +X per level" to "Provides +X to +Xx10" with colored numbers
  let result = description.replace(/\+(\d+)\s*([%]?)\s*([^/]*?)\s*per level/gi, (_, amount, percent, rest) => {
    const min = amount;
    const max = parseInt(amount) * 10;
    const restText = rest.trim();

    // Use fuchsia for Hunter Fortune (color everything), green for just the numbers on other bonuses
    if (restText.toLowerCase().includes("hunter fortune")) {
      return `<span class="text-fuchsia-400">+${min}${percent} to +${max}${percent} ${restText}</span>`;
    } else {
      return `<span class="text-green-400">+${min}${percent} to +${max}${percent}</span> ${restText}`;
    }
  });

  // Color rarity words with their respective colors
  result = result
    .replace(/\bCOMMON\b/gi, '<span class="text-white">COMMON</span>')
    .replace(/\bUNCOMMON\b/gi, '<span class="text-green-400">UNCOMMON</span>')
    .replace(/\bRARE\b/gi, '<span class="text-blue-400">RARE</span>')
    .replace(/\bEPIC\b/gi, '<span class="text-purple-400">EPIC</span>')
    .replace(/\bLEGENDARY\b/gi, '<span class="text-yellow-400">LEGENDARY</span>');

  // Color pet names with legendary rarity color (since they're all legendary)
  result = result
    .replace(/\bSea Serpent\b/gi, '<span class="text-purple-400">Sea Serpent</span>')
    .replace(/\bTiamat\b/gi, '<span class="text-yellow-400">Tiamat</span>')
    .replace(/\bPython\b/gi, '<span class="text-blue-400">Python</span>')
    .replace(/\bKing Cobra\b/gi, '<span class="text-blue-400">King Cobra</span>');

  return result;
};

export { isValidShardName } from "./isValidShardName";
