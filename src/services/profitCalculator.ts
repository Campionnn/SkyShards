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
}

/** Every recipe whose inputs can be bought and whose output can be sold. */
export const getFusionRows = (data: Data, market: MarketData, settings: MarketSettings, crocodileMultiplier: number): FusionRow[] => {
  const keep = afterTax(settings.taxPercent);
  const { buyMode, sellMode } = settings;
  const rows: FusionRow[] = [];
  for (const [outputId, recipes] of Object.entries(data.recipes)) {
    const outputPrice = market.sellPrices[outputId];
    if (outputPrice === undefined) continue;
    const outputVolume = sellVolume(market.volumes[outputId], sellMode);
    for (const recipe of recipes) {
      const [input1, input2] = recipe.inputs;
      const price1 = market.buyPrices[input1];
      const price2 = market.buyPrices[input2];
      const shard1 = data.shards[input1];
      const shard2 = data.shards[input2];
      if (price1 === undefined || price2 === undefined || !shard1 || !shard2) continue;

      const inputAmounts: [number, number] = [shard1.fuse_amount, shard2.fuse_amount];
      const outputQuantity = getEffectiveOutputQuantity(recipe, crocodileMultiplier);
      const cost = inputAmounts[0] * price1 + inputAmounts[1] * price2;
      const revenue = outputQuantity * outputPrice * keep;
      const profit = revenue - cost;

      // Shards needed per fusion, by shard: both inputs can be the same shard.
      const needed = new Map<string, number>([[input1, inputAmounts[0]]]);
      needed.set(input2, (needed.get(input2) ?? 0) + inputAmounts[1]);
      let volume = outputVolume;
      let fusionsLimit = outputVolume / outputQuantity;
      for (const [shardId, amount] of needed) {
        const inputVolume = buyVolume(market.volumes[shardId], buyMode);
        volume = Math.min(volume, inputVolume);
        fusionsLimit = Math.min(fusionsLimit, inputVolume / amount);
      }
      const fusionsPerHour = fusionsLimit * settings.marketShare;

      // Real values: first see how many fusions the order books can supply and take,
      // then price exactly that many at the books' average prices.
      let realFusionsPerHour = 0;
      let realProfit = profit;
      if (fusionsPerHour > 0) {
        realFusionsPerHour = Math.min(fusionsPerHour, sellFill(outputId, fusionsPerHour * outputQuantity, market, sellMode).amount / outputQuantity);
        for (const [shardId, amount] of needed) {
          realFusionsPerHour = Math.min(realFusionsPerHour, buyFill(shardId, fusionsPerHour * amount, market, buyMode).amount / amount);
        }
        if (realFusionsPerHour > 0) {
          let realCost = 0;
          for (const [shardId, amount] of needed) realCost += amount * buyFill(shardId, realFusionsPerHour * amount, market, buyMode).average;
          const realRevenue = outputQuantity * sellFill(outputId, realFusionsPerHour * outputQuantity, market, sellMode).average * keep;
          realProfit = realRevenue - realCost;
        }
      }

      rows.push({
        outputId,
        inputs: recipe.inputs,
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
      });
    }
  }
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
}

/** The spread of an order book, or null when one side is empty. */
export const getSpread = (book: OrderBook | undefined): Spread | null => {
  const buyOrder = book?.buyOrders[0]?.price;
  const sellOffer = book?.sellOffers[0]?.price;
  if (buyOrder === undefined || sellOffer === undefined) return null;
  const spread = sellOffer - buyOrder;
  return { buyOrder, sellOffer, spread, percent: buyOrder > 0 ? spread / buyOrder : 0 };
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
    const flipsPerHour = flipVolume * settings.marketShare;
    rows.push({ shardId, ...spread, profit, volume: flipVolume, flipsPerHour, profitPerHour: profit > 0 ? profit * flipsPerHour : 0 });
  }
  return rows;
};
