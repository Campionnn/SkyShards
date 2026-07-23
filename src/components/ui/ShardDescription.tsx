import React from "react";
import type { Segment, ShardDescRecord, TextSegment } from "../../types/shardDescription";
import { isRangeSegment } from "../../types/shardDescription";
import { resolveMinecraftColor } from "../../utilities/minecraftColors";
import { formatRangeValue } from "../../utilities/segments";
import { GLYPH_MAP, GLYPH_REGEX } from "../../data/glyphMap";
import { StatGlyph } from "./StatGlyph";

function textStyle(seg: TextSegment): React.CSSProperties {
  const style: React.CSSProperties = { color: resolveMinecraftColor(seg.c) };
  if (seg.bold) style.fontWeight = 600;
  if (seg.italic) style.fontStyle = "italic";
  const decorations = [seg.underlined && "underline", seg.strikethrough && "line-through"].filter(Boolean);
  if (decorations.length) style.textDecoration = decorations.join(" ");
  if (seg.obfuscated) style.filter = "blur(2px)";
  return style;
}

const SegmentSpan: React.FC<{ seg: Segment }> = ({ seg }) => {
  if (isRangeSegment(seg)) {
    const [low, high] = seg.range;
    return (
      <span style={{ color: resolveMinecraftColor(seg.c) }}>
        {formatRangeValue(low)}→{formatRangeValue(high)}
        {seg.unit}
      </span>
    );
  }
  if (typeof seg.t !== "string") return null;
  const parts = seg.t.split(GLYPH_REGEX);
  return (
    <span style={textStyle(seg)}>
      {parts.map((part, i) => (part in GLYPH_MAP ? <StatGlyph key={i} char={part} /> : part))}
    </span>
  );
};

export const SegmentLine: React.FC<{ segments: Segment[] }> = ({ segments }) => (
  <span>
    {segments.map((seg, i) => (
      <SegmentSpan key={i} seg={seg} />
    ))}
  </span>
);

// Drops the trailing "Buffed by <attribute> attribute." tag appended to some descriptions,
// along with any whitespace-only segments that precede it.
function stripBuffedBy(segments: Segment[]): Segment[] {
  const idx = segments.findIndex(
    (seg) => !isRangeSegment(seg) && typeof seg.t === "string" && seg.t.trimStart().toLowerCase().startsWith("buffed by"),
  );
  if (idx === -1) return segments;
  let end = idx;
  while (end > 0) {
    const prev = segments[end - 1];
    if (!isRangeSegment(prev) && typeof prev.t === "string" && prev.t.trim() === "") end--;
    else break;
  }
  return segments.slice(0, end);
}

interface ShardDescriptionProps {
  record?: ShardDescRecord;
  fallback?: string;
  showHowToHunt?: boolean;
}

export const ShardDescription: React.FC<ShardDescriptionProps> = ({ record, fallback = "No description available.", showHowToHunt = true }) => {
  if (!record) return <>{fallback}</>;
  return (
    <div>
      <SegmentLine segments={stripBuffedBy(record.description)} />
      {showHowToHunt && record.how_to_hunt.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-600">
          <div className="text-slate-400 uppercase text-[10px] tracking-wide mb-1">How to hunt</div>
          {record.how_to_hunt.map((line, i) => (
            <div key={i}>
              <SegmentLine segments={line} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
