import type { Data } from "../types/types";
import type { OrderBook, OrderLevel, ShardVolume } from "./dataService";
import { getEffectiveOutputQuantity } from "./fusionMath";

/*
 * Pure money math for the Profits page: what farming a shard earns per hour, and what
 * a single fusion earns when its inputs are bought and its output is sold on the Bazaar.
 * Prices are coins per shard; a shard missing from a price map has no Bazaar price.
 *
 * Market volume keeps the estimates realistic: you can only sell as fast as the other
 * side of the Bazaar takes shards, and only buy as fast as it supplies them. `marketShare`
 * is the part of that hourly volume you expect to get, since other players trade too.
 *
 * The "real" values go one step further for instant trades: buying or selling an hour's
 * worth at once walks down the order book, so the average price is worse than the best one,
 * and you can't trade more than the book holds. Orders (buy orders, sell offers) set their
 * own price, and price overrides are taken as fixed, so those keep the plain price.
 */

/** Share of the sale price kept after the Bazaar tax, e.g. 1.25 % -> 0.9875. */
export const afterTax = (taxPercent: number): number => 1 - Math.min(Math.max(taxPercent, 0), 100) / 100;

export type BuyMode = "instant" | "order";
export type SellMode = "instant" | "offer";

export interface MarketSettings {
  buyMode: BuyMode;
  sellMode: SellMode;
  taxPercent: number;
  /** Part of the hourly Bazaar volume you can realistically take, 0–1. */
  marketShare: number;
}

/** Everything the calculations read about the Bazaar. */
export interface MarketData {
  /** Price per shard when buying, with the user's overrides applied. */
  buyPrices: Record<string, number>;
  /** Price per shard when selling (before tax), with the user's overrides applied. */
  sellPrices: Record<string, number>;
  volumes: Record<string, ShardVolume>;
  orderBooks: Record<string, OrderBook>;
  /** Shards whose buy / sell price is a user override rather than a Bazaar price. */
  buyOverrides: ReadonlySet<string>;
  sellOverrides: ReadonlySet<string>;
}

/**
 * The volume that limits a trade. Instant buys and new sell offers both depend on players
 * buying instantly; buy orders and instant sells both depend on players selling instantly.
 */
const buyVolume = (volume: ShardVolume | undefined, mode: BuyMode) => (volume ? (mode === "instant" ? volume.instantBuy : volume.instantSell) : 0);
const sellVolume = (volume: ShardVolume | undefined, mode: SellMode) => (volume ? (mode === "offer" ? volume.instantBuy : volume.instantSell) : 0);

/** A trade of several shards at once: how many it got and their average price. */
export interface Fill {
  amount: number;
  average: number;
}

/** Takes up to `amount` shards from order book levels (best price first). */
export const takeFromBook = (levels: OrderLevel[], amount: number): Fill => {
  let left = amount;
  let taken = 0;
  let coins = 0;
  for (const level of levels) {
    if (left <= 0) break;
    const take = Math.min(left, level.amount);
    taken += take;
    coins += take * level.price;
    left -= take;
  }
  return { amount: taken, average: taken > 0 ? coins / taken : 0 };
};

/** Buying `amount` shards at once. Orders and overrides fill at the plain price, without a depth limit. */
const buyFill = (shardId: string, amount: number, market: MarketData, mode: BuyMode): Fill => {
  const book = market.orderBooks[shardId];
  if (mode === "order" || market.buyOverrides.has(shardId) || !book) return { amount, average: market.buyPrices[shardId] ?? 0 };
  return takeFromBook(book.sellOffers, amount);
};

/** Selling `amount` shards at once (price before tax). */
const sellFill = (shardId: string, amount: number, market: MarketData, mode: SellMode): Fill => {
  const book = market.orderBooks[shardId];
  if (mode === "offer" || market.sellOverrides.has(shardId) || !book) return { amount, average: market.sellPrices[shardId] ?? 0 };
  return takeFromBook(book.buyOrders, amount);
};

/** Number of orders on one side of a book (top 30 price levels). */
export const countOrders = (levels: OrderLevel[] | undefined): number => (levels ?? []).reduce((sum, level) => sum + level.orders, 0);

/**
 * Hours until an order of `amount` placed at the best price fills: everything already waiting at
 * that price goes first, then yours, at `volumePerHour`. Infinity when that side doesn't trade.
 */
