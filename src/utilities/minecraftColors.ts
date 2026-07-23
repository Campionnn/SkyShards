// Minecraft color name -> hex, mirroring the exporter's TextColors.kt.
const MINECRAFT_COLORS: Record<string, string> = {
  black: "#000000",
  dark_blue: "#0000AA",
  dark_green: "#00AA00",
  dark_aqua: "#00AAAA",
  dark_red: "#AA0000",
  dark_purple: "#AA00AA",
  gold: "#FFAA00",
  gray: "#AAAAAA",
  dark_gray: "#555555",
  blue: "#5555FF",
  green: "#55FF55",
  aqua: "#55FFFF",
  red: "#FF5555",
  light_purple: "#FF55FF",
  yellow: "#FFFF55",
  white: "#FFFFFF",
};

const DEFAULT_COLOR = "#AAAAAA";

/** Resolve a segment color ("gray", "dark_green", "#rrggbb", or undefined) to a CSS hex color. */
export function resolveMinecraftColor(color?: string): string {
  if (!color) return DEFAULT_COLOR;
  const key = color.trim().toLowerCase();
  if (key.startsWith("#") && key.length === 7) return key;
  return MINECRAFT_COLORS[key] ?? DEFAULT_COLOR;
}
