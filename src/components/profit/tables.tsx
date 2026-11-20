import { Backpack, Hammer, Pickaxe, Repeat, Sprout } from "lucide-react";
import {
  getFarmFusionRows,
  getFarmingRows,
  getFlipRows,
  getFusionRows,
  getInventoryRows,
  type FarmFusionRow,
  type FarmingRow,
  type FlipRow,
  type FusionRow,
  type InventoryRow,
} from "../../services";
import { formatLargeNumber, formatQuantity } from "../../utilities";
import type { Data } from "../../types/types";
import { FarmedInputs, FillTime, Price, ShardName, SpreadValue } from "./controls";
import { coinClass } from "./styles";
import { sortableHours } from "./tableState";
import type { ColumnDef, Loaded, OpenBook, TableConfig } from "./types";

/* The five Profits tabs: their columns, rows and texts. */

// ─── Column builders ───

/** How a number column shows its value. */
const show = {
  coins: (value: number) => <span className="text-slate-300">{formatLargeNumber(value)}</span>,
  volume: (value: number) => <span className="text-slate-400">{formatLargeNumber(value)}</span>,
  quantity: (value: number) => <span className="text-slate-300">{formatQuantity(value)}</span>,
  count: (value: number) => <span className="text-slate-300">{value}</span>,
  /** Green when positive, red when negative. */
  signed: (value: number) => <span className={coinClass(value)}>{formatLargeNumber(value)}</span>,
  signedBold: (value: number) => <span className={`font-medium ${coinClass(value)}`}>{formatLargeNumber(value)}</span>,
  /** The column a table is sorted by by default. */
  best: (value: number) => <span className="font-medium text-green-400">{formatLargeNumber(value)}</span>,
};

const dash = <span className="text-slate-500">–</span>;

/** A sortable number column: `value` is both what's shown and what's sorted by. */
const numberColumn = <R,>(id: string, label: string, title: string, value: (row: R) => number, render = show.coins): ColumnDef<R> => ({
  id,
  label,
  title,
  sortValue: value,
  render: (row) => render(value(row)),
});

/** A coins column that marks values coming from the user's price overrides. */
const priceColumn = <R,>(id: string, label: string, title: string, value: (row: R) => number, overridden: (row: R) => boolean): ColumnDef<R> => ({
  id,
  label,
  title,
  sortValue: value,
  render: (row) => (
    <span className="text-slate-300">
      <Price value={value(row)} overridden={overridden(row)} />
    </span>
  ),
});

/** A fill-time column; "never" sorts last. */
const hoursColumn = <R,>(id: string, label: string, title: string, value: (row: R) => number): ColumnDef<R> => ({
  id,
  label,
  title,
  sortValue: (row) => sortableHours(value(row)),
  render: (row) => <FillTime hours={value(row)} />,
});

/** The shard a row is about (Farming, Flips, Inventory). */
const shardColumn = <R extends { shardId: string }>(data: Data, openBook: OpenBook): ColumnDef<R> => ({
  id: "name",
  label: "Shard",
  align: "left",
  alwaysVisible: true,
  sortValue: (row) => data.shards[row.shardId]?.name ?? "",
  render: (row) => <ShardName data={data} shardId={row.shardId} onOpen={openBook} />,
});

/** The result of a fusion (Fusions, Fuse your farm). */
const resultColumn = <R extends { outputId: string; outputQuantity: number }>(data: Data, openBook: OpenBook): ColumnDef<R> => ({
  id: "output",
  label: "Result",
  align: "left",
  alwaysVisible: true,
  sortValue: (row) => data.shards[row.outputId]?.name ?? "",
  render: (row) => <ShardName data={data} shardId={row.outputId} amount={row.outputQuantity} onOpen={openBook} />,
});

const TEN_PERCENT_OFFER = 'The in-game "10% of spread" sell offer: the cheapest sell offer minus a tenth of the spread';

/** Spread, Spread % and 10% offer of a row's order book (Farming, Inventory). */
const spreadColumns = <R extends { spread: FarmingRow["spread"] }>(withPercent: boolean): ColumnDef<R>[] => [
  {
    id: "spread",
    label: "Spread",
    title: "Cheapest sell offer minus highest buy order",
    sortValue: (row) => row.spread?.spread ?? 0,
    render: (row) => <SpreadValue spread={row.spread} />,
  },
  ...(withPercent
    ? [
        {
          id: "spreadPercent",
          label: "Spread %",
          title: "Spread as a share of the highest buy order",
          sortValue: (row: R) => row.spread?.percent ?? 0,
          render: (row: R) => <SpreadValue spread={row.spread} percent />,
        },
      ]
    : []),
  {
    id: "tenPercentOffer",
    label: "10% offer",
    title: TEN_PERCENT_OFFER,
    sortValue: (row) => row.spread?.tenPercentOffer ?? 0,
    render: (row) => (row.spread ? show.coins(row.spread.tenPercentOffer) : dash),
  },
];