export const hoursToFill = (levels: OrderLevel[] | undefined, amount: number, volumePerHour: number): number =>
  volumePerHour > 0 ? ((levels?.[0]?.amount ?? 0) + amount) / volumePerHour : Infinity;

/** Hours to fill a buy order: it waits behind the buy orders at the top and fills with instant sells. */
const buyOrderHours = (shardId: string, amount: number, market: MarketData) =>
  hoursToFill(market.orderBooks[shardId]?.buyOrders, amount, market.volumes[shardId]?.instantSell ?? 0);

/** Hours to fill a sell offer: it waits behind the sell offers at the top and fills with instant buys. */
const sellOfferHours = (shardId: string, amount: number, market: MarketData) =>
  hoursToFill(market.orderBooks[shardId]?.sellOffers, amount, market.volumes[shardId]?.instantBuy ?? 0);

/** One fusion recipe, with what the calculations need from it. */
interface Fusion {
  outputId: string;
  inputs: [string, string];
  /** Shards of each input consumed by one fusion (their fuse amounts). */
  inputAmounts: [number, number];
  /** Shards produced by one fusion; fractional for reptile recipes with a Crocodile pet. */
  outputQuantity: number;
  /** Shards needed per fusion, by shard: one entry when both inputs are the same shard. */
  needed: [shardId: string, amount: number][];
  /** Sale price of the result, before tax. */
  outputPrice: number;
}

/**
 * Calls `visit` for every recipe whose result has a sale price and whose inputs are known shards.
 * `include` can skip recipes early, before any work is done for them.
 */
const forEachFusion = (
  data: Data,
  market: MarketData,
  crocodileMultiplier: number,
  visit: (fusion: Fusion) => void,
  include?: (inputs: [string, string]) => boolean,
) => {
  for (const [outputId, recipes] of Object.entries(data.recipes)) {
    const outputPrice = market.sellPrices[outputId];
    if (outputPrice === undefined) continue;
    for (const recipe of recipes) {
      const [input1, input2] = recipe.inputs;
      const shard1 = data.shards[input1];
      const shard2 = data.shards[input2];
      if (!shard1 || !shard2 || (include && !include(recipe.inputs))) continue;
      const inputAmounts: [number, number] = [shard1.fuse_amount, shard2.fuse_amount];
      visit({
        outputId,
        inputs: recipe.inputs,
        inputAmounts,
        outputQuantity: getEffectiveOutputQuantity(recipe, crocodileMultiplier),
        needed:
          input1 === input2
            ? [[input1, inputAmounts[0] + inputAmounts[1]]]
            : [
                [input1, inputAmounts[0]],
                [input2, inputAmounts[1]],
              ],
        outputPrice,
      });
    }
  }
};

export interface FarmingRow {
  shardId: string;
  /** Shards per hour, with the player's Hunting Fortune and pet bonuses applied. */
  rate: number;
  /** Sale price per shard, before tax. */
  price: number;
  /** rate × price × (1 − tax), ignoring how much the market can take. */
  coinsPerHour: number;
  /** Shards per hour the Bazaar takes on the selling side. */
  volume: number;
  /** Like coinsPerHour, but selling at most marketShare × volume per hour. */
  realisticCoinsPerHour: number;
  /** Average sale price when selling an hour's worth at once, before tax. */
  realPrice: number;
  /** realisticCoinsPerHour at realPrice, and at most what the order book holds. */
  realCoinsPerHour: number;
  /** The shard's spread, or null when one side of its order book is empty. */
  spread: Spread | null;
  /** Sell offers already listed: the players you compete with when selling. */
  competitors: number;
  /** Hours to sell an hour's worth: 0 when selling instantly, else the sell offer queue time. */
  sellHours: number;
}

