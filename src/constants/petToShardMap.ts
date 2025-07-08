// Pet level descriptions for tooltips
export const PET_DESCRIPTIONS = {
  newtLevel: {
    title: "Newt",
    description: "Provides +2 Hunter Fortune per level towards COMMON rarity shards",
    rarity: "common",
    shardIcon: "C35", // Representative common shard
  },
  salamanderLevel: {
    title: "Salamander",
    description: "Provides +2 Hunter Fortune per level towards UNCOMMON rarity shards",
    rarity: "uncommon",
    shardIcon: "U8", // Representative uncommon shard
  },
  lizardKingLevel: {
    title: "Lizard King",
    description: "Provides +1 Hunter Fortune per level towards RARE rarity shards",
    rarity: "rare",
    shardIcon: "R8", // Representative rare shard
  },
  leviathanLevel: {
    title: "Leviathan",
    description: "Provides +1 Hunter Fortune per level towards EPIC rarity shards",
    rarity: "epic",
    shardIcon: "E5", // Representative epic shard
  },
  pythonLevel: {
    title: "Python",
    description: "Provides +2% rate bonus per level for Black Hole shards (affected by Sea Serpent multiplier)",
    rarity: "rare",
    shardIcon: "R9", // Black hole shard
  },
  kingCobraLevel: {
    title: "King Cobra",
    description: "Provides +1% fortune multiplier per level for Black Hole shards (affected by Sea Serpent multiplier)",
    rarity: "rare",
    shardIcon: "R56", // Black hole shard
  },
  seaSerpentLevel: {
    title: "Sea Serpent",
    description: "Provides +2% rate multiplier per level that enhances Python and King Cobra bonuses (affected by Tiamat multiplier)",
    rarity: "epic",
    shardIcon: "E32", // Sea-related legendary shard
  },
  tiamatLevel: {
    title: "Tiamat",
    description: "Provides +5% rate multiplier per level that enhances Sea Serpent bonuses",
    rarity: "legendary",
    shardIcon: "L6", // Legendary shard
  },
  crocodileLevel: {
    title: "Crocodile",
    description: "Provides +2% rate multiplier per level for Reptile shards (affected by Sea Serpent multiplier)",
    warning: "Warning: May slow calculations significantly",
    rarity: "rare",
    shardIcon: "R45", // Reptile-related shard
  },
} as const;
