import { useState, useEffect } from "react";
import { DataService } from "../services";
import type { Shard } from "../types/types";

export const useShards = () => {
  const [shards, setShards] = useState<Shard[]>([]);
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

    loadShards().catch(console.error);
  }, []);

  return { shards, loading, error };
};