/** Every directly obtainable shard that has a sale price. */
export const getFarmingRows = (data: Data, market: MarketData, settings: MarketSettings): FarmingRow[] => {
  const keep = afterTax(settings.taxPercent);
  const rows: FarmingRow[] = [];
  for (const [shardId, shard] of Object.entries(data.shards)) {
    const price = market.sellPrices[shardId];
    if (shard.rate <= 0 || price === undefined) continue;
    const volume = sellVolume(market.volumes[shardId], settings.sellMode);
    const sellable = Math.min(shard.rate, volume * settings.marketShare);
    const fill = sellFill(shardId, sellable, market, settings.sellMode);
    const realPrice = fill.amount > 0 ? fill.average : price;
    rows.push({
      shardId,
      rate: shard.rate,
      price,
      coinsPerHour: shard.rate * price * keep,
      volume,
      realisticCoinsPerHour: sellable * price * keep,
      realPrice,
      realCoinsPerHour: fill.amount * realPrice * keep,
      spread: getSpread(market.orderBooks[shardId]),
      competitors: countOrders(market.orderBooks[shardId]?.sellOffers),
      sellHours: settings.sellMode === "instant" ? 0 : sellOfferHours(shardId, sellable, market),
    });
  }
  return rows;
};

export interface FusionRow {
  outputId: string;
  inputs: [string, string];
  /** Shards of each input consumed by one fusion (their fuse amounts). */
  inputAmounts: [number, number];
  /** Shards produced by one fusion; fractional for reptile recipes with a Crocodile pet. */
  outputQuantity: number;
  /** Coins to buy the inputs of one fusion. */
  cost: number;
  /** Coins from selling the output of one fusion, after tax. */
  revenue: number;
  profit: number;
  /** Profit as a share of the cost (0.25 = 25 %). */
  margin: number;
  /** Lowest hourly Bazaar volume among the inputs and the result: the bottleneck shard. */
  volume: number;
  /** Fusions per hour the market allows with marketShare: limited by buying the inputs and selling the result. */
  fusionsPerHour: number;
  /** profit × fusionsPerHour (0 for unprofitable fusions). */
  profitPerHour: number;
  /** fusionsPerHour, also limited by what the order books hold. */
  realFusionsPerHour: number;
  /** Profit per fusion when an hour's worth is bought and sold at once, at order book prices. */
  realProfit: number;
  /** realProfit × realFusionsPerHour (0 for unprofitable fusions). */
  realProfitPerHour: number;
  /** Hours until an hour's worth of orders fills: the slowest of buying the inputs and selling the result (0 if all instant). */
  fillHours: number;
}

/** Every recipe whose inputs can be bought and whose output can be sold. */
export const getFusionRows = (data: Data, market: MarketData, settings: MarketSettings, crocodileMultiplier: number): FusionRow[] => {
  const keep = afterTax(settings.taxPercent);
  const { buyMode, sellMode, marketShare } = settings;
  const rows: FusionRow[] = [];
  forEachFusion(data, market, crocodileMultiplier, ({ outputId, inputs, inputAmounts, outputQuantity, needed, outputPrice }) => {
    const price1 = market.buyPrices[inputs[0]];
    const price2 = market.buyPrices[inputs[1]];
    if (price1 === undefined || price2 === undefined) return;

    const cost = inputAmounts[0] * price1 + inputAmounts[1] * price2;
    const revenue = outputQuantity * outputPrice * keep;
    const profit = revenue - cost;

    const outputVolume = sellVolume(market.volumes[outputId], sellMode);
    let volume = outputVolume;
    let fusionsLimit = outputVolume / outputQuantity;
    for (const [shardId, amount] of needed) {
      const inputVolume = buyVolume(market.volumes[shardId], buyMode);
      volume = Math.min(volume, inputVolume);
      fusionsLimit = Math.min(fusionsLimit, inputVolume / amount);
    }
    const fusionsPerHour = fusionsLimit * marketShare;

    let realFusionsPerHour = 0;
    let realProfit = profit;
    let fillHours = Infinity;
    if (fusionsPerHour > 0) {
      // Real values: first see how many fusions the order books can supply and take,
      // then price exactly that many at the books' average prices.
      realFusionsPerHour = Math.min(fusionsPerHour, sellFill(outputId, fusionsPerHour * outputQuantity, market, sellMode).amount / outputQuantity);
      for (const [shardId, amount] of needed) {
        realFusionsPerHour = Math.min(realFusionsPerHour, buyFill(shardId, fusionsPerHour * amount, market, buyMode).amount / amount);
      }
      if (realFusionsPerHour > 0) {
        let realCost = 0;
        for (const [shardId, amount] of needed) realCost += amount * buyFill(shardId, realFusionsPerHour * amount, market, buyMode).average;
        realProfit = outputQuantity * sellFill(outputId, realFusionsPerHour * outputQuantity, market, sellMode).average * keep - realCost;
      }

      // Orders queue behind the best price; instant trades don't wait.
      fillHours = 0;
      if (buyMode === "order") for (const [shardId, amount] of needed) fillHours = Math.max(fillHours, buyOrderHours(shardId, fusionsPerHour * amount, market));
      if (sellMode === "offer") fillHours = Math.max(fillHours, sellOfferHours(outputId, fusionsPerHour * outputQuantity, market));
    }

    rows.push({
      outputId,
      inputs,
      inputAmounts,
      outputQuantity,
      cost,
      revenue,
      profit,
      margin: cost > 0 ? profit / cost : 0,
      volume,
      fusionsPerHour,
      profitPerHour: profit > 0 ? profit * fusionsPerHour : 0,
      realFusionsPerHour,
      realProfit,
      realProfitPerHour: realProfit > 0 ? realProfit * realFusionsPerHour : 0,
      fillHours,
    });
  });
  return rows;
};

