import { describe, expect, it } from "vitest";
import type { Data, Shard } from "../types/types";
import type { OrderLevel } from "./dataService";
import { CHAIN_BATCH_SIZE, getChainRows } from "./chainProfit";
import type { MarketData, MarketSettings } from "./profitCalculator";

/**
 * Multi-step fusion profits on a hand-built graph:
 *   M = 1 A + 1 B           (a cheap intermediate)
 *   T = 1 M + 1 C           (the target; buying M is dearer than fusing it)
 *   S = 1 A + 1 C           (a fusion that loses money: S sells for less than its inputs)
 * fuse_amount is 1 everywhere so the costs are easy to follow.
 */

const shard = (id: string): Shard => ({ id, name: id, family: "", type: "", rarity: "common", fuse_amount: 1, internal_id: `SHARD_${id}`, rate: 0 });

const data: Data = {
  shards: { A: shard("A"), B: shard("B"), C: shard("C"), M: shard("M"), T: shard("T"), S: shard("S") },
  recipes: {
    M: [{ inputs: ["A", "B"], outputQuantity: 1, isReptile: false }],
    T: [{ inputs: ["M", "C"], outputQuantity: 1, isReptile: false }],
    S: [{ inputs: ["A", "C"], outputQuantity: 1, isReptile: false }],
  },
};

const level = (price: number): OrderLevel => ({ price, amount: 1000, orders: 1 });

const buyPrices = { A: 10, B: 20, C: 30, M: 100, T: 500, S: 1000 };
const sellPrices = { A: 9, B: 18, C: 27, M: 90, T: 120, S: 35 };

const market: MarketData = {
  buyPrices,
  sellPrices,
  volumes: {},
  orderBooks: Object.fromEntries(
    Object.keys(buyPrices).map((id) => [
      id,
      { sellOffers: [level(buyPrices[id as keyof typeof buyPrices])], buyOrders: [level(sellPrices[id as keyof typeof sellPrices])] },
    ]),
  ),
  buyOverrides: new Set(),
  sellOverrides: new Set(["T"]),
};

const SETTINGS: MarketSettings = { buyMode: "instant", sellMode: "instant", taxPercent: 0, marketShare: 1 };

describe("getChainRows", () => {
  const { rows, treeFor } = getChainRows(data, market, SETTINGS, 0);
  const row = (id: string) => rows.find((r) => r.outputId === id)!;

  it("fuses intermediates when that beats buying them", () => {
    const target = row("T");
    // M fused = 10 + 20 = 30 (buying it costs 100), so T = 30 + 30 = 60.
    expect(target.costPerShard).toBeCloseTo(60);
    expect(target.depth).toBe(2);
    expect(target.profit).toBeCloseTo(120 - 60);
    expect(target.batchProfit).toBeCloseTo(60 * CHAIN_BATCH_SIZE);
    // A batch of 10 T: 10 fusions of M and 10 of T, buying 10 each of A, B and C.
    expect(target.fusionsPerBatch).toBe(20);
    expect(Object.fromEntries(target.materials)).toEqual({ A: 10, B: 10, C: 10 });
    expect(target.usesOverride).toBe(true);
    expect(treeFor("T").method).toBe("recipe");
  });

  it("applies tax to the sale", () => {
    const taxed = getChainRows(data, market, { ...SETTINGS, taxPercent: 10 }, 0).rows.find((r) => r.outputId === "T")!;
    expect(taxed.profit).toBeCloseTo(120 * 0.9 - 60);
  });

  it("keeps losing chains (filtered later by Only profitable) and leaves out shards that are cheaper to buy", () => {
    expect(row("S").profit).toBeCloseTo(35 - 40);
    // Every shard here is fusable or bought; A, B and C have no recipe, so they never appear.
    expect(rows.map((r) => r.outputId).sort()).toEqual(["M", "S", "T"]);
  });
});
