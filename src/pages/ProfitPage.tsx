import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Coins, Coffee, Columns3, Hammer, Pickaxe, ArrowDown, ArrowUp, ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useCalculatorState, useCustomRates } from "../hooks";
import {
  CalculationService,
  DataService,
  buildCalculationParams,
  getFarmingRows,
  getFusionRows,
  type BuyMode,
  type FarmingRow,
  type FusionRow,
  type MarketSettings,
  type SellMode,
  type ShardVolume,
} from "../services";
import { calculateMultipliers } from "../services/fusionMath";
import { formatLargeNumber, formatQuantity, getRarityColor, loadCustomPrices, shardIconUrl } from "../utilities";
import type { Data } from "../types/types";

type SortDirection = "asc" | "desc";

/** Author credit and support link shown at the top of the page. Leave SUPPORT_URL empty to hide the button. */
const AUTHOR_NAME = "MoltenOre";
const AUTHOR_URL = "https://github.com/MoltenOre";
const SUPPORT_URL = "https://ko-fi.com/moltenore";

const PAGE_SIZE = 50;

// ─── Page settings, remembered in the browser ───

interface ProfitSettings {
  buyMode: BuyMode;
  sellMode: SellMode;
  /** Hypixel's base Bazaar tax is 1.25 %. */
  taxPercent: number;
  /** Percent of the hourly Bazaar volume you expect to get. */
  marketSharePercent: number;
  /** Hide rows whose (bottleneck) volume is below this many shards per hour. */
  minVolume: number;
  farmingOpen: boolean;
  fusionsOpen: boolean;
  /** Switched-off columns, as "table:column" keys (see columnKey). */
  hiddenColumns: string[];
}

const SETTINGS_KEY = "profit_page_settings";
const DEFAULT_SETTINGS: ProfitSettings = {
  buyMode: "instant",
  sellMode: "instant",
  taxPercent: 1.25,
  marketSharePercent: 10,
  minVolume: 0,
  farmingOpen: true,
  fusionsOpen: true,
  hiddenColumns: [],
};

const loadSettings = (): ProfitSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const saveSettings = (settings: ProfitSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable (private mode, quota): settings just don't persist.
  }
};

interface Loaded {
  data: Data;
  buyPrices: Record<string, number>;
  sellPrices: Record<string, number>;
  /** Shards whose buy / sell price comes from the user's overrides on the Shards page. */
  buyOverrides: Set<string>;
  sellOverrides: Set<string>;
  volumes: Record<string, ShardVolume>;
  crocodileMultiplier: number;
}

/** Bazaar prices with the user's overrides for the same order-book side on top. */
const withOverrides = (bazaar: Record<string, number>, overrides: Map<string, number>) => ({ ...bazaar, ...Object.fromEntries(overrides) });

// ─── Small building blocks ───

const segmentClass = (active: boolean) =>
  `px-3 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 border cursor-pointer ${
    active
      ? "bg-emerald-500/30 text-emerald-200 border-emerald-400/50"
      : "bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 border-slate-600/50 hover:border-slate-500/50"
  }`;

const Segmented = <T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-slate-400">{label}</span>
    {options.map(([option, text]) => (
      <button key={option} type="button" className={segmentClass(value === option)} onClick={() => onChange(option)}>
        {text}
      </button>
    ))}
  </div>
);

const NumberSetting = ({
  label,
  value,
  onChange,
  step,
  suffix,
  title,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
  suffix?: string;
  title: string;
}) => (
  <label className="flex items-center gap-2 text-xs text-slate-400" title={title}>
    {label}
    <input
      type="number"
      min={0}
      step={step}
      value={value}
      onChange={(e) => onChange(Number.isFinite(e.target.valueAsNumber) ? Math.max(0, e.target.valueAsNumber) : 0)}
      className="w-20 px-2 py-1 bg-slate-700/50 border border-slate-600/50 rounded-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
    />
    {suffix}
  </label>
);

const ShardName = ({ data, shardId, amount }: { data: Data; shardId: string; amount?: number }) => {
  const shard = data.shards[shardId];
  if (!shard) return null;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {amount !== undefined && <span className="text-xs text-slate-400">{formatQuantity(amount)}×</span>}
      <img src={shardIconUrl(shardId)} alt="" className="w-4 h-4 object-contain" loading="lazy" />
      <span className={`text-sm font-medium ${getRarityColor(shard.rarity)}`}>{shard.name}</span>
    </span>
  );
};

