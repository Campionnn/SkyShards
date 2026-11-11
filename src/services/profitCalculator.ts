import type { Data } from "../types/types";
import type { ShardVolume } from "./dataService";
import { getEffectiveOutputQuantity } from "./fusionMath";

/*
 * Pure money math for the Profits page: what farming a shard earns per hour, and what
 * a single fusion earns when its inputs are bought and its output is sold on the Bazaar.
 * Prices are coins per shard; a shard missing from a price map has no Bazaar price.
 *
 * Market volume keeps the estimates realistic: you can only sell as fast as the other
 * side of the Bazaar takes shards, and only buy as fast as it supplies them. `marketShare`
 * is the part of that hourly volume you expect to get, since other players trade too.
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

/**
 * The volume that limits a trade. Instant buys and new sell offers both depend on players
 * buying instantly; buy orders and instant sells both depend on players selling instantly.
 */
const buyVolume = (volume: ShardVolume | undefined, mode: BuyMode) => (volume ? (mode === "instant" ? volume.instantBuy : volume.instantSell) : 0);
const sellVolume = (volume: ShardVolume | undefined, mode: SellMode) => (volume ? (mode === "offer" ? volume.instantBuy : volume.instantSell) : 0);

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
}

/** Every directly obtainable shard that has a sale price. */
export const getFarmingRows = (
  data: Data,
  sellPrices: Record<string, number>,
  volumes: Record<string, ShardVolume>,
  settings: MarketSettings,
): FarmingRow[] => {
  const keep = afterTax(settings.taxPercent);
  const rows: FarmingRow[] = [];
  for (const [shardId, shard] of Object.entries(data.shards)) {
    const price = sellPrices[shardId];
    if (shard.rate <= 0 || price === undefined) continue;
    const volume = sellVolume(volumes[shardId], settings.sellMode);
    const sellable = Math.min(shard.rate, volume * settings.marketShare);
    rows.push({ shardId, rate: shard.rate, price, coinsPerHour: shard.rate * price * keep, volume, realisticCoinsPerHour: sellable * price * keep });
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
}

/** Every recipe whose inputs can be bought and whose output can be sold. */
export const getFusionRows = (
  data: Data,
  buyPrices: Record<string, number>,
  sellPrices: Record<string, number>,
  volumes: Record<string, ShardVolume>,
  settings: MarketSettings,
  crocodileMultiplier: number,
): FusionRow[] => {
  const keep = afterTax(settings.taxPercent);
  const rows: FusionRow[] = [];
  for (const [outputId, recipes] of Object.entries(data.recipes)) {
    const outputPrice = sellPrices[outputId];
    if (outputPrice === undefined) continue;
    const outputVolume = sellVolume(volumes[outputId], settings.sellMode);
    for (const recipe of recipes) {
      const [input1, input2] = recipe.inputs;
      const price1 = buyPrices[input1];
      const price2 = buyPrices[input2];
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
        const inputVolume = buyVolume(volumes[shardId], settings.buyMode);
        volume = Math.min(volume, inputVolume);
        fusionsLimit = Math.min(fusionsLimit, inputVolume / amount);
      }
      const fusionsPerHour = fusionsLimit * settings.marketShare;

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
      });
    }
  }
  return rows;
};
