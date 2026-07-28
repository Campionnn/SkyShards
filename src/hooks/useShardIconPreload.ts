import { useEffect } from "react";
import { DataService } from "../services";
import { preloadShardIcons } from "../utilities";

/**
 * Kicks off shard-icon cache warming once per session.
 *
 * The ids come from the shard data the app already loads (and caches), rather than
 * from a build-time glob — the previous `import.meta.glob('/shardIcons/*.png')`
 * resolved against the project root instead of `public/`, so it always matched
 * nothing and the preloader silently did nothing.
 */
export const useShardIconPreload = () => {
  useEffect(() => {
    DataService.getInstance()
      .loadShards()
      .then((shards) => preloadShardIcons(shards.map((shard) => shard.id)))
      .catch((error) => console.error("Failed to preload shard icons:", error));
  }, []);
};
