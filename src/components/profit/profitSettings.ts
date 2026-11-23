import type { BuyMode, SellMode } from "../../services";
import { loadProfitSettings, saveProfitSettings } from "../../utilities";

/** The Profits page tabs, in the order they are shown. */
export const TABLE_IDS = ["farming", "fusions", "chains", "flips", "farmFusions", "inventory"] as const;
export type TableId = (typeof TABLE_IDS)[number];

/** The Profits page settings, remembered in the browser. */
export interface ProfitSettings {
  buyMode: BuyMode;
  sellMode: SellMode;
  /** Your Bazaar tax before mayor perks: 1.25 % base, 1.125 / 1 % with Bazaar Flipper. */
  taxPercent: number;
  /** Apply the current mayor's tax perk (Derpy's QUAD TAXES: ×4) on top of taxPercent. */
  applyMayorTax: boolean;
  /** Percent of the hourly Bazaar volume you expect to get. */
  marketSharePercent: number;
  /** Hide rows whose (bottleneck) volume is below this many shards per hour. */
  minVolume: number;
  /**
   * Hide rows whose widest spread (Flips: the shard; fusion tabs: any shard they price) is more
   * than this percent of the buy price; 0 means no limit.
   */
  maxSpreadPercent: number;
  /** Use the price overrides from the Shards page; off means live Bazaar prices only. */
  useOverrides: boolean;
  /** The tab that is shown. */
  activeTab: TableId;
  /** Switched-off columns, as "table:column" keys (see columnKey). */
  hiddenColumns: string[];
  /** Column order per tab, as column ids; tabs or columns missing here keep their default place. */
  columnOrder: Partial<Record<TableId, string[]>>;
}

export const DEFAULT_PROFIT_SETTINGS: ProfitSettings = {
  buyMode: "instant",
  sellMode: "instant",
  taxPercent: 1.25,
  applyMayorTax: true,
  marketSharePercent: 10,
  minVolume: 0,
  // Half the shards on the Bazaar have a spread above ~65 %; above 100 % the "profit" is
  // usually an empty or manipulated order book rather than a flip anyone can repeat.
  maxSpreadPercent: 100,
  useOverrides: true,
  activeTab: "farming",
  hiddenColumns: [],
  columnOrder: {},
};

const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : fallback;

const numberIn = (value: unknown, max: number, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max ? value : fallback;

const stringList = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

/** Only known tabs, each with a list of column ids. */
const parseColumnOrder = (value: unknown): ProfitSettings["columnOrder"] => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const order: ProfitSettings["columnOrder"] = {};
  for (const [table, ids] of Object.entries(value)) {
    if ((TABLE_IDS as readonly string[]).includes(table) && Array.isArray(ids)) order[table as TableId] = stringList(ids);
  }
  return order;
};

/**
 * Settings from storage, field by field: anything missing, out of range or of the wrong type
 * (an older build, a hand-edited entry) falls back to its default instead of breaking the page.
 */
export const parseProfitSettings = (raw: Record<string, unknown> | null): ProfitSettings => {
  const defaults = DEFAULT_PROFIT_SETTINGS;
  if (!raw) return { ...defaults, hiddenColumns: [], columnOrder: {} };
  return {
    buyMode: oneOf(raw.buyMode, ["instant", "order"], defaults.buyMode),
    sellMode: oneOf(raw.sellMode, ["instant", "offer"], defaults.sellMode),
    taxPercent: numberIn(raw.taxPercent, 100, defaults.taxPercent),
    applyMayorTax: typeof raw.applyMayorTax === "boolean" ? raw.applyMayorTax : defaults.applyMayorTax,
    marketSharePercent: numberIn(raw.marketSharePercent, 100, defaults.marketSharePercent),
    minVolume: numberIn(raw.minVolume, Number.MAX_VALUE, defaults.minVolume),
    maxSpreadPercent: numberIn(raw.maxSpreadPercent, Number.MAX_VALUE, defaults.maxSpreadPercent),
    useOverrides: typeof raw.useOverrides === "boolean" ? raw.useOverrides : defaults.useOverrides,
    activeTab: oneOf(raw.activeTab, TABLE_IDS, defaults.activeTab),
    hiddenColumns: stringList(raw.hiddenColumns),
    columnOrder: parseColumnOrder(raw.columnOrder),
  };
};

export const loadSettings = (): ProfitSettings => parseProfitSettings(loadProfitSettings());
export const saveSettings = (settings: ProfitSettings): void => saveProfitSettings(settings);
