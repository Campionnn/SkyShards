import type { ShardWithKey } from "../types/types";
import { SHARD_DESCRIPTIONS } from "../constants";

export interface ShardFilterConfig {
  /** Search in shard.name */
  name?: boolean;
  /** Search in shard.key (ID) */
  key?: boolean;
  /** Search in shard.family */
  family?: boolean;
  /** Search in shard.type */
  type?: boolean;
  /** Search in SHARD_DESCRIPTIONS title */
  title?: boolean;
  /** Search in SHARD_DESCRIPTIONS description */
  description?: boolean;
}

export const DEFAULT_FILTER_CONFIG: ShardFilterConfig = {
  name: true,
  key: true,
  family: true,
  type: true,
  title: true,
  description: true,
};

export const NAME_ONLY_FILTER_CONFIG: ShardFilterConfig = {
  name: true,
  key: false,
  family: false,
  type: false,
  title: false,
  description: false,
};

export const BASIC_FILTER_CONFIG: ShardFilterConfig = {
  name: true,
  key: true,
  family: true,
  type: true,
  title: false,
  description: false,
};

export function matchesSearchQuery(
  shard: ShardWithKey,
  query: string,
  config: ShardFilterConfig = DEFAULT_FILTER_CONFIG
): boolean {
  if (!query.trim()) return true;

  const search = query.toLowerCase();

  // Check name
  if (config.name && shard.name.toLowerCase().includes(search)) {
    return true;
  }

  // Check key (ID)
  if (config.key && shard.key.toLowerCase().includes(search)) {
    return true;
  }

  // Check family
  if (config.family && shard.family.toLowerCase().includes(search)) {
    return true;
  }

  // Check type
  if (config.type && shard.type.toLowerCase().includes(search)) {
    return true;
  }

  // Check descriptions
  if (config.title || config.description) {
    const shardDesc = SHARD_DESCRIPTIONS[shard.key as keyof typeof SHARD_DESCRIPTIONS];

    if (config.title && shardDesc?.title?.toLowerCase().includes(search)) {
      return true;
    }

    if (config.description && shardDesc?.description?.toLowerCase().includes(search)) {
      return true;
    }
  }

  return false;
}

export interface ShardFilterOptions {
  query?: string;
  rarity?: string;
  type?: "all" | "direct" | "fuse";
  searchConfig?: ShardFilterConfig;
}

export function filterShards<T extends ShardWithKey>(
  shards: T[],
  options: ShardFilterOptions = {}
): T[] {
  const {
    query = "",
    rarity = "all",
    type = "all",
    searchConfig = DEFAULT_FILTER_CONFIG,
  } = options;

  return shards.filter((shard) => {
    const matchesSearch = matchesSearchQuery(shard, query, searchConfig);

    const matchesRarity = rarity === "all" || shard.rarity.toLowerCase() === rarity.toLowerCase();

    const matchesType =
      type === "all" ||
      (type === "direct" && "isDirect" in shard && (shard as { isDirect: boolean }).isDirect) ||
      (type === "fuse" && "isDirect" in shard && !(shard as { isDirect: boolean }).isDirect);

    return matchesSearch && matchesRarity && matchesType;
  });
}

