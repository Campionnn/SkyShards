import { useState } from "react";
import type { ColumnDef, SortState, TableConfig } from "./types";
import type { TableId } from "./profitSettings";

export const PAGE_SIZE = 25;

/** New columns start descending; clicking the active column flips the direction. */
export const useSort = (initial: string) => {
  const [sort, setSort] = useState<SortState>({ column: initial, direction: "desc" });
  const toggle = (column: string) => setSort((current) => ({ column, direction: current.column === column && current.direction === "desc" ? "asc" : "desc" }));
  return { sort, toggle };
};

/**
 * Shows PAGE_SIZE rows, plus PAGE_SIZE more per "Show more" click; "Show less" goes back to the
 * first PAGE_SIZE. The count belongs to `resetKey` (filters and sort), so changing any of them
 * starts again at the first page.
 */
export const usePaging = (resetKey: string) => {
  const [paging, setPaging] = useState({ key: resetKey, limit: PAGE_SIZE });
  const limit = paging.key === resetKey ? paging.limit : PAGE_SIZE;
  return {
    limit,
    showMore: () => setPaging({ key: resetKey, limit: limit + PAGE_SIZE }),
    showLess: () => setPaging({ key: resetKey, limit: PAGE_SIZE }),
  };
};

/** Compares names like localeCompare, but set up once instead of on every comparison. */
const nameCollator = new Intl.Collator();

/** Sorts by the given column. Each row's sort value is worked out once, not on every comparison. */
export const sortRows = <R>(rows: R[], sort: SortState, columns: ColumnDef<R>[]) => {
  const sortValue = columns.find((column) => column.id === sort.column)?.sortValue;
  if (!sortValue) return rows;
  const factor = sort.direction === "asc" ? 1 : -1;
  return rows
    .map((row) => ({ row, key: sortValue(row) }))
    .sort((a, b) => (typeof a.key === "string" ? nameCollator.compare(a.key, b.key as string) : a.key - (b.key as number)) * factor)
    .map(({ row }) => row);
};

export interface RowFilters {
  /** Lower-case search text; empty matches everything. */
  query: string;
  /** Lower-case shard names by id. */
  lowerNames: ReadonlyMap<string, string>;
  onlyProfitable: boolean;
  minVolume: number;
  /** Percent; 0 means no limit. */
  maxSpreadPercent: number;
}

/** The rows a tab shows. Filters a tab doesn't have (no profitOf / spreadOf) don't apply to it. */
export const filterRows = <R extends { volume: number }>(rows: R[], config: TableConfig<R>, filters: RowFilters): R[] => {
  const { profitOf, spreadOf, shardIdsOf } = config;
  const { query, lowerNames, onlyProfitable, minVolume, maxSpreadPercent } = filters;
  const maxSpread = spreadOf && maxSpreadPercent > 0 ? maxSpreadPercent / 100 : Infinity;
  const matches = (row: R) => !query || shardIdsOf(row).some((id) => lowerNames.get(id)?.includes(query));
  return rows.filter(
    (row) =>
      (!onlyProfitable || !profitOf || profitOf(row) > 0) &&
      (config.ignoreMinVolume || row.volume >= minVolume) &&
      (!spreadOf || spreadOf(row) <= maxSpread) &&
      matches(row),
  );
};

/** A fill time: "instant", minutes, hours or days; a dash when that side doesn't trade. */
export const formatHours = (hours: number) => {
  if (!Number.isFinite(hours)) return "–";
  if (hours === 0) return "instant";
  const minutes = hours * 60;
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours / 24)}d`;
};

/** Infinity can't be subtracted when sorting, so "never" sorts as the largest number. */
export const sortableHours = (hours: number) => (Number.isFinite(hours) ? hours : Number.MAX_VALUE);

/** Key of a column in ProfitSettings.hiddenColumns. */
export const columnKey = (table: TableId, columnId: string) => `${table}:${columnId}`;

/** Columns of one table that are switched on, in their original order. */
export const visibleColumns = <R>(columns: ColumnDef<R>[], table: TableId, hidden: string[]) =>
  columns.filter((column) => column.alwaysVisible || !hidden.includes(columnKey(table, column.id)));
