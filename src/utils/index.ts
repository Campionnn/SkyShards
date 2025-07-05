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
