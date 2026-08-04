import { DataService } from "../services";
import type { ShardWithDirectInfo } from "../types/types";
import { useAsyncData } from "./useAsyncData";

const EMPTY: ShardWithDirectInfo[] = [];

/** A shard is "direct" when it has a non-zero base acquisition rate, i.e. it can be farmed. */
const loadShardsWithDirectInfo = async (): Promise<ShardWithDirectInfo[]> => {
  const dataService = DataService.getInstance();
  const [shards, defaultRates] = await Promise.all([dataService.loadShards(), dataService.loadDefaultRates()]);

  return shards.map((shard) => ({
    ...shard,
    rate: defaultRates[shard.id] || 0,
    isDirect: (defaultRates[shard.id] || 0) > 0,
  }));
};

export const useShardsWithRecipes = (): { shards: ShardWithDirectInfo[]; loading: boolean; error: string | null } => {
  const { data: shards, loading, error } = useAsyncData(loadShardsWithDirectInfo, EMPTY, "Failed to load shards and recipes");
  return { shards, loading, error };
};
