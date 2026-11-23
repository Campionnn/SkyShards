import { useMemo, useState, type ReactNode } from "react";
import type { MarketSettings } from "../../services";
import { ColumnPicker, DataTable, ShowMoreFooter } from "./DataTable";
import { NumberSetting, SearchBox, Section } from "./controls";
import type { TableId } from "./profitSettings";
import { allTables } from "./tables";
import { filterRows, moveColumn, orderColumns, sortRows, useSort, usePaging, visibleColumns } from "./tableState";
import type { Loaded, OpenBook, TableConfig } from "./types";

/** The tabs on the left; `extra` (the Columns menu) on the right of the same row. */
const TabBar = ({ active, onChange, extra }: { active: TableId; onChange: (tab: TableId) => void; extra?: ReactNode }) => (
  <div className="flex flex-wrap items-center justify-between gap-2">
    <div className="flex flex-wrap gap-2" role="tablist">
      {allTables.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          onClick={() => onChange(id)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors duration-200 cursor-pointer ${
            active === id
              ? "bg-emerald-500/30 text-emerald-200 border-emerald-400/50"
              : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500"
          }`}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
    {extra}
  </div>
);

/**
 * The tab bar (with the Columns menu) and the active tab's table: search, filters, sorting and
 * paging. Only this tab's rows are worked out; the fusion allTables hold well over 100,000 rows.
 */
export const ActiveTable = <R extends { volume: number }>({
  config,
  loaded,
  marketSettings,
  minVolume,
  maxSpreadPercent,
  onMaxSpreadPercentChange,
  hiddenColumns,
  onHiddenColumnsChange,
  columnOrder,
  onColumnOrderChange,
  onTabChange,
  openBook,
  notice,
}: {
  config: TableConfig<R>;
  loaded: Loaded;
  marketSettings: MarketSettings;
  minVolume: number;
  maxSpreadPercent: number;
  onMaxSpreadPercentChange: (value: number) => void;
  hiddenColumns: string[];
  onHiddenColumnsChange: (hidden: string[]) => void;
  /** This tab's saved column order (column ids), if the player changed it. */
  columnOrder: string[] | undefined;
  /** Saves this tab's column order; undefined goes back to the default. */
  onColumnOrderChange: (order: string[] | undefined) => void;
  onTabChange: (tab: TableId) => void;
  openBook: OpenBook;
  /** Shown above the table, e.g. a prompt to import the inventory. */
  notice?: ReactNode;
}) => {
  const { data } = loaded;
  const [query, setQuery] = useState("");
  const [onlyProfitable, setOnlyProfitable] = useState(true);
  const { sort, toggle } = useSort(config.initialSort);
  const lowerQuery = query.trim().toLowerCase();
  const filterProfit = config.profitOf !== undefined && onlyProfitable;
  const spreadLimit = config.spreadOf ? maxSpreadPercent : 0;
  const { limit, showMore, showLess } = usePaging(`${lowerQuery}|${filterProfit}|${minVolume}|${spreadLimit}|${sort.column}|${sort.direction}`);

  const rows = useMemo(() => config.rows(loaded, marketSettings), [config, loaded, marketSettings]);
  // Every column, so sorting keeps working when the sorted column is hidden; and the visible ones.
  // In the player's order; sorting only needs the ids, so the order doesn't matter to it.
  const allColumns = useMemo(() => orderColumns(config.columns(loaded, openBook), columnOrder), [config, loaded, openBook, columnOrder]);
  const columns = useMemo(() => visibleColumns(allColumns, config.id, hiddenColumns), [allColumns, config.id, hiddenColumns]);
  const moveTo = (from: string, to: string) =>
    onColumnOrderChange(
      moveColumn(
        allColumns.map((column) => column.id),
        from,
        to,
      ),
    );
  // Lower-case names once, instead of once per row on every keystroke.
  const lowerNames = useMemo(() => new Map(Object.entries(data.shards).map(([id, shard]) => [id, shard.name.toLowerCase()])), [data]);

  const filtered = useMemo(
    () => filterRows(rows, config, { query: lowerQuery, lowerNames, onlyProfitable: filterProfit, minVolume, maxSpreadPercent: spreadLimit }),
    [rows, config, lowerQuery, lowerNames, filterProfit, minVolume, spreadLimit],
  );
  const sorted = useMemo(() => sortRows(filtered, sort, allColumns), [filtered, sort, allColumns]);
  const shown = sorted.slice(0, limit);

  return (
    <>
      <TabBar
        active={config.id}
        onChange={onTabChange}
        extra={
          <ColumnPicker
            table={config.id}
            label={config.label}
            columns={allColumns}
            hidden={hiddenColumns}
            onChange={onHiddenColumnsChange}
            onOrderChange={onColumnOrderChange}
            customOrder={columnOrder !== undefined && columnOrder.length > 0}
          />
        }
      />
      <Section
        icon={<config.icon className="w-5 h-5 text-emerald-400" />}
        title={config.label}
        description={config.description}
        actions={
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {config.spreadOf && (
              <NumberSetting
                label="Max spread"
                value={maxSpreadPercent}
                onChange={onMaxSpreadPercentChange}
                step={10}
                suffix="%"
                title="Hide rows where a shard's spread is more than this share of its buy price (Worst spread column). Huge spreads usually mean an empty, lowball or manipulated order book, so the listed price won't hold. 0 shows everything."
              />
            )}
            {config.profitOf && (
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer whitespace-nowrap">
                <input type="checkbox" checked={onlyProfitable} onChange={(e) => setOnlyProfitable(e.target.checked)} className="accent-emerald-500" />
                Only profitable
              </label>
            )}
            <SearchBox value={query} onChange={setQuery} placeholder={config.searchPlaceholder} />
          </div>
        }
      >
        {notice}
        {config.summary?.(rows)}
        <DataTable
          columns={columns}
          rows={shown}
          rowKey={config.rowKey}
          sort={sort}
          onSort={toggle}
          emptyText={config.emptyText}
          details={config.details && ((row: R) => config.details!(row, loaded, marketSettings))}
          onMoveColumn={moveTo}
        />
        <ShowMoreFooter shown={shown.length} total={sorted.length} onShowMore={showMore} onShowLess={showLess} />
        {rows.length > filtered.length && (
          <p className="text-xs text-slate-500">
            {rows.length - filtered.length} of {rows.length} rows hidden by the filters
            {config.spreadOf && maxSpreadPercent > 0 ? " (including Max spread)" : ""}.
          </p>
        )}
      </Section>
    </>
  );
};
