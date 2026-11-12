import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Coins, Coffee, Columns3, Hammer, Pickaxe, Repeat, Sprout, ArrowDown, ArrowUp, X, type LucideIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useCalculatorState, useCustomRates } from "../hooks";
import { Modal, Tooltip } from "../components/ui";
import { DepthChart } from "../components/profit/DepthChart";
import { ShardDescription } from "../components/ui/ShardDescription";
import { SHARD_DESCRIPTIONS } from "../constants";
import {
  CalculationService,
  DataService,
  buildCalculationParams,
  getFarmingRows,
  countOrders,
  getFarmFusionRows,
  getFlipRows,
  getFusionRows,
  getSpread,
  type BuyMode,
  type FarmFusionRow,
  type FarmingRow,
  type FlipRow,
  type FusionRow,
  type MarketData,
  type MarketSettings,
  type OrderBook,
  type OrderLevel,
  type SellMode,
  type Spread,
} from "../services";
import { calculateMultipliers } from "../services/fusionMath";
import { formatLargeNumber, formatQuantity, getRarityColor, loadCustomPrices, shardIconUrl } from "../utilities";
import type { Data } from "../types/types";

type SortDirection = "asc" | "desc";

/** Author credit and support link shown at the top of the page. Leave SUPPORT_URL empty to hide the button. */
const AUTHOR_NAME = "MoltenOre";
const AUTHOR_URL = "https://github.com/MoltenOre";
const SUPPORT_URL = "https://ko-fi.com/moltenore";

const PAGE_SIZE = 25;

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
  /** The tab that is shown. */
  activeTab: TableId;
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
  activeTab: "farming",
  hiddenColumns: [],
};

const loadSettings = (): ProfitSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const settings: ProfitSettings = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    // A saved tab that no longer exists falls back to the first one.
    return TABS.some((tab) => tab.id === settings.activeTab) ? settings : { ...settings, activeTab: DEFAULT_SETTINGS.activeTab };
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

