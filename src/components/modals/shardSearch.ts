import { DEFAULT_FILTER_CONFIG, filterShards, sortByShardKey, sortShardsByNameWithPrefixAwareness } from "../../utilities";
import type { Shard } from "../../types/types";

export const RARITY_OPTIONS = [
  { value: "all", label: "All Rarities", color: "text-violet-400" },
  { value: "common", label: "Common", color: "text-white" },
  { value: "uncommon", label: "Uncommon", color: "text-green-400" },
  { value: "rare", label: "Rare", color: "text-blue-400" },
  { value: "epic", label: "Epic", color: "text-purple-400" },
  { value: "legendary", label: "Legendary", color: "text-yellow-400" },
];

/** Border, text and progress-bar classes per rarity, for shard cards. */
export const RARITY_CARD_STYLES: Record<string, { border: string; text: string; bar: string }> = {
  common: { border: "border-slate-500/50", text: "text-slate-300", bar: "bg-slate-400" },
  uncommon: { border: "border-green-500/50", text: "text-green-300", bar: "bg-green-400" },
  rare: { border: "border-blue-500/50", text: "text-blue-300", bar: "bg-blue-400" },
  epic: { border: "border-purple-500/50", text: "text-purple-300", bar: "bg-purple-400" },
  legendary: { border: "border-amber-500/50", text: "text-amber-300", bar: "bg-amber-400" },
};

export const rarityCardStyles = (rarity: string) => RARITY_CARD_STYLES[rarity] ?? RARITY_CARD_STYLES.legendary;

/** Filter by query and rarity; name matches that start with the query come first. */
export const searchShards = <T extends Shard>(shards: T[], query: string, rarity: string): T[] => {
  const filtered = filterShards(shards, { query, rarity, searchConfig: DEFAULT_FILTER_CONFIG });
  if (!query.trim()) return filtered.sort(sortByShardKey);

  const lowerQuery = query.toLowerCase();
  return filtered.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(lowerQuery);
    const bStarts = b.name.toLowerCase().startsWith(lowerQuery);
    if (aStarts !== bStarts) return aStarts ? -1 : 1;
    return sortShardsByNameWithPrefixAwareness(a, b);
  });
};

/** The md-size search field used by the browse and multi-select modals. */
export const MODAL_SEARCH_INPUT =
  "w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50";
