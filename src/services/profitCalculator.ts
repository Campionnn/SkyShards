import type { Data } from "../types/types";
import { getEffectiveOutputQuantity } from "./fusionMath";

/*
 * Pure money math for the Profits page: what farming a shard earns per hour, and what
 * a single fusion earns when its inputs are bought and its output is sold on the Bazaar.
 * Prices are coins per shard; a shard missing from a price map has no Bazaar price.
 */

/** Share of the sale price kept after the Bazaar tax, e.g. 1.25 % -> 0.9875. */
export const afterTax = (taxPercent: number): number => 1 - Math.min(Math.max(taxPercent, 0), 100) / 100;

export interface FarmingRow {
  shardId: string;
  /** Shards per hour, with the player's Hunting Fortune and pet bonuses applied. */
  rate: number;
  /** Sale price per shard, before tax. */
  price: number;
  /** rate × price × (1 − tax). */
  coinsPerHour: number;
}

/** Every directly obtainable shard that has a sale price. */
export const getFarmingRows = (data: Data, sellPrices: Record<string, number>, taxPercent: number): FarmingRow[] => {
  const keep = afterTax(taxPercent);
  const rows: FarmingRow[] = [];
  for (const [shardId, shard] of Object.entries(data.shards)) {
    const price = sellPrices[shardId];
    if (shard.rate <= 0 || price === undefined) continue;
    rows.push({ shardId, rate: shard.rate, price, coinsPerHour: shard.rate * price * keep });
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
}

/** Every recipe whose inputs can be bought and whose output can be sold. */
export const getFusionRows = (
  data: Data,
  buyPrices: Record<string, number>,
  sellPrices: Record<string, number>,
  taxPercent: number,
  crocodileMultiplier: number,
): FusionRow[] => {
  const keep = afterTax(taxPercent);
  const rows: FusionRow[] = [];
  for (const [outputId, recipes] of Object.entries(data.recipes)) {
    const outputPrice = sellPrices[outputId];
    if (outputPrice === undefined) continue;
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
      rows.push({ outputId, inputs: recipe.inputs, inputAmounts, outputQuantity, cost, revenue, profit, margin: cost > 0 ? profit / cost : 0 });
    }
  }
  return rows;
};
