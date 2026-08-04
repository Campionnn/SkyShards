import { shardIconUrl } from "./shardIcon";

/**
 * Warms the browser cache with every shard icon so they don't pop in a beat late the
 * first time a fusion tree or the shard browser renders them.
 *
 * There are 300+ icons totalling a few MB, so this deliberately stays off the
 * critical path: it waits for the browser to go idle after first paint, then fetches
 * a few at a time. Decoded images are not retained — the HTTP cache entry is the
 * point, and holding 300 bitmaps alive would cost far more memory than it saves.
 */

/** Enough to keep the connection busy, few enough to not starve real requests. */
const CONCURRENCY = 6;

let started = false;

const whenIdle = (run: () => void) => {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(run, { timeout: 3000 });
  } else {
    setTimeout(run, 1000);
  }
};

/** Don't pull megabytes uninvited on metered or very slow connections. */
const shouldSkip = (): boolean => {
  const connection = (navigator as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!connection) return false;
  return connection.saveData === true || connection.effectiveType === "slow-2g" || connection.effectiveType === "2g";
};

export function preloadShardIcons(shardIds: string[]): void {
  if (started || shardIds.length === 0 || shouldSkip()) return;
  started = true;

  whenIdle(() => {
    const queue = [...shardIds];

    const next = (): void => {
      const shardId = queue.shift();
      if (shardId === undefined) return;

      const img = new Image();
      // Advance on failure too — one missing icon must not stall the rest.
      img.onload = img.onerror = next;
      img.src = shardIconUrl(shardId);
    };

    for (let i = 0; i < CONCURRENCY; i++) next();
  });
}
