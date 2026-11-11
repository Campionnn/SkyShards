import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Coins, Hammer, Pickaxe, ArrowDown, ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useCalculatorState, useCustomRates } from "../hooks";
import { CalculationService, DataService, buildCalculationParams, getFarmingRows, getFusionRows, type FarmingRow, type FusionRow } from "../services";
import { calculateMultipliers } from "../services/fusionMath";
import { formatLargeNumber, formatQuantity, getRarityColor, shardIconUrl } from "../utilities";
import type { Data } from "../types/types";

type BuyMode = "instant" | "order";
type SellMode = "instant" | "offer";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 50;
/** Hypixel's base Bazaar tax; editable on the page. */
const DEFAULT_TAX_PERCENT = 1.25;

interface Loaded {
  data: Data;
  buyPrices: Record<string, number>;
  sellPrices: Record<string, number>;
  crocodileMultiplier: number;
}

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

interface SortHeaderProps {
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}

/** A sortable column header; clicking the active column flips the direction. */
const SortHeader = ({ active, direction, onClick, children, align = "right" }: SortHeaderProps & { children: ReactNode; align?: "left" | "right" }) => {
  const Arrow = direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={`px-3 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
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
    className="w-full sm:w-64 px-3 py-2 text-sm bg-slate-700/50 border border-slate-600/50 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
  />
);

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
  <section className="bg-slate-800 border border-slate-600 rounded-md p-3 space-y-3">
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

const coinClass = (value: number) => (value > 0 ? "text-green-400" : value < 0 ? "text-red-400" : "text-slate-300");

type FarmingColumn = "name" | "rate" | "price" | "coinsPerHour";

const FarmingTable = ({ data, rows }: { data: Data; rows: FarmingRow[] }) => {
  const [query, setQuery] = useState("");
  const { sort, header } = useSort<FarmingColumn>("coinsPerHour");
  const lowerQuery = query.trim().toLowerCase();

  const shown = useMemo(
    () =>
      sortRows(
        rows.filter((row) => matchesQuery(data, [row.shardId], lowerQuery)),
        sort,
        (row, column) => (column === "name" ? (data.shards[row.shardId]?.name ?? "") : row[column]),
      ),
    [rows, data, lowerQuery, sort],
  );

  return (
    <Section
      icon={<Pickaxe className="w-5 h-5 text-emerald-400" />}
      title="Farming"
      description="Shards you can hunt directly, with your rate per hour from the calculator settings and what they sell for."
      actions={<SearchBox value={query} onChange={setQuery} placeholder="Search shards..." />}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-700">
            <tr>
              <SortHeader {...header("name")} align="left">
                Shard
              </SortHeader>
              <SortHeader {...header("rate")}>Rate/h</SortHeader>
              <SortHeader {...header("price")}>Price/shard</SortHeader>
              <SortHeader {...header("coinsPerHour")}>Coins/h</SortHeader>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.shardId} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="px-3 py-1.5">
                  <ShardName data={data} shardId={row.shardId} />
                </td>
                <td className="px-3 py-1.5 text-right text-slate-300">{formatQuantity(row.rate)}</td>
                <td className="px-3 py-1.5 text-right text-slate-300">{formatLargeNumber(row.price)}</td>
                <td className="px-3 py-1.5 text-right font-medium text-green-400">{formatLargeNumber(row.coinsPerHour)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="text-center text-slate-500 py-6">No shards found.</p>}
      </div>
    </Section>
  );
};

type FusionColumn = "output" | "cost" | "revenue" | "profit" | "margin";

const FusionTable = ({ data, rows }: { data: Data; rows: FusionRow[] }) => {
  const [query, setQuery] = useState("");
  const [onlyProfitable, setOnlyProfitable] = useState(true);
  const { sort, header } = useSort<FusionColumn>("profit");
  const lowerQuery = query.trim().toLowerCase();
  // "Show more" counts per filter and sort, so changing either starts again at the first page.
  const pageKey = `${lowerQuery}|${onlyProfitable}|${sort.column}|${sort.direction}`;
  const [paging, setPaging] = useState({ key: pageKey, limit: PAGE_SIZE });
  const limit = paging.key === pageKey ? paging.limit : PAGE_SIZE;

  const filtered = useMemo(
    () =>
      sortRows(
        rows.filter((row) => (!onlyProfitable || row.profit > 0) && matchesQuery(data, [row.outputId, ...row.inputs], lowerQuery)),
        sort,
        (row, column) => (column === "output" ? (data.shards[row.outputId]?.name ?? "") : row[column]),
      ),
    [rows, data, lowerQuery, onlyProfitable, sort],
  );
  const shown = filtered.slice(0, limit);

  return (
    <Section
      icon={<Hammer className="w-5 h-5 text-emerald-400" />}
      title="Fusions"
      description="Buy the inputs, fuse once, sell the result. Profit is per fusion, after Bazaar tax on the sale."
      actions={
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input type="checkbox" checked={onlyProfitable} onChange={(e) => setOnlyProfitable(e.target.checked)} className="accent-emerald-500" />
            Only profitable
          </label>
          <SearchBox value={query} onChange={setQuery} placeholder="Search input or result..." />
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-700">
            <tr>
              <th className="px-3 py-2 font-medium text-left text-slate-400">Inputs</th>
              <SortHeader {...header("output")} align="left">
                Result
              </SortHeader>
              <SortHeader {...header("cost")}>Cost</SortHeader>
              <SortHeader {...header("revenue")}>Value</SortHeader>
              <SortHeader {...header("profit")}>Profit</SortHeader>
              <SortHeader {...header("margin")}>Margin</SortHeader>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr
                key={`${row.outputId}|${row.inputs[0]}|${row.inputs[1]}|${row.outputQuantity}`}
                className="border-b border-slate-700/50 hover:bg-slate-700/30"
              >
                <td className="px-3 py-1.5">
                  <span className="inline-flex items-center gap-2">
                    <ShardName data={data} shardId={row.inputs[0]} amount={row.inputAmounts[0]} />
                    <span className="text-slate-500">+</span>
                    <ShardName data={data} shardId={row.inputs[1]} amount={row.inputAmounts[1]} />
                  </span>
                </td>
                <td className="px-3 py-1.5">
                  <ShardName data={data} shardId={row.outputId} amount={row.outputQuantity} />
                </td>
                <td className="px-3 py-1.5 text-right text-slate-300">{formatLargeNumber(row.cost)}</td>
                <td className="px-3 py-1.5 text-right text-slate-300">{formatLargeNumber(row.revenue)}</td>
                <td className={`px-3 py-1.5 text-right font-medium ${coinClass(row.profit)}`}>{formatLargeNumber(row.profit)}</td>
                <td className={`px-3 py-1.5 text-right ${coinClass(row.margin)}`}>{(row.margin * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-slate-500 py-6">No fusions found.</p>}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          Showing {shown.length} of {filtered.length}
        </span>
        {shown.length < filtered.length && (
          <button
            type="button"
            onClick={() => setPaging({ key: pageKey, limit: limit + PAGE_SIZE })}
            className="px-3 py-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 cursor-pointer"
          >
            Show {Math.min(PAGE_SIZE, filtered.length - shown.length)} more
          </button>
        )}
      </div>
    </Section>
  );
};

export const ProfitPage = () => {
  const { form } = useCalculatorState();
  const { customRates } = useCustomRates();
  const [buyMode, setBuyMode] = useState<BuyMode>(form.instantBuyPrices ? "instant" : "order");
  const [sellMode, setSellMode] = useState<SellMode>("instant");
  const [taxPercent, setTaxPercent] = useState(DEFAULT_TAX_PERCENT);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const [data, buyPrices, sellPrices] = await Promise.all([
        CalculationService.getInstance().parseData(params),
        dataService.loadShardCosts(buyMode === "instant"),
        dataService.loadShardCosts(sellMode === "offer"),
      ]);
      if (!cancelled) setLoaded({ data, buyPrices, sellPrices, crocodileMultiplier: calculateMultipliers(params).crocodileMultiplier });
    })().catch((loadError: unknown) => {
      console.error(loadError);
      if (!cancelled) setError("Could not load shard data or Bazaar prices. Please try again later.");
    });
    return () => {
      cancelled = true;
    };
  }, [form, customRates, buyMode, sellMode]);

  const farmingRows = useMemo(() => (loaded ? getFarmingRows(loaded.data, loaded.sellPrices, taxPercent) : []), [loaded, taxPercent]);
  const fusionRows = useMemo(
    () => (loaded ? getFusionRows(loaded.data, loaded.buyPrices, loaded.sellPrices, taxPercent, loaded.crocodileMultiplier) : []),
    [loaded, taxPercent],
  );

  return (
    <div className="min-h-screen px-2 sm:px-4 py-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="bg-slate-800 border border-slate-600 rounded-md p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-semibold text-white">Profits</h1>
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
            pages. Prices are live from the Bazaar.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Segmented<BuyMode>
              label="Buy inputs via"
              value={buyMode}
              onChange={setBuyMode}
              options={[
                ["instant", "Instant buy"],
                ["order", "Buy order"],
              ]}
            />
            <Segmented<SellMode>
              label="Sell via"
              value={sellMode}
              onChange={setSellMode}
              options={[
                ["instant", "Instant sell"],
                ["offer", "Sell offer"],
              ]}
            />
            <label className="flex items-center gap-2 text-xs text-slate-400">
              Bazaar tax
              <input
                type="number"
                min={0}
                max={100}
                step={0.125}
                value={taxPercent}
                onChange={(e) => setTaxPercent(Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : 0)}
                className="w-20 px-2 py-1 bg-slate-700/50 border border-slate-600/50 rounded-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              %
            </label>
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
            <FarmingTable data={loaded.data} rows={farmingRows} />
            <FusionTable data={loaded.data} rows={fusionRows} />
          </>
        )}
      </div>
    </div>
  );
};
