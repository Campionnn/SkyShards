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

// A stat name segment in the game's own text is always rendered as "<icon><name>", e.g.
// " Attack Speed" in yellow or "☯ Combat Wisdom" in dark_aqua. "☯" isn't in the PUA
// icon font (GLYPH_MAP has no entry for it), but StatGlyph already falls back to plain text
// for unmapped chars, so it's included here as a valid leading icon too.
const STAT_GLYPH_PATTERN = new RegExp(`^(${GLYPH_REGEX.source.slice(1, -1)}|☯)\\s*([A-Z][A-Za-z ]+)$`);

let statGlyphIndex: Map<string, { glyph: string; color: string }> | null = null;

function buildStatGlyphIndex(): Map<string, { glyph: string; color: string }> {
  const index = new Map<string, { glyph: string; color: string }>();
  for (const record of Object.values(SHARD_DESCRIPTIONS)) {
    for (const segs of [record.description, ...record.how_to_hunt]) {
      for (const seg of segs) {
        if (isRangeSegment(seg) || typeof seg.t !== "string") continue;
        // Some segments carry trailing whitespace before the next segment (e.g. " Defense ").
        const match = STAT_GLYPH_PATTERN.exec(seg.t.trim());
        if (match && !index.has(match[2])) {
          index.set(match[2], { glyph: match[1], color: seg.c ?? "gray" });
        }
      }
    }
  }
  return index;
}

/** Icon glyph + Minecraft color the game actually renders next to a stat name, read straight
 * out of the shard descriptions rather than hand-maintained. Undefined if no shard's
 * description happens to mention that exact stat name. */
export function getStatGlyphInfo(name: string): { glyph: string; color: string } | undefined {
  if (!statGlyphIndex) statGlyphIndex = buildStatGlyphIndex();
  return statGlyphIndex.get(name);
}
