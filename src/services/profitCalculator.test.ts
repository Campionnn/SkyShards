import { describe, expect, it } from "vitest";
import type { Data, Shard } from "../types/types";
import type { OrderLevel, ShardVolume } from "./dataService";
import {
  afterTax,
  countOrders,
  getFarmFusionRows,
  getFarmingRows,
  getFlipRows,
  getFusionRows,
  getInventoryRows,
  getSpread,
  hoursToFill,
  takeFromBook,
  worstSpread,
  type MarketData,
  type MarketSettings,
} from "./profitCalculator";

/**
 * The Profits page math on a tiny hand-built market, so every expected number can be
 * worked out by hand. A and B fuse into C; F is farmable (rate > 0), the rest are not.
 */

const shard = (id: string, overrides: Partial<Shard> = {}): Shard => ({
  id,
  name: id,
  family: "",
  type: "",
  rarity: "common",
  fuse_amount: 2,
  internal_id: `SHARD_${id}`,
  rate: 0,
  ...overrides,
});

const level = (price: number, amount: number, orders = 1): OrderLevel => ({ price, amount, orders });

const data: Data = {
  shards: {
    A: shard("A"),
    B: shard("B", { fuse_amount: 1 }),
    C: shard("C"),
    F: shard("F", { rate: 100 }),
    R: shard("R"),
  },
  recipes: {
    // C = 2 A + 1 B, one output.
    C: [{ inputs: ["A", "B"], outputQuantity: 1, isReptile: false }],
    // R = 2 F + 2 F (same shard twice), reptile: output scales with the crocodile multiplier.
    R: [{ inputs: ["F", "F"], outputQuantity: 2, isReptile: true }],
  },
};

const volume = (instantBuy: number, instantSell: number): ShardVolume => ({ instantBuy, instantSell });

const market = (overrides: Partial<MarketData> = {}): MarketData => ({
  // Instant buy prices (cheapest sell offer) and instant sell prices (highest buy order).
  buyPrices: { A: 100, B: 50, C: 400, F: 30, R: 200 },
  sellPrices: { A: 90, B: 45, C: 360, F: 25, R: 180 },
  volumes: { A: volume(1000, 1000), B: volume(1000, 1000), C: volume(10, 20), F: volume(100, 50), R: volume(1000, 1000) },
  orderBooks: {
    A: { sellOffers: [level(100, 1000)], buyOrders: [level(90, 1000)] },
    B: { sellOffers: [level(50, 1000)], buyOrders: [level(45, 1000)] },
    // C's buy orders run out: 1 at 360, 1 at 300, then nothing.
    C: { sellOffers: [level(400, 5, 2), level(420, 5, 3)], buyOrders: [level(360, 1), level(300, 1)] },
    F: { sellOffers: [level(30, 500)], buyOrders: [level(25, 500)] },
    R: { sellOffers: [level(200, 1000)], buyOrders: [level(180, 1000)] },
  },
  buyOverrides: new Set(),
  sellOverrides: new Set(),
  ...overrides,
});

const INSTANT: MarketSettings = { buyMode: "instant", sellMode: "instant", taxPercent: 0, marketShare: 1 };

describe("helpers", () => {
  it("keeps the share of the price left after tax, clamped to 0–100 %", () => {
    expect(afterTax(1.25)).toBeCloseTo(0.9875);
    expect(afterTax(-5)).toBe(1);
    expect(afterTax(250)).toBe(0);
  });

  it("walks the order book, best price first", () => {
    const levels = [level(10, 2), level(20, 3)];
    expect(takeFromBook(levels, 1)).toEqual({ amount: 1, average: 10 });
    expect(takeFromBook(levels, 4)).toEqual({ amount: 4, average: (2 * 10 + 2 * 20) / 4 });
    // Only what the book holds can be taken.
    expect(takeFromBook(levels, 100)).toEqual({ amount: 5, average: (2 * 10 + 3 * 20) / 5 });
    expect(takeFromBook([], 5)).toEqual({ amount: 0, average: 0 });
  });

  it("counts orders and queue time", () => {
    expect(countOrders([level(1, 1, 2), level(2, 1, 3)])).toBe(5);
    expect(countOrders(undefined)).toBe(0);
    // 10 already waiting at the best price, plus 30 of ours, at 20 per hour.
    expect(hoursToFill([level(5, 10), level(4, 99)], 30, 20)).toBe(2);
    expect(hoursToFill([], 30, 0)).toBe(Infinity);
  });

  it("works out the spread and the in-game 10% of spread offer", () => {
    expect(getSpread({ sellOffers: [level(110, 1)], buyOrders: [level(100, 1)] })).toEqual({
      buyOrder: 100,
      sellOffer: 110,
      spread: 10,
      percent: 0.1,
      tenPercentOffer: 109,
    });
    expect(getSpread({ sellOffers: [], buyOrders: [level(100, 1)] })).toBeNull();
    expect(getSpread(undefined)).toBeNull();
  });

  it("finds the worst spread, treating an empty side or a missing book as unbounded", () => {
    const books = { X: { sellOffers: [level(12, 1)], buyOrders: [level(10, 1)] }, Y: { sellOffers: [level(30, 1)], buyOrders: [level(10, 1)] } };
    expect(worstSpread(["X", "Y"], books)).toBeCloseTo(2);
    expect(worstSpread(["X", "missing"], books)).toBe(Infinity);
    expect(worstSpread([], books)).toBe(0);
  });
});

