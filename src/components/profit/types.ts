import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { MarketData, MarketSettings } from "../../services";
import type { Data } from "../../types/types";
import type { TableId } from "./profitSettings";

/** Shard data plus the Bazaar view the calculations read (prices with overrides, volumes, order books). */
export interface Loaded extends MarketData {
  data: Data;
  crocodileMultiplier: number;
  /** The Calculator's Crocodile level, for the multi-step solver (which works from params). */
  crocodileLevel: number;
  /** The player's shards from the Calculator's inventory import: shard id to count. */
  inventory: ReadonlyMap<string, number>;
  /** When Hypixel last refreshed the Bazaar snapshot these prices come from (ms since epoch). */
  updatedAt: number;
}

/** Opens a shard's order book. */
export type OpenBook = (shardId: string) => void;

export type SortDirection = "asc" | "desc";

export interface SortState {
  column: string;
  direction: SortDirection;
}

/** One table column. The id is unique per table and is what the Columns menu stores. */
export interface ColumnDef<R> {
  id: string;
  label: string;
  /** Tooltip on the header. */
  title?: string;
  align?: "left" | "right";
  /** Value to sort by; columns without one can't be sorted. */
  sortValue?: (row: R) => number | string;
  render: (row: R) => ReactNode;
  /**
   * With it, the column shows these side by side, one table cell each, under its one header,
   * instead of `render`. Used for "A + B" inputs, so the parts line up in every row.
   */
  cells?: ((row: R) => ReactNode)[];
  /** Columns that identify a row (shard, inputs, result) always stay visible. */
  alwaysVisible?: boolean;
}

/** Everything that makes one tab: its texts, its rows and its columns. */
export interface TableConfig<R> {
  id: TableId;
  label: string;
  icon: LucideIcon;
  description: string;
  rows: (loaded: Loaded, settings: MarketSettings) => R[];
  columns: (loaded: Loaded, openBook: OpenBook) => ColumnDef<R>[];
  initialSort: string;
  rowKey: (row: R) => string;
  /** Shards the search matches against. */
  shardIdsOf: (row: R) => string[];
  /** With it, the tab gets an "Only profitable" filter (on by default). */
  profitOf?: (row: R) => number;
  /** With it, the tab gets the "Max spread" filter: spread as a share of the buy price (0.5 = 50 %). */
  spreadOf?: (row: R) => number;
  searchPlaceholder: string;
  emptyText: string;
  /** Rows this tab always shows, whatever the Min. volume setting (e.g. your own shards). */
  ignoreMinVolume?: boolean;
  /** A line above the table, e.g. a total over all rows. */
  summary?: (rows: R[]) => ReactNode;
  /** With it, a row can be clicked open to show this below it (e.g. a fusion tree). */
  details?: (row: R, loaded: Loaded, settings: MarketSettings) => ReactNode;
}
