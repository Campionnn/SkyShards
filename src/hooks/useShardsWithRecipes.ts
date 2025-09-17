import { useState, useEffect } from "react";
import { DataService } from "../services";
import type { ShardWithDirectInfo } from "../types/types";

export const useShardsWithRecipes = () => {
  const [shards, setShards] = useState<ShardWithDirectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const dataService = DataService.getInstance();
        const [shardsData, defaultRates] = await Promise.all([dataService.loadShards(), dataService.loadDefaultRates()]);

        // Add isDirect property to each shard
        // A shard is "direct" if it can be obtained directly (has a rate > 0)
        // regardless of whether it also has fusion recipes
        const shardsWithDirectInfo = shardsData.map((shard) => ({
          ...shard,
          rate: defaultRates[shard.key] || 0,
          isDirect: (defaultRates[shard.key] || 0) > 0,
        }));

        setShards(shardsWithDirectInfo);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load shards and recipes");
      } finally {
        setLoading(false);
      }
    };

    loadData().catch(console.error);
  }, []);

  return { shards, loading, error };
};
