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

export const formatShardDescription = (description: string): string => {
  let result = description;

  // Color specific stat icons and text first
  result = result
    // Health (red) - both full name and just icon
    .replace(/(❤)\s*(Health)/gi, '<span class="text-red-400">$1 $2</span>')
    .replace(/(❤)(?!\s*Health)/gi, '<span class="text-red-400">$1</span>')
    // Intelligence (blue)
    .replace(/(✎)\s*(Intelligence)/gi, '<span class="text-blue-400">$1 $2</span>')
    .replace(/(✎)(?!\s*Intelligence)/gi, '<span class="text-blue-400">$1</span>')
    // Strength and Damage (red)
    .replace(/(❁)\s*(Strength|Damage)/gi, '<span class="text-red-400">$1 $2</span>')
    .replace(/(❁)(?!\s*(Strength|Damage))/gi, '<span class="text-red-400">$1</span>')
    // Defense (green)
    .replace(/(❈)\s*(Defense)/gi, '<span class="text-green-400">$1 $2</span>')
    .replace(/(❈)(?!\s*Defense)/gi, '<span class="text-green-400">$1</span>')
    // Hunter Fortune (fuchsia)
    .replace(/(☘)\s*(Hunter Fortune)/gi, '<span class="text-fuchsia-400">$1 $2</span>')
    // Mining/Farming/Foraging/Fig/Mangrove/Block Fortune (gold)
    .replace(/(☘)\s*(Mining Fortune|Farming Fortune|Foraging Fortune|Fig Fortune|Mangrove Fortune|Block Fortune)/gi, '<span class="text-yellow-400">$1 $2</span>')
    // General Fortune (fuchsia as fallback)
    .replace(/(☘)\s*(Fortune)/gi, '<span class="text-fuchsia-400">$1 $2</span>')
    .replace(/(☘)(?!\s*(Hunter Fortune|Mining Fortune|Farming Fortune|Foraging Fortune|Fig Fortune|Mangrove Fortune|Block Fortune|Fortune))/gi, '<span class="text-fuchsia-400">$1</span>')
    // Speed (white)
    .replace(/(✦)\s*(Speed)/gi, '<span class="text-white">$1 $2</span>')
    .replace(/(✦)(?!\s*Speed)/gi, '<span class="text-white">$1</span>')
    // Attack Speed (orange)
    .replace(/(⚔)\s*(Bonus Attack Speed|Attack Speed)/gi, '<span class="text-orange-400">$1 $2</span>')
    .replace(/(⚔)(?!\s*(Bonus Attack Speed|Attack Speed))/gi, '<span class="text-orange-400">$1</span>')
    // Magic Find (yellow)
    .replace(/(✯)\s*(Magic Find)/gi, '<span class="text-yellow-400">$1 $2</span>')
    .replace(/(✯)(?!\s*Magic Find)/gi, '<span class="text-yellow-400">$1</span>')
    // Crit Damage (red)
    .replace(/(☠)\s*(Crit Damage)/gi, '<span class="text-red-400">$1 $2</span>')
    .replace(/(☠)(?!\s*Crit Damage)/gi, '<span class="text-red-400">$1</span>')
    // True Defense (white)
    .replace(/(❂)\s*(True Defense)/gi, '<span class="text-white">$1 $2</span>')
    .replace(/(❂)(?!\s*True Defense)/gi, '<span class="text-white">$1</span>')
    // Mining Speed (gold)
    .replace(/(⸕)\s*(Mining Speed)/gi, '<span class="text-yellow-400">$1 $2</span>')
    .replace(/(⸕)(?!\s*Mining Speed)/gi, '<span class="text-yellow-400">$1</span>')
    // Fishing Speed (sky blue)
    .replace(/(☂)\s*(Fishing Speed)/gi, '<span class="text-sky-400">$1 $2</span>')
    .replace(/(☂)(?!\s*Fishing Speed)/gi, '<span class="text-sky-400">$1</span>')
    // Sweep (dark green)
    .replace(/(∮)\s*(Sweep)/gi, '<span class="text-green-600">$1 $2</span>')
    .replace(/(∮)(?!\s*Sweep)/gi, '<span class="text-green-600">$1</span>')
    // Sea Creature Chance (blue)
    .replace(/(α)\s*(Sea Creature Chance)/gi, '<span class="text-blue-400">$1 $2</span>')
    .replace(/(α)(?!\s*Sea Creature Chance)/gi, '<span class="text-blue-400">$1</span>')
    // Pet Luck (pink)
    .replace(/(♣)\s*(Pet Luck)/gi, '<span class="text-pink-400">$1 $2</span>')
    .replace(/(♣)(?!\s*Pet Luck)/gi, '<span class="text-pink-400">$1</span>')
    // Trophy Fish Chance (yellow)
    .replace(/(♔)\s*(Trophy Fish Chance)/gi, '<span class="text-yellow-400">$1 $2</span>')
    .replace(/(♔)(?!\s*Trophy Fish Chance)/gi, '<span class="text-yellow-400">$1</span>')
    // Health Regen (green)
    .replace(/(❣)\s*(Health Regen)/gi, '<span class="text-green-400">$1 $2</span>')
    .replace(/(❣)(?!\s*Health Regen)/gi, '<span class="text-green-400">$1</span>')
    // Vitality (red)
    .replace(/(♨)\s*(Vitality)/gi, '<span class="text-red-400">$1 $2</span>')
    // Heat Resistance (orange)
    .replace(/(♨)\s*(Heat Resistance)/gi, '<span class="text-orange-400">$1 $2</span>')
    .replace(/(♨)(?!\s*(Vitality|Heat Resistance))/gi, '<span class="text-red-400">$1</span>')
    // Wisdom types (purple)
    .replace(/(☯)\s*(Foraging Wisdom|Fishing Wisdom|Hunting Wisdom|Mining Wisdom|Farming Wisdom|Enchanting Wisdom|Taming Wisdom|Combat Wisdom|Wisdom)/gi, '<span class="text-purple-400">$1 $2</span>')
    .replace(/(☯)(?!\s*(Foraging Wisdom|Fishing Wisdom|Hunting Wisdom|Mining Wisdom|Farming Wisdom|Enchanting Wisdom|Taming Wisdom|Combat Wisdom|Wisdom))/gi, '<span class="text-purple-400">$1</span>')
    // Double Hook Chance (blue)
    .replace(/(⚓)\s*(Double Hook Chance)/gi, '<span class="text-blue-400">$1 $2</span>')
    .replace(/(⚓)(?!\s*Double Hook Chance)/gi, '<span class="text-blue-400">$1</span>')
    // Pressure Resistance (cyan)
    .replace(/(❍)\s*(Pressure Resistance)/gi, '<span class="text-cyan-400">$1 $2</span>')
    .replace(/(❍)(?!\s*Pressure Resistance)/gi, '<span class="text-cyan-400">$1</span>')
    // Respiration (blue)
    .replace(/(⚶)\s*(Respiration)/gi, '<span class="text-blue-400">$1 $2</span>')
    .replace(/(⚶)(?!\s*Respiration)/gi, '<span class="text-blue-400">$1</span>')
    // Pristine (white)
    .replace(/(✧)\s*(Pristine)/gi, '<span class="text-white">$1 $2</span>')
    .replace(/(✧)(?!\s*Pristine)/gi, '<span class="text-white">$1</span>');

  // Convert single values to ranges with context-aware coloring
  result = result.replace(/\+(\d+(?:\.\d+)?)([%s]?)/g, (match, number, unit, offset, string) => {
    const num = parseFloat(number);
    const max = num * 10;

    // Get the surrounding context to determine stat type
    const beforeMatch = string.substring(Math.max(0, offset - 50), offset);
    const afterMatch = string.substring(offset + match.length, offset + match.length + 50);
    const context = beforeMatch + afterMatch;

    // Determine color based on stat type in context
    let colorClass = "text-green-400"; // default

    if (
      context.includes("❤") ||
      context.includes("Health") ||
      context.includes("❁") ||
      context.includes("Strength") ||
      context.includes("Damage") ||
      context.includes("☠") ||
      context.includes("Crit Damage") ||
      context.includes("Vitality")
    ) {
      colorClass = "text-red-400";
    } else if (context.includes("♨") || context.includes("Heat Resistance")) {
      colorClass = "text-orange-400";
    } else if (
      context.includes("✎") ||
      context.includes("Intelligence") ||
      context.includes("α") ||
      context.includes("Sea Creature") ||
      context.includes("⚓") ||
      context.includes("Double Hook") ||
      context.includes("⚶") ||
      context.includes("Respiration")
    ) {
      colorClass = "text-blue-400";
    } else if (context.includes("☂") || context.includes("Fishing Speed")) {
      colorClass = "text-sky-400";
    } else if (context.includes("☘") && context.includes("Hunter Fortune")) {
      colorClass = "text-fuchsia-400";
    } else if (
      context.includes("☘") &&
      (context.includes("Mining Fortune") ||
        context.includes("Farming Fortune") ||
        context.includes("Foraging Fortune") ||
        context.includes("Fig Fortune") ||
        context.includes("Mangrove Fortune") ||
        context.includes("Block Fortune") ||
        context.includes("Fortune"))
    ) {
      colorClass = "text-yellow-400";
    } else if (context.includes("✯") || context.includes("Magic Find") || context.includes("♔") || context.includes("Trophy Fish")) {
      colorClass = "text-yellow-400";
    } else if (context.includes("⸕") || context.includes("Mining Speed")) {
      colorClass = "text-yellow-400";
    } else if (context.includes("⚔") || context.includes("Attack Speed")) {
      colorClass = "text-orange-400";
    } else if (context.includes("❂") || context.includes("True Defense")) {
      colorClass = "text-white";
    } else if (context.includes("☯") || context.includes("Wisdom")) {
      colorClass = "text-purple-400";
    } else if (context.includes("✦") || context.includes("Speed")) {
      colorClass = "text-white";
    } else if (context.includes("❍") || context.includes("Pressure")) {
      colorClass = "text-cyan-400";
    } else if (context.includes("∮") || context.includes("Sweep")) {
      colorClass = "text-green-600";
    } else if (context.includes("♣") || context.includes("Pet Luck")) {
      colorClass = "text-pink-400";
    } else if (context.includes("❈") || context.includes("Defense") || context.includes("❣") || context.includes("Health Regen")) {
      colorClass = "text-green-400";
    } else if (context.includes("✧") || context.includes("Pristine")) {
      colorClass = "text-white";
    }

    return `<span class="${colorClass}">+${number}${unit} to +${max}${unit}</span>`;
  });

  // Color rarity words
  result = result
    .replace(/\bCOMMON\b/gi, '<span class="text-white">COMMON</span>')
    .replace(/\bUNCOMMON\b/gi, '<span class="text-green-400">UNCOMMON</span>')
    .replace(/\bRARE\b/gi, '<span class="text-blue-400">RARE</span>')
    .replace(/\bEPIC\b/gi, '<span class="text-purple-400">EPIC</span>')
    .replace(/\bLEGENDARY\b/gi, '<span class="text-yellow-400">LEGENDARY</span>');

  return result;
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
