import { useEffect } from "react";
import { DataService } from "../services";
import { preloadShardIcons } from "../utilities";

/**
 * Kicks off shard-icon cache warming once per session. Ids come from the shard data
 * the app already loads and caches, so the icon list cannot drift from the shards
 * that actually exist.
 */
export const useShardIconPreload = () => {
  useEffect(() => {
    DataService.getInstance()
      .loadShards()
      .then((shards) => preloadShardIcons(shards.map((shard) => shard.id)))
      .catch((error) => console.error("Failed to preload shard icons:", error));
  }, []);
};