// ─── Farming ───

const farmingColumns = ({ data, sellOverrides }: Loaded, openBook: OpenBook): ColumnDef<FarmingRow>[] => {
  const overridden = (row: FarmingRow) => sellOverrides.has(row.shardId);
  return [
    shardColumn(data, openBook),
    numberColumn("rate", "Rate/h", "Shards you hunt per hour", (row) => row.rate, show.quantity),
    priceColumn("price", "Price", "Sale price per shard, before tax", (row) => row.price, overridden),
    numberColumn("volume", "Volume/h", "Shards the Bazaar takes per hour on your selling side (7-day average)", (row) => row.volume, show.volume),
    ...spreadColumns<FarmingRow>(true),
    numberColumn("realisticCoinsPerHour", "Realistic/h", "Coins/h, selling at most your market share of the volume", (row) => row.realisticCoinsPerHour),
    priceColumn(
      "realPrice",
      "Real price",
      "Average sale price when selling an hour's worth at once, from the order book (instant sell only)",
      (row) => row.realPrice,
      overridden,
    ),
    numberColumn(
      "realCoinsPerHour",
      "Real/h",
      "Realistic/h at the real price, and at most what the order book holds",
      (row) => row.realCoinsPerHour,
      show.best,
    ),
    numberColumn(
      "coinsPerHour",
      "Max coins/h",
      "Rate × price after tax if the Bazaar bought everything you farm. Ignores market volume, so it's an upper bound.",
      (row) => row.coinsPerHour,
    ),
    numberColumn("competitors", "Competition", "Sell offers already listed: the players you compete with when selling", (row) => row.competitors, show.count),
    hoursColumn(
      "sellHours",
      "Sell time",
      "Time to sell an hour's worth: instant when selling instantly, else how long your sell offer waits behind the ones at the best price",
      (row) => row.sellHours,
    ),
  ];
};

export const farmingTable: TableConfig<FarmingRow> = {
  id: "farming",
  label: "Farming",
  icon: Pickaxe,
  description:
    "Shards you can hunt directly, with your rate from the calculator settings. Realistic/h only counts what the Bazaar takes at your market share; Real/h also prices it from the order book.",
  rows: (loaded, settings) => getFarmingRows(loaded.data, loaded, settings),
  columns: farmingColumns,
  initialSort: "realCoinsPerHour",
  rowKey: (row) => row.shardId,
  shardIdsOf: (row) => [row.shardId],
  searchPlaceholder: "Search shards...",
  emptyText: "No shards found.",
};

// ─── Fusions ───

const fusionColumns = ({ data, buyOverrides, sellOverrides }: Loaded, openBook: OpenBook): ColumnDef<FusionRow>[] => {
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
    resultColumn(data, openBook),
    priceColumn("cost", "Cost", "Coins to buy the inputs of one fusion", (row) => row.cost, inputsOverridden),
    priceColumn(
      "revenue",
      "Value",
      "What the result of one fusion sells for, after tax",
      (row) => row.revenue,
      (row) => sellOverrides.has(row.outputId),
    ),
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
    numberColumn("volume", "Volume/h", "Hourly Bazaar volume of the least traded shard in this fusion", (row) => row.volume, show.volume),
    numberColumn("fusionsPerHour", "Max/h", "Fusions per hour the market allows at your market share", (row) => row.fusionsPerHour, show.quantity),
    numberColumn("profitPerHour", "Profit/h", "Profit × Max/h", (row) => row.profitPerHour),
    numberColumn(
      "realProfit",
      "Real profit",
      "Profit per fusion when an hour's worth is bought and sold at once, at order book prices (instant trades only)",
      (row) => row.realProfit,
      show.signed,
    ),
    numberColumn("realFusionsPerHour", "Real max/h", "Max/h, also limited by how much the order books hold", (row) => row.realFusionsPerHour, show.quantity),
    numberColumn("realProfitPerHour", "Real profit/h", "Real profit × Real max/h", (row) => row.realProfitPerHour, show.best),
    hoursColumn(
      "fillHours",
      "Fill time",
      "Time until an hour's worth of orders fills, waiting behind the orders at the best price: the slowest of buying the inputs and selling the result. Instant trades don't wait.",
      (row) => row.fillHours,
    ),
  ];
};

