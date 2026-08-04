/**
 * Generates src/data/glyphMap.ts from the Minecraft bitmap-font definition
 * (src/data/font-default.json) and the sprite sheets in src/assets/glyphs/.
 *
 * Run: pnpm tsx scripts/generate-glyph-map.ts
 *
 * Each bitmap provider lays codepoints out row-major over its sheet; cell size
 * is sheetWidth/cols x sheetHeight/rows. U+0000 entries are padding cells.
 *
 * The glyph textures are pure-white stencils that Minecraft tints with the
 * current text color, so each glyph is emitted as an SVG path (one rect run
 * per row of set pixels) to be rendered with fill="currentColor" — crisp at
 * any scale, no sheet images needed at runtime.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fontPath = join(root, "src", "data", "font-default.json");
const glyphsDir = join(root, "src", "assets", "glyphs");
const outPath = join(root, "src", "data", "glyphMap.ts");

interface BitmapProvider {
  type: string;
  file: string;
  ascent: number;
  height: number;
  chars: string[];
}

/** Decode an 8-bit RGBA non-interlaced PNG and return its alpha channel. */
function decodePngAlpha(path: string): { width: number; height: number; alpha: Uint8Array } {
  const buf = readFileSync(path);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${path} is not a PNG`);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25];
  const interlace = buf[28];
  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(`${path}: only 8-bit RGBA non-interlaced PNGs are supported (got depth=${bitDepth} type=${colorType} interlace=${interlace})`);
  }

  const idat: Buffer[] = [];
  for (let pos = 8; pos < buf.length; ) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    if (type === "IDAT") idat.push(buf.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));

  const bpp = 4;
  const stride = width * bpp;
  const pixels = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[x - bpp] : 0; // left
      const b = prev ? prev[x] : 0; // up
      const c = x >= bpp && prev ? prev[x - bpp] : 0; // up-left
      let val = line[x];
      switch (filter) {
        case 0: break;
        case 1: val += a; break;
        case 2: val += b; break;
        case 3: val += (a + b) >> 1; break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          val += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          break;
        }
        default: throw new Error(`${path}: unknown PNG filter ${filter}`);
      }
      out[x] = val & 0xff;
    }
  }

  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) alpha[i] = pixels[i * bpp + 3];
  return { width, height, alpha };
}

/** Build an SVG path from a cell's set pixels: one horizontal run per subpath. */
function cellPath(alpha: Uint8Array, sheetW: number, x0: number, y0: number, w: number, h: number): string {
  const parts: string[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; ) {
      if (alpha[(y0 + y) * sheetW + x0 + x] > 0) {
        let len = 1;
        while (x + len < w && alpha[(y0 + y) * sheetW + x0 + x + len] > 0) len++;
        parts.push(`M${x} ${y}h${len}v1h-${len}z`);
        x += len;
      } else {
        x++;
      }
    }
  }
  return parts.join("");
}

/** "hypixel_skyblock:gui/icons/staff.png" -> "staff" */
function sheetName(file: string): string {
  return file.split("/").pop()!.replace(/\.png$/, "");
}

function esc(char: string): string {
  return `\\u${char.codePointAt(0)!.toString(16).padStart(4, "0")}`;
}

const font = JSON.parse(readFileSync(fontPath, "utf8")) as { providers: BitmapProvider[] };

const entries: { char: string; line: string }[] = [];
let sheetCount = 0;

for (const provider of font.providers) {
  if (provider.type !== "bitmap") {
    console.warn(`skipping non-bitmap provider: ${provider.file}`);
    continue;
  }
  const sheet = sheetName(provider.file);
  const { width, height, alpha } = decodePngAlpha(join(glyphsDir, `${sheet}.png`));
  const rows = provider.chars.length;
  const cols = Math.max(...provider.chars.map((r) => Array.from(r).length));
  if (width % cols !== 0 || height % rows !== 0) {
    throw new Error(`${sheet}.png (${width}x${height}) does not divide evenly into ${cols}x${rows} grid`);
  }
  const cellW = width / cols;
  const cellH = height / rows;
  sheetCount++;

  provider.chars.forEach((rowStr, row) => {
    Array.from(rowStr).forEach((char, col) => {
      if (char.codePointAt(0) === 0) return; // padding cell
      const path = cellPath(alpha, width, col * cellW, row * cellH, cellW, cellH);
      entries.push({
        char,
        line: `  "${esc(char)}": { w: ${cellW}, h: ${cellH}, path: "${path}" },`,
      });
    });
  });
}

const charClass = entries.map((e) => esc(e.char)).join("");

const out = `// AUTO-GENERATED by scripts/generate-glyph-map.ts — do not edit by hand.
// Regenerate with: pnpm tsx scripts/generate-glyph-map.ts

export interface Glyph {
  w: number;
  h: number;
  /** Pixel-run SVG path over a w x h viewBox; render with fill="currentColor". */
  path: string;
}

export const GLYPH_MAP: Record<string, Glyph> = {
${entries.map((e) => e.line).join("\n")}
};

/** Capturing char class of every mapped glyph; use with String.split to keep matches. */
export const GLYPH_REGEX = /([${charClass}])/;
`;

writeFileSync(outPath, out);
console.log(`wrote ${outPath}: ${entries.length} glyphs from ${sheetCount} sheets`);