/** Gap between the cheapest sell offer and the highest buy order. */
export interface Spread {
  /** Highest buy order: what you get selling instantly, and where a new buy order starts. */
  buyOrder: number;
  /** Cheapest sell offer: what you pay buying instantly, and where a new sell offer starts. */
  sellOffer: number;
  spread: number;
  /** spread / buyOrder (0.1 = 10 %). */
  percent: number;
  /** The in-game "10% of spread" sell offer: the cheapest sell offer minus a tenth of the spread. */
  tenPercentOffer: number;
}

/** Share of the spread the in-game "10% of spread" sell offer undercuts by. */
export const SPREAD_UNDERCUT = 0.1;

/** The spread of an order book, or null when one side is empty. */
export const getSpread = (book: OrderBook | undefined): Spread | null => {
  const buyOrder = book?.buyOrders[0]?.price;
  const sellOffer = book?.sellOffers[0]?.price;
  if (buyOrder === undefined || sellOffer === undefined) return null;
  const spread = sellOffer - buyOrder;
  return { buyOrder, sellOffer, spread, percent: buyOrder > 0 ? spread / buyOrder : 0, tenPercentOffer: sellOffer - spread * SPREAD_UNDERCUT };
};

export interface FlipRow extends Spread {
  shardId: string;
  /** Coins per shard: sell offer after tax minus buy order. */
  profit: number;
  /** Shards per hour the slower side trades: buy orders fill with instant sells, sell offers with instant buys. */
  volume: number;
  /** Shards per hour you can flip at your market share. */
  flipsPerHour: number;
  /** profit × flipsPerHour (0 for unprofitable flips). */
  profitPerHour: number;
  /** Profit per shard when selling with the "10% of spread" offer instead of matching the cheapest one. */
  tenPercentProfit: number;
  /** tenPercentProfit × flipsPerHour (0 when unprofitable). */
  tenPercentProfitPerHour: number;
  /** Buy orders and sell offers already listed: the players you compete with on each side. */
  buyOrderCount: number;
  sellOfferCount: number;
  /** Hours for an hour's worth to go through both queues: buy order, then sell offer. */
  fillHours: number;
}

/**
 * Bazaar flips: place a buy order at the highest buy order, then sell with a sell offer at the
 * cheapest sell offer. Always uses live order book prices; price overrides don't apply here.
 */
export const getFlipRows = (market: MarketData, settings: Pick<MarketSettings, "taxPercent" | "marketShare">): FlipRow[] => {
  const keep = afterTax(settings.taxPercent);
  const rows: FlipRow[] = [];
  for (const [shardId, book] of Object.entries(market.orderBooks)) {
    const spread = getSpread(book);
    if (!spread) continue;
    const volume = market.volumes[shardId];
    const flipVolume = volume ? Math.min(volume.instantBuy, volume.instantSell) : 0;
    const profit = spread.sellOffer * keep - spread.buyOrder;
    const tenPercentProfit = spread.tenPercentOffer * keep - spread.buyOrder;
    const flipsPerHour = flipVolume * settings.marketShare;
    rows.push({
      shardId,
      ...spread,
      profit,
      volume: flipVolume,
      flipsPerHour,
      profitPerHour: profit > 0 ? profit * flipsPerHour : 0,
      tenPercentProfit,
      tenPercentProfitPerHour: tenPercentProfit > 0 ? tenPercentProfit * flipsPerHour : 0,
      buyOrderCount: countOrders(book.buyOrders),
      sellOfferCount: countOrders(book.sellOffers),
      fillHours: flipsPerHour > 0 ? buyOrderHours(shardId, flipsPerHour, market) + sellOfferHours(shardId, flipsPerHour, market) : Infinity,
    });
  }
  return rows;
};