export const fusionTable: TableConfig<FusionRow> = {
  id: "fusions",
  label: "Fusions",
  icon: Hammer,
  description:
    "Buy the inputs, fuse, sell the result. Profit is per fusion after tax; Max/h is how many fusions the Bazaar volume allows at your market share. The Real columns price an hour's worth from the order book.",
  rows: (loaded, settings) => getFusionRows(loaded.data, loaded, settings, loaded.crocodileMultiplier),
  columns: fusionColumns,
  initialSort: "realProfitPerHour",
  rowKey: (row) => `${row.outputId}|${row.inputs[0]}|${row.inputs[1]}|${row.outputQuantity}`,
  shardIdsOf: (row) => [row.outputId, ...row.inputs],
  profitOf: (row) => row.profit,
  searchPlaceholder: "Search input or result...",
  emptyText: "No fusions found.",
};

// ─── Flips ───

const flipColumns = ({ data }: Loaded, openBook: OpenBook): ColumnDef<FlipRow>[] => [
  shardColumn(data, openBook),
  numberColumn("buyOrder", "Buy at", "Highest buy order: where your buy order goes", (row) => row.buyOrder),
  numberColumn("sellOffer", "Sell at", "Cheapest sell offer: where your sell offer goes", (row) => row.sellOffer),
  { id: "spread", label: "Spread", title: "Sell at minus buy at", sortValue: (row) => row.spread, render: (row) => <SpreadValue spread={row} /> },
  {
    id: "spreadPercent",
    label: "Spread %",
    title: "Spread as a share of the buy price",
    sortValue: (row) => row.percent,
    render: (row) => <SpreadValue spread={row} percent />,
  },
  numberColumn("profit", "Profit", "Per shard: sell price after tax minus buy price", (row) => row.profit, show.signedBold),
  numberColumn(
    "volume",
    "Volume/h",
    "Shards per hour on the slower side: buy orders fill with instant sells, sell offers with instant buys (7-day average)",
    (row) => row.volume,
    show.volume,
  ),
  numberColumn("flipsPerHour", "Max/h", "Shards per hour you can flip at your market share", (row) => row.flipsPerHour, show.quantity),
  numberColumn("profitPerHour", "Profit/h", "Profit × Max/h", (row) => row.profitPerHour, show.best),
  numberColumn("tenPercentOffer", "10% offer", `${TEN_PERCENT_OFFER}. Undercuts the others, so it fills sooner.`, (row) => row.tenPercentOffer),
  numberColumn(
    "tenPercentProfit",
    "Profit 10%",
    'Profit per shard when selling with the "10% of spread" offer, after tax',
    (row) => row.tenPercentProfit,
    show.signed,
  ),
  numberColumn("tenPercentProfitPerHour", "Profit/h 10%", "Profit 10% × Max/h", (row) => row.tenPercentProfitPerHour),
  numberColumn("buyOrderCount", "Buy orders", "Buy orders already listed: who you compete with when buying", (row) => row.buyOrderCount, show.count),
  numberColumn("sellOfferCount", "Sell offers", "Sell offers already listed: who you compete with when selling", (row) => row.sellOfferCount, show.count),
  hoursColumn(
    "fillHours",
    "Fill time",
    "Time for an hour's worth to go through both queues at the best prices: first your buy order, then your sell offer",
    (row) => row.fillHours,
  ),
];

export const flipTable: TableConfig<FlipRow> = {
  id: "flips",
  label: "Flips",
  icon: Repeat,
  description:
    "Buy with a buy order at the highest buy order, sell with a sell offer at the cheapest sell offer. Profit is per shard after tax. Flips always use live order book prices, never your price overrides.",
  rows: (loaded, settings) => getFlipRows(loaded, settings),
  columns: flipColumns,
  initialSort: "profitPerHour",
  rowKey: (row) => row.shardId,
  shardIdsOf: (row) => [row.shardId],
  profitOf: (row) => row.profit,
  spreadOf: (row) => row.percent,
  searchPlaceholder: "Search shards...",
  emptyText: "No flips found.",
};

// ─── Fuse your farm ───

const farmFusionColumns = ({ data }: Loaded, openBook: OpenBook): ColumnDef<FarmFusionRow>[] => [
  { id: "inputs", label: "Inputs", align: "left", alwaysVisible: true, render: (row) => <FarmedInputs data={data} row={row} openBook={openBook} /> },
  resultColumn(data, openBook),
  numberColumn("farmRate", "Farm/h", "Your farming rate of the marked shard", (row) => row.farmRate, show.quantity),
  numberColumn("sellValue", "Sell value", "What the farmed shards of one fusion would sell for instead, after tax", (row) => row.sellValue),
  numberColumn("boughtCost", "Buy cost", "Coins to buy the other input of one fusion", (row) => row.boughtCost),
  numberColumn("revenue", "Value", "What the result of one fusion sells for, after tax", (row) => row.revenue),
  numberColumn(
    "gain",
    "Gain",
    "Per fusion: value minus sell value minus buy cost. Positive means fusing beats selling the farmed shards.",
    (row) => row.gain,
    show.signedBold,
  ),
  numberColumn("volume", "Volume/h", "Hourly Bazaar volume of the least traded of the bought input and the result", (row) => row.volume, show.volume),
  numberColumn(
    "fusionsPerHour",
    "Fusions/h",
    "Limited by your farming rate and by the market for the bought input and the result",
    (row) => row.fusionsPerHour,
    show.quantity,
  ),
  numberColumn(
    "gainPerHour",
    "Gain/h",
    "Gain × Fusions/h: extra coins per hour compared with selling what you farm",
    (row) => row.gainPerHour,
    show.signedBold,
  ),
];

