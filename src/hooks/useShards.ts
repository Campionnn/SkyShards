import { useState, useEffect } from "react";
import { DataService } from "../services/dataService";
import type { ShardWithKey } from "../types/types";

export const useShards = () => {
  const [shards, setShards] = useState<ShardWithKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadShards = async () => {
      try {
        setLoading(true);
        const dataService = DataService.getInstance();
        const shardsData = await dataService.loadShards();
        setShards(shardsData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load shards");
      } finally {
        setLoading(false);
      }
    };

    loadShards();
  }, []);

  return { shards, loading, error };
};