describe("getFusionRows", () => {
  const row = (rows: ReturnType<typeof getFusionRows>) => rows.find((r) => r.outputId === "C")!;

  it("prices one fusion from the inputs and the result", () => {
    const fusion = row(getFusionRows(data, market(), { ...INSTANT, taxPercent: 10 }, 1));
    expect(fusion.inputAmounts).toEqual([2, 1]);
    expect(fusion.cost).toBe(2 * 100 + 1 * 50);
    expect(fusion.revenue).toBeCloseTo(360 * 0.9);
    expect(fusion.profit).toBeCloseTo(324 - 250);
    expect(fusion.margin).toBeCloseTo(74 / 250);
  });

  it("is limited by the least traded shard and the market share", () => {
    // Instant sell of C fills buy orders, so instantSell volume (20/h) limits it.
    const fusion = row(getFusionRows(data, market(), { ...INSTANT, marketShare: 0.5 }, 1));
    expect(fusion.volume).toBe(20);
    expect(fusion.fusionsPerHour).toBe(10);
    expect(fusion.profitPerHour).toBeCloseTo(fusion.profit * 10);
  });

  it("prices an hour's worth from the order book, at most what it holds", () => {
    const fusion = row(getFusionRows(data, market(), INSTANT, 1));
    // C's buy orders hold only 2 shards, so only 2 fusions can be sold instantly.
    expect(fusion.realFusionsPerHour).toBe(2);
    // Selling 2 walks the book: (360 + 300) / 2 = 330 per shard.
    expect(fusion.realProfit).toBeCloseTo(330 - 250);
    expect(fusion.realProfitPerHour).toBeCloseTo(80 * 2);
    expect(fusion.fillHours).toBe(0);
  });

  it("keeps override prices fixed instead of walking the book", () => {
    const overridden = market({ sellPrices: { ...market().sellPrices, C: 500 }, sellOverrides: new Set(["C"]) });
    const fusion = row(getFusionRows(data, overridden, INSTANT, 1));
    expect(fusion.revenue).toBe(500);
    expect(fusion.realFusionsPerHour).toBe(fusion.fusionsPerHour);
    expect(fusion.realProfit).toBeCloseTo(500 - 250);
  });

  it("uses sell offer volume and queue time when selling with a sell offer", () => {
    const fusion = row(getFusionRows(data, market(), { ...INSTANT, sellMode: "offer" }, 1));
    // Sell offers fill with instant buys: 10/h for C.
    expect(fusion.volume).toBe(10);
    // 5 already queued at the best price, plus our 10, at 10 per hour.
    expect(fusion.fillHours).toBeCloseTo(1.5);
  });

  it("adds both inputs together when they are the same shard, and scales reptile output", () => {
    const fusion = getFusionRows(data, market(), INSTANT, 1.5).find((r) => r.outputId === "R")!;
    expect(fusion.cost).toBe(4 * 30);
    expect(fusion.outputQuantity).toBe(3);
    // F trades 100/h when bought instantly, 4 per fusion -> 25 fusions per hour at most.
    expect(fusion.fusionsPerHour).toBeCloseTo(25);
  });

  it("prices instant and patient strategies from both sides, whatever the selected modes", () => {
    const sides = { sellOffer: market().buyPrices, buyOrder: market().sellPrices };
    const fusion = row(getFusionRows(data, market({ sides }), { ...INSTANT, buyMode: "order", sellMode: "offer", taxPercent: 10 }, 1));
    // Instant: buy at the sell offers (2×100 + 50), sell at the buy order (360).
    expect(fusion.instantProfit).toBeCloseTo(360 * 0.9 - 250);
    // Patient: buy orders at the bids (2×90 + 45), sell offer at the ask (400).
    expect(fusion.patientProfit).toBeCloseTo(400 * 0.9 - 225);
    // Without both sides, only the selected strategy is priced.
    expect(row(getFusionRows(data, market(), INSTANT, 1)).instantProfit).toBeNull();
  });

  it("reports the widest spread among the shards it prices", () => {
    // A: 100/90 → 11.1 %, B: 50/45 → 11.1 %, C: 400/360 → 11.1 %.
    expect(row(getFusionRows(data, market(), INSTANT, 1)).maxSpread).toBeCloseTo(40 / 360);
    const books = { ...market().orderBooks, B: { sellOffers: [level(50, 10)], buyOrders: [level(5, 10)] } };
    expect(row(getFusionRows(data, market({ orderBooks: books }), INSTANT, 1)).maxSpread).toBeCloseTo(9);
    const emptySide = { ...market().orderBooks, A: { sellOffers: [level(100, 10)], buyOrders: [] } };
    expect(row(getFusionRows(data, market({ orderBooks: emptySide }), INSTANT, 1)).maxSpread).toBe(Infinity);
  });

  it("skips recipes whose prices are missing", () => {
    const noB = market({ buyPrices: { A: 100, C: 400, F: 30, R: 200 } });
    expect(getFusionRows(data, noB, INSTANT, 1).some((r) => r.outputId === "C")).toBe(false);
  });
});