export interface FarmFusionRow {
  outputId: string;
  inputs: [string, string];
  inputAmounts: [number, number];
  outputQuantity: number;
  /** The input you farm; the other one is bought. */
  farmedId: string;
  /** Farmed shards one fusion uses (both inputs when they are the same shard). */
  farmedAmount: number;
  /** The bought input, or null when both inputs are the farmed shard. */
  boughtId: string | null;
  boughtAmount: number;
  /** Your farming rate of the farmed shard, per hour. */
  farmRate: number;
  /** What the farmed shards of one fusion would sell for instead, after tax. */
  sellValue: number;
  /** Coins to buy the other input of one fusion. */
  boughtCost: number;
  /** What the result of one fusion sells for, after tax. */
  revenue: number;
  /** revenue − sellValue − boughtCost: positive when fusing beats selling the farmed shards. */
  gain: number;
  /** Lowest hourly Bazaar volume of the bought input and the result. */
  volume: number;
  /** Fusions per hour: limited by your farming rate and by the market for the bought input and the result. */
  fusionsPerHour: number;
  /** gain × fusionsPerHour. Negative means selling the farmed shards earns more. */
  gainPerHour: number;
}

/**
 * Fusing shards you farm instead of selling them. The farmed shards count at what they would
 * sell for, since that's what fusing gives up. One row per fusion and farmable input: you can
 * only hunt one shard at a time at your full rate, so the other input is bought.
 */
export const getFarmFusionRows = (data: Data, market: MarketData, settings: MarketSettings, crocodileMultiplier: number): FarmFusionRow[] => {
  const keep = afterTax(settings.taxPercent);
  const { buyMode, sellMode, marketShare } = settings;
  const rows: FarmFusionRow[] = [];
  forEachFusion(
    data,
    market,
    crocodileMultiplier,
    ({ outputId, inputs, inputAmounts, outputQuantity, needed, outputPrice }) => {
      const revenue = outputQuantity * outputPrice * keep;
      const outputVolume = sellVolume(market.volumes[outputId], sellMode);

      for (const [farmedId, farmedAmount] of needed) {
        const farmRate = data.shards[farmedId]?.rate ?? 0;
        if (farmRate <= 0) continue;
        // The other input is bought; there is none when both inputs are the farmed shard.
        const [boughtId, boughtAmount] = needed.find(([shardId]) => shardId !== farmedId) ?? [null, 0];
        const boughtPrice = boughtId === null ? 0 : market.buyPrices[boughtId];
        if (boughtPrice === undefined) continue;

        // A farmed shard without a Bazaar price can't be sold, so fusing gives nothing up.
        const sellValue = farmedAmount * (market.sellPrices[farmedId] ?? 0) * keep;
        const boughtCost = boughtAmount * boughtPrice;
        const gain = revenue - sellValue - boughtCost;

        let volume = outputVolume;
        let fusionsPerHour = Math.min(farmRate / farmedAmount, (outputVolume * marketShare) / outputQuantity);
        if (boughtId !== null) {
          const boughtVolume = buyVolume(market.volumes[boughtId], buyMode);
          volume = Math.min(volume, boughtVolume);
          fusionsPerHour = Math.min(fusionsPerHour, (boughtVolume * marketShare) / boughtAmount);
        }

        rows.push({
          outputId,
          inputs,
          inputAmounts,
          outputQuantity,
          farmedId,
          farmedAmount,
          boughtId,
          boughtAmount,
          farmRate,
          sellValue,
          boughtCost,
          revenue,
          gain,
          volume,
          fusionsPerHour,
          gainPerHour: gain * fusionsPerHour,
        });
      }
    },
    // Only recipes with an input you can farm; most have none.
    ([input1, input2]) => (data.shards[input1]?.rate ?? 0) > 0 || (data.shards[input2]?.rate ?? 0) > 0,
  );
  return rows;
};