/** A price, marked when it comes from the user's override instead of the Bazaar. */
const Price = ({ value, overridden }: { value: number; overridden: boolean }) => (
  <span className={overridden ? "text-amber-300" : undefined} title={overridden ? "Your price override from the Shards page" : undefined}>
    {formatLargeNumber(value)}
    {overridden && "*"}
  </span>
);

const SearchBox = ({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full sm:w-56 px-3 py-1.5 text-sm bg-slate-700/50 border border-slate-600/50 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
  />
);

/** A foldable card: the header always shows, the body only while open. */
const Section = ({
  icon,
  title,
  description,
  actions,
  open,
  onToggle,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) => {
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <section className="bg-slate-800 border border-slate-600 rounded-md p-3 space-y-3 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <button type="button" onClick={onToggle} className="flex items-center gap-2 cursor-pointer group" aria-expanded={open}>
          <Chevron className="w-4 h-4 text-slate-400 group-hover:text-white" />
          <div className="p-1 bg-slate-700 rounded-md">{icon}</div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </button>
        {open && actions}
      </div>
      {open && (
        <>
          <p className="text-sm text-slate-400">{description}</p>
          {children}
        </>
      )}
    </section>
  );
};

// ─── Tables ───

/** One table column. The id is unique per table and is what the Columns menu stores. */
interface ColumnDef<R> {
  id: string;
  label: string;
  /** Tooltip on the header. */
  title?: string;
  align?: "left" | "right";
  /** Value to sort by; columns without one can't be sorted. */
  sortValue?: (row: R) => number | string;
  render: (row: R) => ReactNode;
  /** Columns that identify a row (shard, inputs, result) always stay visible. */
  alwaysVisible?: boolean;
}

interface SortState {
  column: string;
  direction: SortDirection;
}

/** New columns start descending; clicking the active column flips the direction. */
const useSort = (initial: string) => {
  const [sort, setSort] = useState<SortState>({ column: initial, direction: "desc" });
  const toggle = (column: string) => setSort((current) => ({ column, direction: current.column === column && current.direction === "desc" ? "asc" : "desc" }));
  return { sort, toggle };
};

const sortRows = <R,>(rows: R[], sort: SortState, columns: ColumnDef<R>[]) => {
  const sortValue = columns.find((column) => column.id === sort.column)?.sortValue;
  if (!sortValue) return rows;
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = sortValue(a);
    const vb = sortValue(b);
    return (typeof va === "string" ? va.localeCompare(vb as string) : va - (vb as number)) * factor;
  });
};

const matchesQuery = (data: Data, shardIds: string[], query: string) => !query || shardIds.some((id) => data.shards[id]?.name.toLowerCase().includes(query));

const coinClass = (value: number) => (value > 0 ? "text-green-400" : value < 0 ? "text-red-400" : "text-slate-300");

// Both tables share one fixed row height, so rows line up whatever the cells contain.
const rowClass = "h-10 border-b border-slate-700/50 hover:bg-slate-700/30";
const cellClass = (align: "left" | "right" = "right") => `px-2 py-1.5 align-middle whitespace-nowrap ${align === "right" ? "text-right" : "text-left"}`;

