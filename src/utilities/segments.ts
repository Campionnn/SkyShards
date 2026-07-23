import type { Segment } from "../types/shardDescription";
import { isRangeSegment } from "../types/shardDescription";
import { GLYPH_REGEX } from "../data/glyphMap";
import { SHARD_DESCRIPTIONS } from "../constants";

const GLYPH_REGEX_ALL = new RegExp(GLYPH_REGEX.source, "g");

export function formatRangeValue(value: number | null): string {
  return value === null ? "?" : String(value);
}

/** Flatten segments to plain text (glyphs stripped, ranges as "2→20%") for search. */
export function flattenSegments(segments: Segment[]): string {
  return segments
    .map((seg) => {
      if (isRangeSegment(seg)) {
        const [low, high] = seg.range;
        return `${formatRangeValue(low)}→${formatRangeValue(high)}${seg.unit}`;
      }
      if (typeof seg.t === "string") return seg.t.replace(GLYPH_REGEX_ALL, "");
      return "";
    })
    .join("");
}

const searchTextCache = new Map<string, string>();

/** Lowercase searchable text (description + how-to-hunt) for a shard key. */
export function getShardSearchText(key: string): string {
  let text = searchTextCache.get(key);
  if (text === undefined) {
    const record = SHARD_DESCRIPTIONS[key];
    text = record
      ? [flattenSegments(record.description), ...record.how_to_hunt.map(flattenSegments)].join("\n").toLowerCase()
      : "";
    searchTextCache.set(key, text);
  }
  return text;
}
