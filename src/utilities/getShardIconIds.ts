const shardIconModules = import.meta.glob('/public/shardIcons/*.png', {
  eager: true,
  query: '?url',
  import: 'default'
});

export function getShardIconIds(): string[] {
  return Object.keys(shardIconModules)
    .map(path => {
      // Extract filename without extension
      const match = path.match(/\/([^/]+)\.png$/);
      return match ? match[1] : null;
    })
    .filter((id): id is string => id !== null)
    .sort(); // Sort for consistent ordering
}

// Export a cached version for performance
export const SHARD_ICON_IDS = getShardIconIds();