describe("getFarmingRows", () => {
  it("only sells what the market takes, at order book prices", () => {
    const rows = getFarmingRows(data, market(), { ...INSTANT, marketShare: 0.5 });
    expect(rows.map((r) => r.shardId)).toEqual(["F"]);
    const [farm] = rows;
    expect(farm.coinsPerHour).toBe(100 * 25);
    // Instant sells fill buy orders: 50/h, half of that is ours.
    expect(farm.volume).toBe(50);
    expect(farm.realisticCoinsPerHour).toBe(25 * 25);
    expect(farm.realCoinsPerHour).toBe(25 * 25);
    expect(farm.sellHours).toBe(0);
  });
});

describe("getFlipRows", () => {
  it("buys at the highest buy order and sells at the cheapest sell offer, after tax", () => {
    const flip = getFlipRows(market(), { taxPercent: 10, marketShare: 0.1 }).find((r) => r.shardId === "A")!;
    expect(flip.profit).toBeCloseTo(100 * 0.9 - 90);
    expect(flip.tenPercentOffer).toBe(99);
    expect(flip.tenPercentProfit).toBeCloseTo(99 * 0.9 - 90);
    // The slower side: both trade 1000/h; 10 % of it is ours.
    expect(flip.flipsPerHour).toBeCloseTo(100);
  });

  it("skips shards with an empty side", () => {
    const books = { ...market().orderBooks, A: { sellOffers: [], buyOrders: [level(90, 1)] } };
    expect(getFlipRows(market({ orderBooks: books }), { taxPercent: 0, marketShare: 1 }).some((r) => r.shardId === "A")).toBe(false);
  });
});

describe("getFarmFusionRows", () => {
  it("compares fusing what you farm with selling it", () => {
    const [fuse] = getFarmFusionRows(data, market(), INSTANT, 1);
    expect(fuse.farmedId).toBe("F");
    expect(fuse.boughtId).toBeNull();
    expect(fuse.farmedAmount).toBe(4);
    // Selling the 4 farmed shards would bring 4 × 25; the fusion's 2 R sell for 2 × 180.
    expect(fuse.sellValue).toBe(100);
    expect(fuse.revenue).toBe(360);
    expect(fuse.gain).toBe(260);
    // 100 farmed per hour, 4 per fusion.
    expect(fuse.fusionsPerHour).toBe(25);
  });
});

describe("getInventoryRows", () => {
  it("values owned shards at the sale price and at what the book pays", () => {
    const rows = getInventoryRows(
      data,
      market(),
      INSTANT,
      new Map([
        ["C", 5],
        ["A", 0],
        ["unknown", 3],
      ]),
    );
    expect(rows.map((r) => r.shardId)).toEqual(["C"]);
    const [stack] = rows;
    expect(stack.value).toBe(5 * 360);
    // The book only takes 2 of the 5.
    expect(stack.realValue).toBe(360 + 300);
  });
});