/** Shard data plus the Bazaar view the calculations read (prices with overrides, volumes, order books). */
interface Loaded extends MarketData {
  data: Data;
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

/**
 * Icon and name of a shard. Hovering shows the same description overlay as the calculator;
 * with `onOpen`, clicking the name runs it (open the order book, or go to the Shards page).
 */
const ShardName = ({
  data,
  shardId,
  amount,
  onOpen,
  openLabel = "Show order book",
}: {
  data: Data;
  shardId: string;
  amount?: number;
  onOpen?: (shardId: string) => void;
  openLabel?: string;
}) => {
  const shard = data.shards[shardId];
  if (!shard) return null;
  const description = SHARD_DESCRIPTIONS[shardId as keyof typeof SHARD_DESCRIPTIONS];
  const name = <span className={`text-sm font-medium ${getRarityColor(shard.rarity)}`}>{shard.name}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {amount !== undefined && <span className="text-xs text-slate-400">{formatQuantity(amount)}×</span>}
      <Tooltip
        openOn="hover"
        content={<ShardDescription record={description} />}
        title={description?.title}
        shardName={shard.name}
        shardIcon={shardId}
        rarity={shard.rarity}
        family={shard.family}
        type={shard.type}
        shardId={shardId}
        className="inline-flex items-center gap-1.5"
      >
        <img src={shardIconUrl(shardId)} alt="" className="w-4 h-4 object-contain" loading="lazy" />
        {onOpen ? (
          <button type="button" onClick={() => onOpen(shardId)} className="cursor-pointer hover:underline" aria-label={`${openLabel}: ${shard.name}`}>
            {name}
          </button>
        ) : (
          name
        )}
      </Tooltip>
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

/** The card around a table: title, filters on the right, a short description, then the table. */
const Section = ({
  icon,
  title,
  description,
  actions,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) => (
  <section className="bg-slate-800 border border-slate-600 rounded-md p-3 space-y-3 min-w-0">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className="p-1 bg-slate-700 rounded-md">{icon}</div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      {actions}
    </div>
    <p className="text-sm text-slate-400">{description}</p>
    {children}
  </section>
);

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

/** A fill time: "instant", minutes, hours or days; a dash when that side doesn't trade. */
const formatHours = (hours: number) => {
  if (!Number.isFinite(hours)) return "–";
  if (hours === 0) return "instant";
  const minutes = hours * 60;
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours / 24)}d`;
};

/** Fill times longer than an hour are highlighted: the queue holds more than the market trades in an hour. */
const FillTime = ({ hours }: { hours: number }) => <span className={hours > 1 ? "text-amber-300" : "text-slate-300"}>{formatHours(hours)}</span>;

/** Infinity can't be subtracted when sorting, so "never" sorts as the largest number. */
const sortableHours = (hours: number) => (Number.isFinite(hours) ? hours : Number.MAX_VALUE);

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

const farmingColumns = ({ data, sellOverrides, orderBooks }: Loaded, openBook: (shardId: string) => void): ColumnDef<FarmingRow>[] => [
  {
    id: "name",
    label: "Shard",
    align: "left",
    alwaysVisible: true,
    sortValue: (row) => data.shards[row.shardId]?.name ?? "",
    render: (row) => <ShardName data={data} shardId={row.shardId} onOpen={openBook} />,
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
    id: "spread",
    label: "Spread",
    title: "Cheapest sell offer minus highest buy order",
    sortValue: (row) => getSpread(orderBooks[row.shardId])?.spread ?? 0,
    render: (row) => <SpreadValue spread={getSpread(orderBooks[row.shardId])} />,
  },
  {
    id: "spreadPercent",
    label: "Spread %",
    title: "Spread as a share of the highest buy order",
    sortValue: (row) => getSpread(orderBooks[row.shardId])?.percent ?? 0,
    render: (row) => <SpreadValue spread={getSpread(orderBooks[row.shardId])} percent />,
  },
  {
    id: "tenPercentOffer",
    label: "10% offer",
    title: 'The in-game "10% of spread" sell offer: the cheapest sell offer minus a tenth of the spread',
    sortValue: (row) => getSpread(orderBooks[row.shardId])?.tenPercentOffer ?? 0,
    render: (row) => {
      const spread = getSpread(orderBooks[row.shardId]);
      return spread ? <span className="text-slate-300">{formatLargeNumber(spread.tenPercentOffer)}</span> : <span className="text-slate-500">–</span>;
    },
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
    render: (row) => <span className="text-slate-300">{formatLargeNumber(row.realisticCoinsPerHour)}</span>,
  },
  {
    id: "realPrice",
    label: "Real price",
    title: "Average sale price when selling an hour's worth at once, from the order book (instant sell only)",
    sortValue: (row) => row.realPrice,
    render: (row) => (
      <span className="text-slate-300">
        <Price value={row.realPrice} overridden={sellOverrides.has(row.shardId)} />
      </span>
    ),
  },
  {
    id: "realCoinsPerHour",
    label: "Real/h",
    title: "Realistic/h at the real price, and at most what the order book holds",
    sortValue: (row) => row.realCoinsPerHour,
    render: (row) => <span className="font-medium text-green-400">{formatLargeNumber(row.realCoinsPerHour)}</span>,
  },
  {
    id: "competitors",
    label: "Competition",
    title: "Sell offers already listed: the players you compete with when selling",
    sortValue: (row) => row.competitors,
    render: (row) => <span className="text-slate-300">{row.competitors}</span>,
  },
  {
    id: "sellHours",
    label: "Sell time",
    title: "Time to sell an hour's worth: instant when selling instantly, else how long your sell offer waits behind the ones at the best price",
    sortValue: (row) => sortableHours(row.sellHours),
    render: (row) => <FillTime hours={row.sellHours} />,
  },
];

const fusionColumns = ({ data, buyOverrides, sellOverrides }: Loaded, openBook: (shardId: string) => void): ColumnDef<FusionRow>[] => {
  const inputsOverridden = (row: FusionRow) => buyOverrides.has(row.inputs[0]) || buyOverrides.has(row.inputs[1]);
  return [
    {
      id: "inputs",
      label: "Inputs",
      align: "left",
      alwaysVisible: true,
      render: (row) => (
        <span className="inline-flex items-center gap-2">
          <ShardName data={data} shardId={row.inputs[0]} amount={row.inputAmounts[0]} onOpen={openBook} />
          <span className="text-slate-500">+</span>
          <ShardName data={data} shardId={row.inputs[1]} amount={row.inputAmounts[1]} onOpen={openBook} />
        </span>
      ),
    },
    {
      id: "output",
      label: "Result",
      align: "left",
      alwaysVisible: true,
      sortValue: (row) => data.shards[row.outputId]?.name ?? "",
      render: (row) => <ShardName data={data} shardId={row.outputId} amount={row.outputQuantity} onOpen={openBook} />,
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
      render: (row) => <span className="text-slate-300">{formatLargeNumber(row.profitPerHour)}</span>,
    },
    {
      id: "realProfit",
      label: "Real profit",
      title: "Profit per fusion when an hour's worth is bought and sold at once, at order book prices (instant trades only)",
      sortValue: (row) => row.realProfit,
      render: (row) => <span className={coinClass(row.realProfit)}>{formatLargeNumber(row.realProfit)}</span>,
    },
    {
      id: "realFusionsPerHour",
      label: "Real max/h",
      title: "Max/h, also limited by how much the order books hold",
      sortValue: (row) => row.realFusionsPerHour,
      render: (row) => <span className="text-slate-300">{formatQuantity(row.realFusionsPerHour)}</span>,
    },
    {
      id: "realProfitPerHour",
      label: "Real profit/h",
      title: "Real profit × Real max/h",
      sortValue: (row) => row.realProfitPerHour,
      render: (row) => <span className="font-medium text-green-400">{formatLargeNumber(row.realProfitPerHour)}</span>,
    },
    {
      id: "fillHours",
      label: "Fill time",
      title:
        "Time until an hour's worth of orders fills, waiting behind the orders at the best price: the slowest of buying the inputs and selling the result. Instant trades don't wait.",
      sortValue: (row) => sortableHours(row.fillHours),
      render: (row) => <FillTime hours={row.fillHours} />,
    },
  ];
};

/** A spread in coins or percent, or a dash when one side of the book is empty. */
const SpreadValue = ({ spread, percent = false }: { spread: Spread | null; percent?: boolean }) =>
  spread ? (
    <span className="text-slate-300">{percent ? `${(spread.percent * 100).toFixed(1)}%` : formatLargeNumber(spread.spread)}</span>
  ) : (
    <span className="text-slate-500">–</span>
  );

const flipColumns = ({ data }: Loaded, openBook: (shardId: string) => void): ColumnDef<FlipRow>[] => [
  {
    id: "name",
    label: "Shard",
    align: "left",
    alwaysVisible: true,
    sortValue: (row) => data.shards[row.shardId]?.name ?? "",
    render: (row) => <ShardName data={data} shardId={row.shardId} onOpen={openBook} />,
  },
  {
    id: "buyOrder",
    label: "Buy at",
    title: "Highest buy order: where your buy order goes",
    sortValue: (row) => row.buyOrder,
    render: (row) => <span className="text-slate-300">{formatLargeNumber(row.buyOrder)}</span>,
  },
  {
    id: "sellOffer",
    label: "Sell at",
    title: "Cheapest sell offer: where your sell offer goes",
    sortValue: (row) => row.sellOffer,
    render: (row) => <span className="text-slate-300">{formatLargeNumber(row.sellOffer)}</span>,
  },
  {
    id: "spread",
    label: "Spread",
    title: "Sell at minus buy at",
    sortValue: (row) => row.spread,
    render: (row) => <SpreadValue spread={row} />,
  },
  {
    id: "spreadPercent",
    label: "Spread %",
    title: "Spread as a share of the buy price",
    sortValue: (row) => row.percent,
    render: (row) => <SpreadValue spread={row} percent />,
  },
  {
    id: "profit",
    label: "Profit",
    title: "Per shard: sell price after tax minus buy price",
    sortValue: (row) => row.profit,
    render: (row) => <span className={`font-medium ${coinClass(row.profit)}`}>{formatLargeNumber(row.profit)}</span>,
  },
  {
    id: "volume",
    label: "Volume/h",
    title: "Shards per hour on the slower side: buy orders fill with instant sells, sell offers with instant buys (7-day average)",
    sortValue: (row) => row.volume,
    render: (row) => <span className="text-slate-400">{formatLargeNumber(row.volume)}</span>,
  },
  {
    id: "flipsPerHour",
    label: "Max/h",
    title: "Shards per hour you can flip at your market share",
    sortValue: (row) => row.flipsPerHour,
    render: (row) => <span className="text-slate-300">{formatQuantity(row.flipsPerHour)}</span>,
  },
  {
    id: "profitPerHour",
    label: "Profit/h",
    title: "Profit × Max/h",
    sortValue: (row) => row.profitPerHour,
    render: (row) => <span className="font-medium text-green-400">{formatLargeNumber(row.profitPerHour)}</span>,
  },
  {
    id: "tenPercentOffer",
    label: "10% offer",
    title: 'The in-game "10% of spread" sell offer: the cheapest sell offer minus a tenth of the spread. Undercuts the others, so it fills sooner.',
    sortValue: (row) => row.tenPercentOffer,
    render: (row) => <span className="text-slate-300">{formatLargeNumber(row.tenPercentOffer)}</span>,
  },
  {
    id: "tenPercentProfit",
    label: "Profit 10%",
    title: 'Profit per shard when selling with the "10% of spread" offer, after tax',
    sortValue: (row) => row.tenPercentProfit,
    render: (row) => <span className={coinClass(row.tenPercentProfit)}>{formatLargeNumber(row.tenPercentProfit)}</span>,
  },
  {
    id: "tenPercentProfitPerHour",
    label: "Profit/h 10%",
    title: "Profit 10% × Max/h",
    sortValue: (row) => row.tenPercentProfitPerHour,
    render: (row) => <span className="text-slate-300">{formatLargeNumber(row.tenPercentProfitPerHour)}</span>,
  },
  {
    id: "buyOrderCount",
    label: "Buy orders",
    title: "Buy orders already listed: who you compete with when buying",
    sortValue: (row) => row.buyOrderCount,
    render: (row) => <span className="text-slate-300">{row.buyOrderCount}</span>,
  },
  {
    id: "sellOfferCount",
    label: "Sell offers",
    title: "Sell offers already listed: who you compete with when selling",
    sortValue: (row) => row.sellOfferCount,
    render: (row) => <span className="text-slate-300">{row.sellOfferCount}</span>,
  },
  {
    id: "fillHours",
    label: "Fill time",
    title: "Time for an hour's worth to go through both queues at the best prices: first your buy order, then your sell offer",
    sortValue: (row) => sortableHours(row.fillHours),
    render: (row) => <FillTime hours={row.fillHours} />,
  },
];

/** The two inputs of a fusion, with the farmed one marked. */
const FarmedInputs = ({ data, row, openBook }: { data: Data; row: FarmFusionRow; openBook: (shardId: string) => void }) => (
  <span className="inline-flex items-center gap-2">
    {row.inputs.map((shardId, index) => (
      <span key={index} className="inline-flex items-center gap-2">
        {index === 1 && <span className="text-slate-500">+</span>}
        <span className="inline-flex items-center gap-1">
          <ShardName data={data} shardId={shardId} amount={row.inputAmounts[index]} onOpen={openBook} />
          {shardId === row.farmedId && (
            <span title="You farm this one">
              <Pickaxe className="w-3.5 h-3.5 text-emerald-400" />
            </span>
          )}
        </span>
      </span>
    ))}
  </span>
);

const farmFusionColumns = ({ data }: Loaded, openBook: (shardId: string) => void): ColumnDef<FarmFusionRow>[] => [
  {
    id: "inputs",
    label: "Inputs",
    align: "left",
    alwaysVisible: true,
    render: (row) => <FarmedInputs data={data} row={row} openBook={openBook} />,
  },
  {
    id: "output",
    label: "Result",
    align: "left",
    alwaysVisible: true,
    sortValue: (row) => data.shards[row.outputId]?.name ?? "",
    render: (row) => <ShardName data={data} shardId={row.outputId} amount={row.outputQuantity} onOpen={openBook} />,
  },
  {
    id: "farmRate",
    label: "Farm/h",
    title: "Your farming rate of the marked shard",
    sortValue: (row) => row.farmRate,
    render: (row) => <span className="text-slate-300">{formatQuantity(row.farmRate)}</span>,
  },
  {
    id: "sellValue",
    label: "Sell value",
    title: "What the farmed shards of one fusion would sell for instead, after tax",
    sortValue: (row) => row.sellValue,
    render: (row) => <span className="text-slate-300">{formatLargeNumber(row.sellValue)}</span>,
  },
  {
    id: "boughtCost",
    label: "Buy cost",
    title: "Coins to buy the other input of one fusion",
    sortValue: (row) => row.boughtCost,
    render: (row) => <span className="text-slate-300">{formatLargeNumber(row.boughtCost)}</span>,
  },
  {
    id: "revenue",
    label: "Value",
    title: "What the result of one fusion sells for, after tax",
    sortValue: (row) => row.revenue,
    render: (row) => <span className="text-slate-300">{formatLargeNumber(row.revenue)}</span>,
  },
  {
    id: "gain",
    label: "Gain",
    title: "Per fusion: value minus sell value minus buy cost. Positive means fusing beats selling the farmed shards.",
    sortValue: (row) => row.gain,
    render: (row) => <span className={`font-medium ${coinClass(row.gain)}`}>{formatLargeNumber(row.gain)}</span>,
  },
  {
    id: "volume",
    label: "Volume/h",
    title: "Hourly Bazaar volume of the least traded of the bought input and the result",
    sortValue: (row) => row.volume,
    render: (row) => <span className="text-slate-400">{formatLargeNumber(row.volume)}</span>,
  },
  {
    id: "fusionsPerHour",
    label: "Fusions/h",
    title: "Limited by your farming rate and by the market for the bought input and the result",
    sortValue: (row) => row.fusionsPerHour,
    render: (row) => <span className="text-slate-300">{formatQuantity(row.fusionsPerHour)}</span>,
  },
  {
    id: "gainPerHour",
    label: "Gain/h",
    title: "Gain × Fusions/h: extra coins per hour compared with selling what you farm",
    sortValue: (row) => row.gainPerHour,
    render: (row) => (
      <span className={`font-medium ${row.gainPerHour > 0 ? "text-green-400" : coinClass(row.gainPerHour)}`}>{formatLargeNumber(row.gainPerHour)}</span>
    ),
  },
];

type TableId = "farming" | "fusions" | "flips" | "farmFusions";

const TABS: { id: TableId; label: string; icon: LucideIcon }[] = [
  { id: "farming", label: "Farming", icon: Pickaxe },
  { id: "fusions", label: "Fusions", icon: Hammer },
  { id: "flips", label: "Flips", icon: Repeat },
  { id: "farmFusions", label: "Fuse your farm", icon: Sprout },
];

/** The tabs on the left; `extra` (the Columns menu) on the right of the same row. */
const TabBar = ({ active, onChange, extra }: { active: TableId; onChange: (tab: TableId) => void; extra?: ReactNode }) => (
  <div className="flex flex-wrap items-center justify-between gap-2">
    <div className="flex flex-wrap gap-2" role="tablist">
      {TABS.map(({ id, label, icon: Icon }) => (
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

// ─── Order book ───

/** One side of an order book, with a running total so you can see how deep each price goes. */
const OrderSide = ({ title, hint, levels }: { title: string; hint: string; levels: OrderLevel[] }) => {
  let total = 0;
  const amount = levels.reduce((sum, level) => sum + level.amount, 0);
  return (
    <div className="min-w-0 space-y-1">
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-slate-400">{hint}</p>
        <p className="text-xs text-slate-300">
          {countOrders(levels)} orders, {amount.toLocaleString()} shards
        </p>
      </div>
      {levels.length === 0 ? (
        <p className="text-sm text-slate-500 py-4">No orders.</p>
      ) : (
        <div className="overflow-y-auto max-h-[50vh]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-700 text-slate-400">
              <tr>
                <th className="px-2 py-1.5 text-right font-medium">Price</th>
                <th className="px-2 py-1.5 text-right font-medium">Amount</th>
                <th className="px-2 py-1.5 text-right font-medium" title="Number of orders at this price">
                  Orders
                </th>
                <th className="px-2 py-1.5 text-right font-medium" title="Amount at this price or better">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {levels.map((level) => {
                total += level.amount;
                return (
                  <tr key={level.price} className="border-b border-slate-700/50">
                    <td className="px-2 py-1 text-right text-slate-200">{formatLargeNumber(level.price)}</td>
                    <td className="px-2 py-1 text-right text-slate-300">{level.amount.toLocaleString()}</td>
                    <td className="px-2 py-1 text-right text-slate-400">{level.orders}</td>
                    <td className="px-2 py-1 text-right text-slate-400">{total.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const SpreadLine = ({ spread }: { spread: Spread | null }) =>
  spread && (
    <p className="text-sm text-slate-300">
      Spread: <span className="font-medium text-white">{formatLargeNumber(spread.spread)}</span> ({(spread.percent * 100).toFixed(1)}%) between the highest buy
      order ({formatLargeNumber(spread.buyOrder)}) and the cheapest sell offer ({formatLargeNumber(spread.sellOffer)}).
    </p>
  );

const OrderBookModal = ({ data, shardId, book, onClose }: { data: Data; shardId: string | null; book: OrderBook | undefined; onClose: () => void }) => {
  const navigate = useNavigate();
  const [showList, setShowList] = useState(false);
  // Clicking the shard in the heading (the second click) goes to the Shards page, showing only that shard.
  const openOnShardsPage = (id: string) => navigate(`/shards?shard=${encodeURIComponent(id)}`);
  return (
    <Modal
      open={shardId !== null}
      onClose={onClose}
      labelledBy="order-book-title"
      panelClassName="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-4 space-y-4"
    >
      {shardId && (
        <>
          <div className="flex items-center justify-between gap-2">
            <h2 id="order-book-title" className="flex items-center gap-2 text-lg font-semibold text-white">
              Order book: <ShardName data={data} shardId={shardId} onOpen={openOnShardsPage} openLabel="Open on the Shards page" />
            </h2>
            <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white cursor-pointer" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
          {book && <SpreadLine spread={getSpread(book)} />}
          {book ? (
            <>
              <DepthChart buyOrders={book.buyOrders} sellOffers={book.sellOffers} />
              <button type="button" onClick={() => setShowList((current) => !current)} className="text-xs text-emerald-300 hover:underline cursor-pointer">
                {showList ? "Hide order list" : "Show order list"}
              </button>
              {showList && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <OrderSide title="Buy orders" hint="What instant sells fill, highest first." levels={book.buyOrders} />
                  <OrderSide title="Sell offers" hint="What instant buys take, cheapest first." levels={book.sellOffers} />
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400">This shard isn't on the Bazaar.</p>
          )}
          <p className="text-xs text-slate-500">
            The Bazaar API shows the top 30 price levels per side, as of when this page loaded. Click the shard's name above to open it on the Shards page.
          </p>
        </>
      )}
    </Modal>
  );
};

// ─── Table sections ───

/**
 * A foldable card with one searchable, sortable, paged table. Farming, Fusions and Flips
 * only differ in their rows, columns and texts.
 */
const TableSection = <R,>({
  icon,
  title,
  description,
  data,
  rows,
  columns,
  allColumns,
  initialSort,
  rowKey,
  shardIdsOf,
  volumeOf,
  profitOf,
  minVolume,
  searchPlaceholder,
  emptyText,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  data: Data;
  rows: R[];
  /** Visible columns. */
  columns: ColumnDef<R>[];
  /** Every column, so sorting keeps working when the sorted column is hidden. */
  allColumns: ColumnDef<R>[];
  initialSort: string;
  rowKey: (row: R) => string;
  /** Shards the search matches against. */
  shardIdsOf: (row: R) => string[];
  /** Volume compared with the Min. volume setting. */
  volumeOf: (row: R) => number;
  /** With it, the section gets an "Only profitable" filter (on by default). */
  profitOf?: (row: R) => number;
  minVolume: number;
  searchPlaceholder: string;
  emptyText: string;
}) => {
  const [query, setQuery] = useState("");
  const [onlyProfitable, setOnlyProfitable] = useState(true);
  const { sort, toggle } = useSort(initialSort);
  const lowerQuery = query.trim().toLowerCase();
  const filterProfit = profitOf !== undefined && onlyProfitable;
  const { limit, showMore, showLess } = usePaging(`${lowerQuery}|${filterProfit}|${minVolume}|${sort.column}|${sort.direction}`);

  const filtered = useMemo(
    () =>
      sortRows(
        rows.filter((row) => (!filterProfit || profitOf(row) > 0) && volumeOf(row) >= minVolume && matchesQuery(data, shardIdsOf(row), lowerQuery)),
        sort,
        allColumns,
      ),
    [rows, data, lowerQuery, filterProfit, profitOf, volumeOf, shardIdsOf, minVolume, sort, allColumns],
  );
  const shown = filtered.slice(0, limit);

  return (
    <Section
      icon={icon}
      title={title}
      description={description}
      actions={
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {profitOf && (
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={onlyProfitable} onChange={(e) => setOnlyProfitable(e.target.checked)} className="accent-emerald-500" />
              Only profitable
            </label>
          )}
          <SearchBox value={query} onChange={setQuery} placeholder={searchPlaceholder} />
        </div>
      }
    >
      <DataTable columns={columns} rows={shown} rowKey={rowKey} sort={sort} onSort={toggle} emptyText={emptyText} />
      <ShowMoreFooter shown={shown.length} total={filtered.length} onShowMore={showMore} onShowLess={showLess} />
    </Section>
  );
};

// Row accessors for the sections. Module-level, so they keep their identity between renders.
const farmingKey = (row: FarmingRow) => row.shardId;
const farmingShards = (row: FarmingRow) => [row.shardId];
const fusionKey = (row: FusionRow) => `${row.outputId}|${row.inputs[0]}|${row.inputs[1]}|${row.outputQuantity}`;
const fusionShards = (row: FusionRow) => [row.outputId, ...row.inputs];
const flipKey = (row: FlipRow) => row.shardId;
const flipShards = (row: FlipRow) => [row.shardId];
const farmFusionKey = (row: FarmFusionRow) => `${row.outputId}|${row.inputs[0]}|${row.inputs[1]}|${row.outputQuantity}|${row.farmedId}`;
const farmFusionShards = (row: FarmFusionRow) => [row.outputId, ...row.inputs];
const farmFusionGain = (row: FarmFusionRow) => row.gain;
const rowVolume = (row: { volume: number }) => row.volume;
const rowProfit = (row: { profit: number }) => row.profit;

// ─── Page ───

export const ProfitPage = () => {
  const { form } = useCalculatorState();
  const { customRates } = useCustomRates();
  const [settings, setSettings] = useState<ProfitSettings>(loadSettings);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookShardId, setBookShardId] = useState<string | null>(null);
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
      const [data, bazaarBuy, bazaarSell, volumes, orderBooks] = await Promise.all([
        CalculationService.getInstance().parseData(params),
        dataService.loadShardCosts(buyFromOffers),
        dataService.loadShardCosts(sellToOffers),
        dataService.loadShardVolumes(),
        dataService.loadShardOrderBooks(),
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
          orderBooks,
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

  const marketSettings: MarketSettings = useMemo(
    () => ({ buyMode, sellMode, taxPercent: settings.taxPercent, marketShare: settings.marketSharePercent / 100 }),
    [buyMode, sellMode, settings.taxPercent, settings.marketSharePercent],
  );
  // Only the active tab's rows are worked out: the fusion tables hold well over 100,000 rows.
  const tab = settings.activeTab;
  const farmingRows = useMemo(() => (loaded && tab === "farming" ? getFarmingRows(loaded.data, loaded, marketSettings) : []), [loaded, marketSettings, tab]);
  const fusionRows = useMemo(
    () => (loaded && tab === "fusions" ? getFusionRows(loaded.data, loaded, marketSettings, loaded.crocodileMultiplier) : []),
    [loaded, marketSettings, tab],
  );
  const flipRows = useMemo(() => (loaded && tab === "flips" ? getFlipRows(loaded, marketSettings) : []), [loaded, marketSettings, tab]);
  const farmFusionRows = useMemo(
    () => (loaded && tab === "farmFusions" ? getFarmFusionRows(loaded.data, loaded, marketSettings, loaded.crocodileMultiplier) : []),
    [loaded, marketSettings, tab],
  );

  // setBookShardId is stable, so the column definitions only rebuild when the data does.
  const allFarmingColumns = useMemo(() => (loaded ? farmingColumns(loaded, setBookShardId) : []), [loaded]);
  const allFusionColumns = useMemo(() => (loaded ? fusionColumns(loaded, setBookShardId) : []), [loaded]);
  const allFlipColumns = useMemo(() => (loaded ? flipColumns(loaded, setBookShardId) : []), [loaded]);
  const allFarmFusionColumns = useMemo(() => (loaded ? farmFusionColumns(loaded, setBookShardId) : []), [loaded]);
  const shownFarmingColumns = useMemo(() => visibleColumns(allFarmingColumns, "farming", settings.hiddenColumns), [allFarmingColumns, settings.hiddenColumns]);
  const shownFusionColumns = useMemo(() => visibleColumns(allFusionColumns, "fusions", settings.hiddenColumns), [allFusionColumns, settings.hiddenColumns]);
  const shownFlipColumns = useMemo(() => visibleColumns(allFlipColumns, "flips", settings.hiddenColumns), [allFlipColumns, settings.hiddenColumns]);
  const shownFarmFusionColumns = useMemo(
    () => visibleColumns(allFarmFusionColumns, "farmFusions", settings.hiddenColumns),
    [allFarmFusionColumns, settings.hiddenColumns],
  );

  const overrideCount = loaded ? new Set([...loaded.buyOverrides, ...loaded.sellOverrides]).size : 0;
  const pickerColumns: Record<TableId, ColumnDef<never>[]> = {
    farming: allFarmingColumns,
    fusions: allFusionColumns,
    flips: allFlipColumns,
    farmFusions: allFarmFusionColumns,
  };

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
          <div className="space-y-2 text-sm text-slate-400">
            <p>
              Find the best way to turn shards into coins: farm and sell them, fuse them, flip them on the Bazaar, or fuse the shards you farm. Rates use your
              Hunting Fortune, pets and custom rates from the{" "}
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
                  , with <span className="text-amber-300">{overrideCount} of your price overrides*</span> from the Shards page
                </>
              )}
              ; volumes are 7-day Bazaar averages.
            </p>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300">How to use</h2>
              <ul className="mt-1 grid gap-x-6 gap-y-0.5 md:grid-cols-2 list-disc pl-5 text-xs">
                <li>Pick a tab: Farming, Fusions, Flips or Fuse your farm.</li>
                <li>Hover a shard to see its description and how to hunt it.</li>
                <li>Click a shard&apos;s name to open its order book as a depth chart.</li>
                <li>In the order book, click the name again to open the shard on the Shards page, e.g. to set your own price.</li>
                <li>Click a column header to sort, click it again to flip the order. Hover it to see what it means.</li>
                <li>Use Columns (next to the tabs) to choose which statistics the current tab shows.</li>
                <li>Search by shard name; &quot;Only profitable&quot; hides trades that lose coins.</li>
                <li>Hover a setting below for an explanation. All settings are remembered in this browser.</li>
              </ul>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
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
            </div>
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
            </div>
          </div>
        </div>

        {error && <p className="text-center text-red-400 py-6">{error}</p>}
        {!error && !loaded && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}
        {loaded && (
          <>
            <TabBar
              active={tab}
              onChange={(activeTab) => update({ activeTab })}
              extra={
                <ColumnPicker
                  groups={[{ table: tab, label: TABS.find((item) => item.id === tab)?.label ?? "", columns: pickerColumns[tab] }]}
                  hidden={settings.hiddenColumns}
                  onChange={(hiddenColumns) => update({ hiddenColumns })}
                />
              }
            />
            {tab === "farming" && (
              <TableSection
                icon={<Pickaxe className="w-5 h-5 text-emerald-400" />}
                title="Farming"
                description="Shards you can hunt directly, with your rate from the calculator settings. Realistic/h only counts what the Bazaar takes at your market share; Real/h also prices it from the order book."
                data={loaded.data}
                rows={farmingRows}
                columns={shownFarmingColumns}
                allColumns={allFarmingColumns}
                initialSort="realCoinsPerHour"
                rowKey={farmingKey}
                shardIdsOf={farmingShards}
                volumeOf={rowVolume}
                minVolume={settings.minVolume}
                searchPlaceholder="Search shards..."
                emptyText="No shards found."
              />
            )}
            {tab === "fusions" && (
              <TableSection
                icon={<Hammer className="w-5 h-5 text-emerald-400" />}
                title="Fusions"
                description="Buy the inputs, fuse, sell the result. Profit is per fusion after tax; Max/h is how many fusions the Bazaar volume allows at your market share. The Real columns price an hour's worth from the order book."
                data={loaded.data}
                rows={fusionRows}
                columns={shownFusionColumns}
                allColumns={allFusionColumns}
                initialSort="realProfitPerHour"
                rowKey={fusionKey}
                shardIdsOf={fusionShards}
                volumeOf={rowVolume}
                profitOf={rowProfit}
                minVolume={settings.minVolume}
                searchPlaceholder="Search input or result..."
                emptyText="No fusions found."
              />
            )}
            {tab === "flips" && (
              <TableSection
                icon={<Repeat className="w-5 h-5 text-emerald-400" />}
                title="Flips"
                description="Buy with a buy order at the highest buy order, sell with a sell offer at the cheapest sell offer. Profit is per shard after tax; works for every shard on the Bazaar, farmable or not."
                data={loaded.data}
                rows={flipRows}
                columns={shownFlipColumns}
                allColumns={allFlipColumns}
                initialSort="profitPerHour"
                rowKey={flipKey}
                shardIdsOf={flipShards}
                volumeOf={rowVolume}
                profitOf={rowProfit}
                minVolume={settings.minVolume}
                searchPlaceholder="Search shards..."
                emptyText="No flips found."
              />
            )}
            {tab === "farmFusions" && (
              <TableSection
                icon={<Sprout className="w-5 h-5 text-emerald-400" />}
                title="Fuse your farm"
                description="Fuse the shards you farm (marked) instead of selling them, buying the other input. Gain compares it with selling the farmed shards; Fusions/h is limited by your farming rate and the market."
                data={loaded.data}
                rows={farmFusionRows}
                columns={shownFarmFusionColumns}
                allColumns={allFarmFusionColumns}
                initialSort="gainPerHour"
                rowKey={farmFusionKey}
                shardIdsOf={farmFusionShards}
                volumeOf={rowVolume}
                profitOf={farmFusionGain}
                minVolume={settings.minVolume}
                searchPlaceholder="Search input or result..."
                emptyText="No fusions found."
              />
            )}
          </>
        )}
        {loaded && (
          <OrderBookModal
            data={loaded.data}
            shardId={bookShardId}
            book={bookShardId ? loaded.orderBooks[bookShardId] : undefined}
            onClose={() => setBookShardId(null)}
          />
        )}
      </div>
    </div>
  );
};
