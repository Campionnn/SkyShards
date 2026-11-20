import type { BuyMode, SellMode } from "../../services";
import { loadProfitSettings, saveProfitSettings } from "../../utilities";

/** The Profits page tabs, in the order they are shown. */
export const TABLE_IDS = ["farming", "fusions", "flips", "farmFusions", "inventory"] as const;
export type TableId = (typeof TABLE_IDS)[number];

/** The Profits page settings, remembered in the browser. */
export interface ProfitSettings {
  buyMode: BuyMode;
  sellMode: SellMode;
  /** Hypixel's base Bazaar tax is 1.25 %. */
  taxPercent: number;
  /** Percent of the hourly Bazaar volume you expect to get. */
  marketSharePercent: number;
  /** Hide rows whose (bottleneck) volume is below this many shards per hour. */
  minVolume: number;
  /** Flips: hide shards whose spread is more than this percent of the buy price; 0 means no limit. */
  maxSpreadPercent: number;
  /** Use the price overrides from the Shards page; off means live Bazaar prices only. */
  useOverrides: boolean;
  /** The tab that is shown. */
  activeTab: TableId;
  /** Switched-off columns, as "table:column" keys (see columnKey). */
  hiddenColumns: string[];
}

export const DEFAULT_PROFIT_SETTINGS: ProfitSettings = {
  buyMode: "instant",
  sellMode: "instant",
  taxPercent: 1.25,
  marketSharePercent: 10,
  minVolume: 0,
  // Half the shards on the Bazaar have a spread above ~65 %; above 100 % the "profit" is
  // usually an empty or manipulated order book rather than a flip anyone can repeat.
  maxSpreadPercent: 100,
  useOverrides: true,
  activeTab: "farming",
  hiddenColumns: [],
};

const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : fallback;

const numberIn = (value: unknown, max: number, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max ? value : fallback;

/**
 * Settings from storage, field by field: anything missing, out of range or of the wrong type
 * (an older build, a hand-edited entry) falls back to its default instead of breaking the page.
 */
export const parseProfitSettings = (raw: Record<string, unknown> | null): ProfitSettings => {
  const defaults = DEFAULT_PROFIT_SETTINGS;
  if (!raw) return { ...defaults, hiddenColumns: [] };
  return {
    buyMode: oneOf(raw.buyMode, ["instant", "order"], defaults.buyMode),
    sellMode: oneOf(raw.sellMode, ["instant", "offer"], defaults.sellMode),
    taxPercent: numberIn(raw.taxPercent, 100, defaults.taxPercent),
    marketSharePercent: numberIn(raw.marketSharePercent, 100, defaults.marketSharePercent),
    minVolume: numberIn(raw.minVolume, Number.MAX_VALUE, defaults.minVolume),
    maxSpreadPercent: numberIn(raw.maxSpreadPercent, Number.MAX_VALUE, defaults.maxSpreadPercent),
    useOverrides: typeof raw.useOverrides === "boolean" ? raw.useOverrides : defaults.useOverrides,
    activeTab: oneOf(raw.activeTab, TABLE_IDS, defaults.activeTab),
    hiddenColumns: Array.isArray(raw.hiddenColumns) ? raw.hiddenColumns.filter((key): key is string => typeof key === "string") : [],
  };
};

export const loadSettings = (): ProfitSettings => parseProfitSettings(loadProfitSettings());
export const saveSettings = (settings: ProfitSettings): void => saveProfitSettings(settings);
