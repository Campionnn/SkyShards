// Structured shard description format produced by SkyShards-Exporter.
// See output/desc.json for the source data.

export interface TextSegment {
  t: string;
  /** Minecraft color name ("gray", "dark_green", …) or "#rrggbb". Absent = default gray. */
  c?: string;
  bold?: boolean;
  italic?: boolean;
  underlined?: boolean;
  strikethrough?: boolean;
  obfuscated?: boolean;
}

export interface RangeSegment {
  /** [level-1 value, level-10 value]. Low may be null (underivable); order is [high, low] for stats that decrease with level. */
  range: [number | null, number];
  /** "" | "%" | "s" (open set) */
  unit: string;
  c?: string;
}

export type Segment = TextSegment | RangeSegment;

export interface ShardDescRecord {
  title: string;
  id: string;
  description: Segment[];
  /** Array of lines, each line an array of segments. */
  how_to_hunt: Segment[][];
}

export type ShardDescriptions = Record<string, ShardDescRecord>;

// Range wins over t when both are present, mirroring the exporter's reader.
export function isRangeSegment(seg: Segment): seg is RangeSegment {
  return Array.isArray((seg as RangeSegment).range) && (seg as RangeSegment).range.length >= 2;
}
