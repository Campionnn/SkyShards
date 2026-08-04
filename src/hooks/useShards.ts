import { DataService } from "../services";
import type { Shard } from "../types/types";
import { useAsyncData } from "./useAsyncData";

const EMPTY: Shard[] = [];

export const useShards = () => {
  const { data: shards, loading, error } = useAsyncData(() => DataService.getInstance().loadShards(), EMPTY, "Failed to load shards");
  return { shards, loading, error };
};