export const farmFusionTable: TableConfig<FarmFusionRow> = {
  id: "farmFusions",
  label: "Fuse your farm",
  icon: Sprout,
  description:
    "Fuse the shards you farm (marked) instead of selling them, buying the other input. Gain compares it with selling the farmed shards; Fusions/h is limited by your farming rate and the market.",
  rows: (loaded, settings) => getFarmFusionRows(loaded.data, loaded, settings, loaded.crocodileMultiplier),
  columns: farmFusionColumns,
  initialSort: "gainPerHour",
  rowKey: (row) => `${row.outputId}|${row.inputs[0]}|${row.inputs[1]}|${row.outputQuantity}|${row.farmedId}`,
  shardIdsOf: (row) => [row.outputId, ...row.inputs],
  profitOf: (row) => row.gain,
  searchPlaceholder: "Search input or result...",
  emptyText: "No fusions found.",
};

// ─── Inventory ───

const inventoryColumns = ({ data, sellOverrides }: Loaded, openBook: OpenBook): ColumnDef<InventoryRow>[] => {
  const overridden = (row: InventoryRow) => sellOverrides.has(row.shardId);
  /** A price, or a dash for shards that aren't on the Bazaar. */
  const optionalPrice = (value: (row: InventoryRow) => number | null, id: string, label: string, title: string): ColumnDef<InventoryRow> => ({
    id,
    label,
    title,
    sortValue: (row) => value(row) ?? -1,
    render: (row) => {
      const price = value(row);
      return price === null ? (
        dash
      ) : (
        <span className="text-slate-300">
          <Price value={price} overridden={overridden(row)} />
        </span>
      );
    },
  });
  return [
    shardColumn(data, openBook),
    numberColumn("owned", "Owned", "How many of this shard you have", (row) => row.owned, show.count),
    optionalPrice((row) => row.price, "price", "Price", "Sale price per shard, before tax"),
    numberColumn("value", "Value", "Owned × price, after tax: what your stack is worth at that price", (row) => row.value),
    optionalPrice(
      (row) => row.realPrice,
      "realPrice",
      "Real price",
      "Average price when selling the whole stack at once, from the order book (instant sell only)",
    ),
    numberColumn(
      "realValue",
      "Real value",
      "What selling the whole stack at once brings, after tax; at most what the order book holds",
      (row) => row.realValue,
      show.best,
    ),
    numberColumn("volume", "Volume/h", "Shards the Bazaar takes per hour on your selling side (7-day average)", (row) => row.volume, show.volume),
    ...spreadColumns<InventoryRow>(false),
    numberColumn("competitors", "Competition", "Sell offers already listed: who you compete with when selling", (row) => row.competitors, show.count),
    hoursColumn(
      "sellHours",
      "Sell time",
      "Time to sell the whole stack: instant when selling instantly, else how long your sell offer waits behind the ones at the best price",
      (row) => row.sellHours,
    ),
  ];
};

export const inventoryTable: TableConfig<InventoryRow> = {
  id: "inventory",
  label: "Inventory",
  icon: Backpack,
  description:
    "The shards in your inventory, imported on the Calculator page. Value uses the sale price; Real value is what selling the whole stack at once actually brings, from the order book.",
  rows: (loaded, settings) => getInventoryRows(loaded.data, loaded, settings, loaded.inventory),
  columns: inventoryColumns,
  initialSort: "realValue",
  rowKey: (row) => row.shardId,
  shardIdsOf: (row) => [row.shardId],
  searchPlaceholder: "Search shards...",
  emptyText: "No inventory imported yet. Import it in the Inventory panel on the Calculator page.",
  ignoreMinVolume: true,
  summary: (rows) =>
    rows.length > 0 && (
      <p className="text-sm text-slate-300">
        {rows.reduce((sum, row) => sum + row.owned, 0).toLocaleString()} shards worth{" "}
        <span className="font-medium text-white">{formatLargeNumber(rows.reduce((sum, row) => sum + row.value, 0))}</span> coins at their price, or{" "}
        <span className="font-medium text-green-400">{formatLargeNumber(rows.reduce((sum, row) => sum + row.realValue, 0))}</span> when sold all at once (after
        tax).
      </p>
    ),
};

/** Every tab, in order. */
export const allTables = [farmingTable, fusionTable, flipTable, farmFusionTable, inventoryTable] as const;