/** A sortable table built from column definitions. `rows` are already filtered and sorted. */
const DataTable = <R,>({
  columns,
  rows,
  rowKey,
  sort,
  onSort,
  emptyText,
}: {
  columns: ColumnDef<R>[];
  rows: R[];
  rowKey: (row: R) => string;
  sort: SortState;
  onSort: (column: string) => void;
  emptyText: string;
}) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="border-b border-slate-700">
        <tr>
          {columns.map((column) => {
            const align = column.align ?? "right";
            const active = sort.column === column.id;
            const Arrow = sort.direction === "asc" ? ArrowUp : ArrowDown;
            return (
              <th key={column.id} className={`px-2 py-2 font-medium whitespace-nowrap ${align === "right" ? "text-right" : "text-left"}`} title={column.title}>
                {column.sortValue ? (
                  <button
                    type="button"
                    onClick={() => onSort(column.id)}
                    className={`inline-flex items-center gap-1 cursor-pointer hover:text-white ${active ? "text-emerald-300" : "text-slate-400"}`}
                  >
                    {column.label}
                    {active && <Arrow className="w-3 h-3" />}
                  </button>
                ) : (
                  <span className="text-slate-400">{column.label}</span>
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)} className={rowClass}>
            {columns.map((column) => (
              <td key={column.id} className={cellClass(column.align)}>
                {column.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    {rows.length === 0 && <p className="text-center text-slate-500 py-6">{emptyText}</p>}
  </div>
);

/**
 * Shows PAGE_SIZE rows, plus PAGE_SIZE more per "Show more" click; "Show less" goes back to the
 * first PAGE_SIZE. The count belongs to `resetKey` (filters and sort), so changing any of them
 * starts again at the first page.
 */
const usePaging = (resetKey: string) => {
  const [paging, setPaging] = useState({ key: resetKey, limit: PAGE_SIZE });
  const limit = paging.key === resetKey ? paging.limit : PAGE_SIZE;
  return {
    limit,
    showMore: () => setPaging({ key: resetKey, limit: limit + PAGE_SIZE }),
    showLess: () => setPaging({ key: resetKey, limit: PAGE_SIZE }),
  };
};

const pagingButton = "px-3 py-1.5 rounded-md border cursor-pointer transition-colors duration-200";

/** Fixed height, so the card doesn't shrink when a button appears or disappears. */
const ShowMoreFooter = ({ shown, total, onShowMore, onShowLess }: { shown: number; total: number; onShowMore: () => void; onShowLess: () => void }) => (
  <div className="h-8 flex items-center justify-between gap-2 text-xs text-slate-400">
    <span>
      Showing {shown} of {total}
    </span>
    <div className="flex items-center gap-2">
      {shown > PAGE_SIZE && (
        <button type="button" onClick={onShowLess} className={`${pagingButton} border-slate-600/50 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300`}>
          Show less
        </button>
      )}
      {shown < total && (
        <button
          type="button"
          onClick={onShowMore}
          className={`${pagingButton} border-emerald-500/30 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300`}
        >
          Show {Math.min(PAGE_SIZE, total - shown)} more
        </button>
      )}
    </div>
  </div>
);

// ─── Column definitions ───

const farmingColumns = ({ data, sellOverrides }: Loaded): ColumnDef<FarmingRow>[] => [
  {
    id: "name",
    label: "Shard",
    align: "left",
    alwaysVisible: true,
    sortValue: (row) => data.shards[row.shardId]?.name ?? "",
    render: (row) => <ShardName data={data} shardId={row.shardId} />,
  },
  {
    id: "rate",
    label: "Rate/h",
    title: "Shards you hunt per hour",
    sortValue: (row) => row.rate,
    render: (row) => <span className="text-slate-300">{formatQuantity(row.rate)}</span>,
  },
  {
    id: "price",
    label: "Price",
    title: "Sale price per shard, before tax",
    sortValue: (row) => row.price,
    render: (row) => (
      <span className="text-slate-300">
        <Price value={row.price} overridden={sellOverrides.has(row.shardId)} />
      </span>
    ),
  },
  {
    id: "volume",
    label: "Volume/h",
    title: "Shards the Bazaar takes per hour on your selling side (7-day average)",
    sortValue: (row) => row.volume,
    render: (row) => <span className="text-slate-400">{formatLargeNumber(row.volume)}</span>,
  },
  {
    id: "coinsPerHour",
    label: "Coins/h",
    title: "Rate × price after tax, ignoring market volume",
    sortValue: (row) => row.coinsPerHour,
    render: (row) => <span className="text-slate-300">{formatLargeNumber(row.coinsPerHour)}</span>,
  },
  {
    id: "realisticCoinsPerHour",
    label: "Realistic/h",
    title: "Coins/h, selling at most your market share of the volume",
    sortValue: (row) => row.realisticCoinsPerHour,
    render: (row) => <span className="font-medium text-green-400">{formatLargeNumber(row.realisticCoinsPerHour)}</span>,
  },
];

const fusionColumns = ({ data, buyOverrides, sellOverrides }: Loaded): ColumnDef<FusionRow>[] => {
  const inputsOverridden = (row: FusionRow) => buyOverrides.has(row.inputs[0]) || buyOverrides.has(row.inputs[1]);
  return [
    {
      id: "inputs",
      label: "Inputs",
      align: "left",
      alwaysVisible: true,
      render: (row) => (
        <span className="inline-flex items-center gap-2">
          <ShardName data={data} shardId={row.inputs[0]} amount={row.inputAmounts[0]} />
          <span className="text-slate-500">+</span>
          <ShardName data={data} shardId={row.inputs[1]} amount={row.inputAmounts[1]} />
        </span>
      ),
    },
    {
      id: "output",
      label: "Result",
      align: "left",
      alwaysVisible: true,
      sortValue: (row) => data.shards[row.outputId]?.name ?? "",
      render: (row) => <ShardName data={data} shardId={row.outputId} amount={row.outputQuantity} />,
    },
    {
      id: "cost",
      label: "Cost",
      title: "Coins to buy the inputs of one fusion",
      sortValue: (row) => row.cost,
      render: (row) => (
        <span className="text-slate-300">
          <Price value={row.cost} overridden={inputsOverridden(row)} />
        </span>
      ),
    },
    {
      id: "revenue",
      label: "Value",
      title: "What the result of one fusion sells for, after tax",
      sortValue: (row) => row.revenue,
      render: (row) => (
        <span className="text-slate-300">
          <Price value={row.revenue} overridden={sellOverrides.has(row.outputId)} />
        </span>
      ),
    },
    {
      id: "profit",
      label: "Profit",
      title: "Value minus cost, per fusion",
      sortValue: (row) => row.profit,
      render: (row) => {
        const overridden = inputsOverridden(row) || sellOverrides.has(row.outputId);
        return (
          <span className={`font-medium ${overridden ? "text-amber-300" : coinClass(row.profit)}`} title={overridden ? "Uses your price overrides" : undefined}>
            {formatLargeNumber(row.profit)}
            {overridden && "*"}
          </span>
        );
      },
    },
    {
      id: "margin",
      label: "Margin",
      title: "Profit as a share of the cost",
      sortValue: (row) => row.margin,
      render: (row) => <span className={coinClass(row.margin)}>{(row.margin * 100).toFixed(1)}%</span>,
    },
    {
      id: "volume",
      label: "Volume/h",
      title: "Hourly Bazaar volume of the least traded shard in this fusion",
      sortValue: (row) => row.volume,
      render: (row) => <span className="text-slate-400">{formatLargeNumber(row.volume)}</span>,
    },
    {
      id: "fusionsPerHour",
      label: "Max/h",
      title: "Fusions per hour the market allows at your market share",
      sortValue: (row) => row.fusionsPerHour,
      render: (row) => <span className="text-slate-300">{formatQuantity(row.fusionsPerHour)}</span>,
    },
    {
      id: "profitPerHour",
      label: "Profit/h",
      title: "Profit × Max/h",
      sortValue: (row) => row.profitPerHour,
      render: (row) => <span className="font-medium text-green-400">{formatLargeNumber(row.profitPerHour)}</span>,
    },
  ];
};

type TableId = "farming" | "fusions";

/** Key of a column in ProfitSettings.hiddenColumns. */
const columnKey = (table: TableId, columnId: string) => `${table}:${columnId}`;

/** Columns of one table that are switched on, in their original order. */
const visibleColumns = <R,>(columns: ColumnDef<R>[], table: TableId, hidden: string[]) =>
  columns.filter((column) => column.alwaysVisible || !hidden.includes(columnKey(table, column.id)));

// ─── Column menu ───

const ColumnPicker = ({
  groups,
  hidden,
  onChange,
}: {
  groups: { table: TableId; label: string; columns: ColumnDef<never>[] }[];
  hidden: string[];
  onChange: (hidden: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const toggle = (key: string) => onChange(hidden.includes(key) ? hidden.filter((item) => item !== key) : [...hidden, key]);

  return (
    <div className="relative">
      <button type="button" className={segmentClass(open)} onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <span className="inline-flex items-center gap-1.5">
          <Columns3 className="w-3.5 h-3.5" />
          Columns
        </span>
      </button>
      {open && (
        <>
          {/* Clicking anywhere outside the menu closes it. */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-64 p-3 space-y-3 bg-slate-800 border border-slate-600 rounded-md shadow-xl">
            {groups.map((group) => (
              <div key={group.table} className="space-y-1">
                <div className="text-xs font-semibold text-slate-300">{group.label}</div>
                {group.columns
                  .filter((column) => !column.alwaysVisible)
                  .map((column) => {
                    const key = columnKey(group.table, column.id);
                    return (
                      <label key={key} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer" title={column.title}>
                        <input type="checkbox" checked={!hidden.includes(key)} onChange={() => toggle(key)} className="accent-emerald-500" />
                        {column.label}
                      </label>
                    );
                  })}
              </div>
            ))}
            {hidden.length > 0 && (
              <button type="button" onClick={() => onChange([])} className="text-xs text-emerald-300 hover:underline cursor-pointer">
                Show all columns
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Farming ───

const FarmingTable = ({
  data,
  rows,
  columns,
  allColumns,
  minVolume,
  open,
  onToggle,
}: {
  data: Data;
  rows: FarmingRow[];
  /** Visible columns. */
  columns: ColumnDef<FarmingRow>[];
  /** Every column, so sorting keeps working when the sorted column is hidden. */
  allColumns: ColumnDef<FarmingRow>[];
  minVolume: number;
  open: boolean;
  onToggle: () => void;
}) => {
  const [query, setQuery] = useState("");
  const { sort, toggle } = useSort("realisticCoinsPerHour");
  const lowerQuery = query.trim().toLowerCase();
  const { limit, showMore, showLess } = usePaging(`${lowerQuery}|${minVolume}|${sort.column}|${sort.direction}`);

  const filtered = useMemo(
    () =>
      sortRows(
        rows.filter((row) => row.volume >= minVolume && matchesQuery(data, [row.shardId], lowerQuery)),
        sort,
        allColumns,
      ),
    [rows, data, minVolume, lowerQuery, sort, allColumns],
  );
  const shown = filtered.slice(0, limit);

  return (
    <Section
      icon={<Pickaxe className="w-5 h-5 text-emerald-400" />}
      title="Farming"
      description="Shards you can hunt directly, with your rate from the calculator settings. Realistic/h only counts what the Bazaar takes at your market share."
      actions={<SearchBox value={query} onChange={setQuery} placeholder="Search shards..." />}
      open={open}
      onToggle={onToggle}
    >
      <DataTable columns={columns} rows={shown} rowKey={(row) => row.shardId} sort={sort} onSort={toggle} emptyText="No shards found." />
      <ShowMoreFooter shown={shown.length} total={filtered.length} onShowMore={showMore} onShowLess={showLess} />
    </Section>
  );
};

// ─── Fusions ───

const FusionTable = ({
  data,
  rows,
  columns,
  allColumns,
  minVolume,
  open,
  onToggle,
}: {
  data: Data;
  rows: FusionRow[];
  /** Visible columns. */
  columns: ColumnDef<FusionRow>[];
  /** Every column, so sorting keeps working when the sorted column is hidden. */
  allColumns: ColumnDef<FusionRow>[];
  minVolume: number;
  open: boolean;
  onToggle: () => void;
}) => {
  const [query, setQuery] = useState("");
  const [onlyProfitable, setOnlyProfitable] = useState(true);
  const { sort, toggle } = useSort("profitPerHour");
  const lowerQuery = query.trim().toLowerCase();
  const { limit, showMore, showLess } = usePaging(`${lowerQuery}|${onlyProfitable}|${minVolume}|${sort.column}|${sort.direction}`);

  const filtered = useMemo(
    () =>
      sortRows(
        rows.filter((row) => (!onlyProfitable || row.profit > 0) && row.volume >= minVolume && matchesQuery(data, [row.outputId, ...row.inputs], lowerQuery)),
        sort,
        allColumns,
      ),
    [rows, data, lowerQuery, onlyProfitable, minVolume, sort, allColumns],
  );
  const shown = filtered.slice(0, limit);

  return (
    <Section
      icon={<Hammer className="w-5 h-5 text-emerald-400" />}
      title="Fusions"
      description="Buy the inputs, fuse, sell the result. Profit is per fusion after tax; Max/h is how many fusions the Bazaar volume allows at your market share."
      actions={
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer whitespace-nowrap">
            <input type="checkbox" checked={onlyProfitable} onChange={(e) => setOnlyProfitable(e.target.checked)} className="accent-emerald-500" />
            Only profitable
          </label>
          <SearchBox value={query} onChange={setQuery} placeholder="Search input or result..." />
        </div>
      }
      open={open}
      onToggle={onToggle}
    >
      <DataTable
        columns={columns}
        rows={shown}
        rowKey={(row) => `${row.outputId}|${row.inputs[0]}|${row.inputs[1]}|${row.outputQuantity}`}
        sort={sort}
        onSort={toggle}
        emptyText="No fusions found."
      />
      <ShowMoreFooter shown={shown.length} total={filtered.length} onShowMore={showMore} onShowLess={showLess} />
    </Section>
  );
};

// ─── Page ───

export const ProfitPage = () => {
  const { form } = useCalculatorState();
  const { customRates } = useCustomRates();
  const [settings, setSettings] = useState<ProfitSettings>(loadSettings);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { buyMode, sellMode } = settings;

  const update = (changes: Partial<ProfitSettings>) =>
    setSettings((current) => {
      const next = { ...current, ...changes };
      saveSettings(next);
      return next;
    });

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      // Rates always come from the player's own hunting rates (ironman mode), with the
      // calculator's Hunting Fortune, pets and rate overrides applied.
      const params = await buildCalculationParams({ ...form, ironManView: true }, customRates);
      const dataService = DataService.getInstance();
      // loadShardCosts(true) is the lowest sell offer (instant buy / sell offer price),
      // loadShardCosts(false) the highest buy order (buy order / instant sell price).
      // Price overrides are stored per side the same way, so each side gets its own.
      const buyFromOffers = buyMode === "instant";
      const sellToOffers = sellMode === "offer";
      const [data, bazaarBuy, bazaarSell, volumes] = await Promise.all([
        CalculationService.getInstance().parseData(params),
        dataService.loadShardCosts(buyFromOffers),
        dataService.loadShardCosts(sellToOffers),
        dataService.loadShardVolumes(),
      ]);
      const buyOverrides = loadCustomPrices(buyFromOffers);
      const sellOverrides = loadCustomPrices(sellToOffers);
      if (!cancelled) {
        setLoaded({
          data,
          buyPrices: withOverrides(bazaarBuy, buyOverrides),
          sellPrices: withOverrides(bazaarSell, sellOverrides),
          buyOverrides: new Set(buyOverrides.keys()),
          sellOverrides: new Set(sellOverrides.keys()),
          volumes,
          crocodileMultiplier: calculateMultipliers(params).crocodileMultiplier,
        });
      }
    })().catch((loadError: unknown) => {
      console.error(loadError);
      if (!cancelled) setError("Could not load shard data or Bazaar prices. Please try again later.");
    });
    return () => {
      cancelled = true;
    };
  }, [form, customRates, buyMode, sellMode]);

  const market: MarketSettings = useMemo(
    () => ({ buyMode, sellMode, taxPercent: settings.taxPercent, marketShare: settings.marketSharePercent / 100 }),
    [buyMode, sellMode, settings.taxPercent, settings.marketSharePercent],
  );
  const farmingRows = useMemo(() => (loaded ? getFarmingRows(loaded.data, loaded.sellPrices, loaded.volumes, market) : []), [loaded, market]);
  const fusionRows = useMemo(
    () => (loaded ? getFusionRows(loaded.data, loaded.buyPrices, loaded.sellPrices, loaded.volumes, market, loaded.crocodileMultiplier) : []),
    [loaded, market],
  );

  const allFarmingColumns = useMemo(() => (loaded ? farmingColumns(loaded) : []), [loaded]);
  const allFusionColumns = useMemo(() => (loaded ? fusionColumns(loaded) : []), [loaded]);
  const shownFarmingColumns = useMemo(() => visibleColumns(allFarmingColumns, "farming", settings.hiddenColumns), [allFarmingColumns, settings.hiddenColumns]);
  const shownFusionColumns = useMemo(() => visibleColumns(allFusionColumns, "fusions", settings.hiddenColumns), [allFusionColumns, settings.hiddenColumns]);

  const overrideCount = loaded ? new Set([...loaded.buyOverrides, ...loaded.sellOverrides]).size : 0;
  // Side by side on wide screens while both are open; a folded section gives its space to the other.
  const bothOpen = settings.farmingOpen && settings.fusionsOpen;

  return (
    <div className="min-h-screen px-2 sm:px-4 py-4">
      <div className="max-w-[1800px] mx-auto space-y-4">
        <div className="bg-slate-800 border border-slate-600 rounded-md p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-400" />
              <h1 className="text-xl font-semibold text-white">Profits</h1>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>
                Profits Page Created by{" "}
                <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer" className="text-emerald-300 hover:underline">
                  {AUTHOR_NAME}
                </a>
              </span>
              {SUPPORT_URL && (
                <a
                  href={SUPPORT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-200 border border-yellow-400/30 hover:border-yellow-400/50 transition-colors duration-200"
                >
                  <Coffee className="w-4 h-4" />
                  Buy him a coffee
                </a>
              )}
            </div>
          </div>
          <p className="text-sm text-slate-400">
            Rates use your Hunting Fortune, pets and custom rates from the{" "}
            <Link to="/" className="text-purple-300 hover:underline">
              Calculator
            </Link>{" "}
            and{" "}
            <Link to="/shards" className="text-purple-300 hover:underline">
              Shards
            </Link>{" "}
            pages. Prices are live from the Bazaar
            {overrideCount > 0 && (
              <>
                , with <span className="text-amber-300">{overrideCount} price overrides*</span> from the Shards page
              </>
            )}
            . Volumes are 7-day Bazaar averages.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Segmented<BuyMode>
              label="Buy inputs via"
              value={buyMode}
              onChange={(value) => update({ buyMode: value })}
              options={[
                ["instant", "Instant buy"],
                ["order", "Buy order"],
              ]}
            />
            <Segmented<SellMode>
              label="Sell via"
              value={sellMode}
              onChange={(value) => update({ sellMode: value })}
              options={[
                ["instant", "Instant sell"],
                ["offer", "Sell offer"],
              ]}
            />
            <NumberSetting
              label="Bazaar tax"
              value={settings.taxPercent}
              onChange={(value) => update({ taxPercent: Math.min(value, 100) })}
              step={0.125}
              suffix="%"
              title="Taken from every sale. Hypixel's base tax is 1.25 %."
            />
            <NumberSetting
              label="Market share"
              value={settings.marketSharePercent}
              onChange={(value) => update({ marketSharePercent: Math.min(value, 100) })}
              step={1}
              suffix="%"
              title="How much of the hourly Bazaar volume you expect to get, since other players trade too. Used for Realistic/h, Max/h and Profit/h."
            />
            <NumberSetting
              label="Min. volume"
              value={settings.minVolume}
              onChange={(value) => update({ minVolume: value })}
              step={10}
              suffix="/h"
              title="Hide shards and fusions whose least traded shard sells fewer than this many per hour."
            />
            {loaded && (
              <ColumnPicker
                groups={[
                  { table: "farming", label: "Farming", columns: allFarmingColumns },
                  { table: "fusions", label: "Fusions", columns: allFusionColumns },
                ]}
                hidden={settings.hiddenColumns}
                onChange={(hiddenColumns) => update({ hiddenColumns })}
              />
            )}
          </div>
        </div>

        {error && <p className="text-center text-red-400 py-6">{error}</p>}
        {!error && !loaded && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}
        {loaded && (
          <div className={`grid gap-4 items-start ${bothOpen ? "xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" : ""}`}>
            <FarmingTable
              data={loaded.data}
              rows={farmingRows}
              columns={shownFarmingColumns}
              allColumns={allFarmingColumns}
              minVolume={settings.minVolume}
              open={settings.farmingOpen}
              onToggle={() => update({ farmingOpen: !settings.farmingOpen })}
            />
            <FusionTable
              data={loaded.data}
              rows={fusionRows}
              columns={shownFusionColumns}
              allColumns={allFusionColumns}
              minVolume={settings.minVolume}
              open={settings.fusionsOpen}
              onToggle={() => update({ fusionsOpen: !settings.fusionsOpen })}
            />
          </div>
        )}
      </div>
    </div>
  );
};
