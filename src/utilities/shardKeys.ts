const RARITY_ORDER: Record<string, number> = { C: 1, U: 2, R: 3, E: 4, L: 5 };

// A shard key is a rarity letter + base number, optionally followed by a "-N"
// duplicate-placeholder suffix (e.g. "U17", "U17-1"). The full string is always
// the canonical unique key — never strip the suffix to identify a shard. This
// only parses the key into sortable components; suffix defaults to 0.
interface ParsedShardKey {
  rarity: string;
  base: number;
  suffix: number;
}

const parseShardKey = (key: string): ParsedShardKey | null => {
  const match = key.match(/^([CUREL])(\d+)(?:-(\d+))?$/);
  if (!match) return null;
  const [, rarity, base, suffix] = match;
  return {
    rarity,
    base: parseInt(base, 10),
    suffix: suffix ? parseInt(suffix, 10) : 0,
  };
};

/** Sort by (rarity, base number, suffix) so a "-N" shard sorts immediately after its base: U17 → U17-1 → U18. */
export const compareShardKeys = (aKey: string, bKey: string): number => {
  const a = parseShardKey(aKey);
  const b = parseShardKey(bKey);

  if (!a || !b) return aKey.localeCompare(bKey);
  if (a.rarity !== b.rarity) return RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
  if (a.base !== b.base) return a.base - b.base;
  return a.suffix - b.suffix;
};

/** Comparator over anything with a shard `id`. */
export const sortByShardKey = (a: { id: string }, b: { id: string }): number => compareShardKeys(a.id, b.id);

/** Length of the case-insensitive common prefix of two strings. */
const commonPrefixLength = (a: string, b: string): number => {
  let i = 0;
  while (i < a.length && i < b.length && a[i].toLowerCase() === b[i].toLowerCase()) i++;
  return i;
};

/**
 * Alphabetical by name, except names sharing a 3+ character prefix (a shard family,
 * e.g. "Lizard King" / "Lizard") are ordered by shard id instead.
 */
export const sortShardsByNameWithPrefixAwareness = (a: { name: string; id: string }, b: { name: string; id: string }): number => {
  const aName = a.name.toLowerCase();
  const bName = b.name.toLowerCase();
  if (commonPrefixLength(aName, bName) >= 3) return sortByShardKey(a, b);
  return aName.localeCompare(bName);
};
