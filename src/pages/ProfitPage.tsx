import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Coins, Coffee, Hammer, Pickaxe, ArrowDown, ArrowUp, ChevronDown, ChevronRight } from "lucide-react";
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

interface SortHeaderProps {
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}

/** A sortable column header; clicking the active column flips the direction. */
const SortHeader = ({
  active,
  direction,
  onClick,
  children,
  align = "right",
  title,
}: SortHeaderProps & { children: ReactNode; align?: "left" | "right"; title?: string }) => {
  const Arrow = direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={`px-2 py-2 font-medium whitespace-nowrap ${align === "right" ? "text-right" : "text-left"}`} title={title}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 cursor-pointer hover:text-white ${active ? "text-emerald-300" : "text-slate-400"}`}
      >
        {children}
        {active && <Arrow className="w-3 h-3" />}
      </button>
    </th>
  );
};

/** Sort state plus `header(column)`, the props for that column's SortHeader. New columns start descending. */
const useSort = <C extends string>(initial: C) => {
  const [sort, setSort] = useState<{ column: C; direction: SortDirection }>({ column: initial, direction: "desc" });
  const header = (column: C): SortHeaderProps => ({
    active: sort.column === column,
    direction: sort.direction,
    onClick: () => setSort((current) => ({ column, direction: current.column === column && current.direction === "desc" ? "asc" : "desc" })),
  });
  return { sort, header };
};

const sortRows = <T, C extends string>(rows: T[], sort: { column: C; direction: SortDirection }, valueOf: (row: T, column: C) => number | string) => {
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = valueOf(a, sort.column);
    const vb = valueOf(b, sort.column);
    return (typeof va === "string" ? va.localeCompare(vb as string) : va - (vb as number)) * factor;
  });
};

const matchesQuery = (data: Data, shardIds: string[], query: string) => !query || shardIds.some((id) => data.shards[id]?.name.toLowerCase().includes(query));

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

const coinClass = (value: number) => (value > 0 ? "text-green-400" : value < 0 ? "text-red-400" : "text-slate-300");

// Both tables share one fixed row height, so rows line up whatever the cells contain.
const rowClass = "h-10 border-b border-slate-700/50 hover:bg-slate-700/30";
const nameCell = "px-2 py-1.5 align-middle whitespace-nowrap";
const cell = "px-2 py-1.5 align-middle text-right whitespace-nowrap";

/**
 * Shows PAGE_SIZE rows, plus PAGE_SIZE more per "Show more" click. The count belongs to
 * `resetKey` (filters and sort), so changing any of them starts again at the first page.
 */
const usePaging = (resetKey: string) => {
  const [paging, setPaging] = useState({ key: resetKey, limit: PAGE_SIZE });
  const limit = paging.key === resetKey ? paging.limit : PAGE_SIZE;
  return { limit, showMore: () => setPaging({ key: resetKey, limit: limit + PAGE_SIZE }) };
};

const ShowMoreFooter = ({ shown, total, onShowMore }: { shown: number; total: number; onShowMore: () => void }) => (
  <div className="flex items-center justify-between text-xs text-slate-400">
    <span>
      Showing {shown} of {total}
    </span>
    {shown < total && (
      <button
        type="button"
        onClick={onShowMore}
        className="px-3 py-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 cursor-pointer"
      >
        Show {Math.min(PAGE_SIZE, total - shown)} more
      </button>
    )}
  </div>
);

// ─── Farming ───

type FarmingColumn = "name" | "rate" | "price" | "volume" | "coinsPerHour" | "realisticCoinsPerHour";

const FarmingTable = ({
  loaded,
  rows,
  minVolume,
  open,
  onToggle,
}: {
  loaded: Loaded;
  rows: FarmingRow[];
  minVolume: number;
  open: boolean;
  onToggle: () => void;
}) => {
  const { data, sellOverrides } = loaded;
  const [query, setQuery] = useState("");
  const { sort, header } = useSort<FarmingColumn>("realisticCoinsPerHour");
  const lowerQuery = query.trim().toLowerCase();
  const { limit, showMore } = usePaging(`${lowerQuery}|${minVolume}|${sort.column}|${sort.direction}`);

  const filtered = useMemo(
    () =>
      sortRows(
        rows.filter((row) => row.volume >= minVolume && matchesQuery(data, [row.shardId], lowerQuery)),
        sort,
        (row, column) => (column === "name" ? (data.shards[row.shardId]?.name ?? "") : row[column]),
      ),
    [rows, data, minVolume, lowerQuery, sort],
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-700">
            <tr>
              <SortHeader {...header("name")} align="left">
                Shard
              </SortHeader>
              <SortHeader {...header("rate")} title="Shards you hunt per hour">
                Rate/h
              </SortHeader>
              <SortHeader {...header("price")} title="Sale price per shard, before tax">
                Price
              </SortHeader>
              <SortHeader {...header("volume")} title="Shards the Bazaar takes per hour on your selling side (7-day average)">
                Volume/h
              </SortHeader>
              <SortHeader {...header("coinsPerHour")} title="Rate × price after tax, ignoring market volume">
                Coins/h
              </SortHeader>
              <SortHeader {...header("realisticCoinsPerHour")} title="Coins/h, selling at most your market share of the volume">
                Realistic/h
              </SortHeader>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.shardId} className={rowClass}>
                <td className={nameCell}>
                  <ShardName data={data} shardId={row.shardId} />
                </td>
                <td className={`${cell} text-slate-300`}>{formatQuantity(row.rate)}</td>
                <td className={`${cell} text-slate-300`}>
                  <Price value={row.price} overridden={sellOverrides.has(row.shardId)} />
                </td>
                <td className={`${cell} text-slate-400`}>{formatLargeNumber(row.volume)}</td>
                <td className={`${cell} text-slate-300`}>{formatLargeNumber(row.coinsPerHour)}</td>
                <td className={`${cell} font-medium text-green-400`}>{formatLargeNumber(row.realisticCoinsPerHour)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-slate-500 py-6">No shards found.</p>}
      </div>
      <ShowMoreFooter shown={shown.length} total={filtered.length} onShowMore={showMore} />
    </Section>
  );
};

// ─── Fusions ───

type FusionColumn = "output" | "cost" | "profit" | "margin" | "volume" | "fusionsPerHour" | "profitPerHour";

const FusionTable = ({
  loaded,
  rows,
  minVolume,
  open,
  onToggle,
}: {
  loaded: Loaded;
  rows: FusionRow[];
  minVolume: number;
  open: boolean;
  onToggle: () => void;
}) => {
  const { data, buyOverrides, sellOverrides } = loaded;
  const [query, setQuery] = useState("");
  const [onlyProfitable, setOnlyProfitable] = useState(true);
  const { sort, header } = useSort<FusionColumn>("profitPerHour");
  const lowerQuery = query.trim().toLowerCase();
  const { limit, showMore } = usePaging(`${lowerQuery}|${onlyProfitable}|${minVolume}|${sort.column}|${sort.direction}`);

  const filtered = useMemo(
    () =>
      sortRows(
        rows.filter((row) => (!onlyProfitable || row.profit > 0) && row.volume >= minVolume && matchesQuery(data, [row.outputId, ...row.inputs], lowerQuery)),
        sort,
        (row, column) => (column === "output" ? (data.shards[row.outputId]?.name ?? "") : row[column]),
      ),
    [rows, data, lowerQuery, onlyProfitable, minVolume, sort],
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-700">
            <tr>
              <th className="px-2 py-2 font-medium text-left text-slate-400">Inputs</th>
              <SortHeader {...header("output")} align="left">
                Result
              </SortHeader>
              <SortHeader {...header("cost")} title="Coins to buy the inputs of one fusion">
                Cost
              </SortHeader>
              <SortHeader {...header("profit")} title="Sale value after tax minus cost, per fusion (hover a value for the sale value)">
                Profit
              </SortHeader>
              <SortHeader {...header("margin")} title="Profit as a share of the cost">
                Margin
              </SortHeader>
              <SortHeader {...header("volume")} title="Hourly Bazaar volume of the least traded shard in this fusion">
                Volume/h
              </SortHeader>
              <SortHeader {...header("fusionsPerHour")} title="Fusions per hour the market allows at your market share">
                Max/h
              </SortHeader>
              <SortHeader {...header("profitPerHour")} title="Profit × Max/h">
                Profit/h
              </SortHeader>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => {
              const overridden = buyOverrides.has(row.inputs[0]) || buyOverrides.has(row.inputs[1]) || sellOverrides.has(row.outputId);
              return (
                <tr key={`${row.outputId}|${row.inputs[0]}|${row.inputs[1]}|${row.outputQuantity}`} className={rowClass}>
                  <td className={nameCell}>
                    <span className="inline-flex items-center gap-2">
                      <ShardName data={data} shardId={row.inputs[0]} amount={row.inputAmounts[0]} />
                      <span className="text-slate-500">+</span>
                      <ShardName data={data} shardId={row.inputs[1]} amount={row.inputAmounts[1]} />
                    </span>
                  </td>
                  <td className={nameCell}>
                    <ShardName data={data} shardId={row.outputId} amount={row.outputQuantity} />
                  </td>
                  <td className={`${cell} text-slate-300`}>
                    <Price value={row.cost} overridden={buyOverrides.has(row.inputs[0]) || buyOverrides.has(row.inputs[1])} />
                  </td>
                  <td
                    className={`${cell} font-medium ${overridden ? "text-amber-300" : coinClass(row.profit)}`}
                    title={`Sells for ${formatLargeNumber(row.revenue)} after tax${overridden ? " (uses your price overrides)" : ""}`}
                  >
                    {formatLargeNumber(row.profit)}
                    {overridden && "*"}
                  </td>
                  <td className={`${cell} ${coinClass(row.margin)}`}>{(row.margin * 100).toFixed(1)}%</td>
                  <td className={`${cell} text-slate-400`}>{formatLargeNumber(row.volume)}</td>
                  <td className={`${cell} text-slate-300`}>{formatQuantity(row.fusionsPerHour)}</td>
                  <td className={`${cell} font-medium text-green-400`}>{formatLargeNumber(row.profitPerHour)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-slate-500 py-6">No fusions found.</p>}
      </div>
      <ShowMoreFooter shown={shown.length} total={filtered.length} onShowMore={showMore} />
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
              loaded={loaded}
              rows={farmingRows}
              minVolume={settings.minVolume}
              open={settings.farmingOpen}
              onToggle={() => update({ farmingOpen: !settings.farmingOpen })}
            />
            <FusionTable
              loaded={loaded}
              rows={fusionRows}
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
