import { GLYPH_MAP } from "../../data/glyphMap";

interface StatGlyphProps {
  char: string;
}

export const StatGlyph: React.FC<StatGlyphProps> = ({ char }) => {
  const glyph = GLYPH_MAP[char];
  if (!glyph) return <>{char}</>;
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${glyph.w} ${glyph.h}`}
      style={{
        display: "inline-block",
        width: `${glyph.w / glyph.h}em`,
        height: "1em",
        verticalAlign: "-0.125em",
      }}
      fill="currentColor"
      shapeRendering="crispEdges"
    >
      <path d={glyph.path} />
    </svg>
  );
};
