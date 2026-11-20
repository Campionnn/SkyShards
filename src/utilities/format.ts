/** Hours -> "42 sec" / "5 min" / "2 hr" / "2 hr 5 min" / "1 d 3 hr 0 min". */
export const formatTime = (decimalHours: number): string => {
  if (!Number.isFinite(decimalHours)) return String(decimalHours);

  const totalSeconds = Math.round(decimalHours * 3600);
  if (totalSeconds < 60) return `${totalSeconds} sec`;

  // Round once, on whole minutes, so 1.999 hr reads "2 hr" and never "1 hr 60 min".
  const totalMinutes = Math.round(totalSeconds / 60);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days} d ${hours} hr ${minutes} min`;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
};

/** 0 -> "0", 0.005 -> "0.0050", 0.5 -> "0.50", 3 -> "3", 3.14159 -> "3.14". */
export const formatNumber = (num: number): string => {
  if (num === 0) return "0";
  if (num < 0.01) return num.toFixed(4);
  if (num < 1) return num.toFixed(2);
  return num.toFixed(2).replace(/\.00$/, "");
};

/** Shard counts: at most two decimals, no trailing zeros. */
export const formatQuantity = (quantity: number): string => {
  if (!Number.isFinite(quantity)) return String(quantity);
  return String(Math.round(quantity * 100) / 100);
};

const LARGE_NUMBER_UNITS = [
  { value: 1_000_000_000, suffix: "B" },
  { value: 1_000_000, suffix: "M" },
  { value: 1_000, suffix: "K" },
] as const;

/** Coins: 1_500_000 -> "1.50M", -2000 -> "-2K", 12.5 -> "12.50". */
export const formatLargeNumber = (num: number): string => {
  const absNum = Math.abs(num);
  const unit = LARGE_NUMBER_UNITS.find(({ value }) => absNum >= value);
  const formatted = (unit ? (absNum / unit.value).toFixed(2) + unit.suffix : absNum.toFixed(2)).replace(/\.00(?=[KMB]|$)/, "");
  return num < 0 ? "-" + formatted : formatted;
};

const RARITY_TEXT_COLORS: Record<string, string> = {
  common: "text-white",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

/** Tailwind text color class for a lowercase rarity name. */
export const getRarityColor = (rarity: string): string => RARITY_TEXT_COLORS[rarity] || "text-white";
