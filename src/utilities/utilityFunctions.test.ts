import { describe, expect, it } from "vitest";
import { compareShardKeys, formatLargeNumber, formatNumber, formatTime } from "./utilityFunctions";

describe("formatTime", () => {
  it.each([
    [0, "0 sec"],
    [30 / 3600, "30 sec"],
    [5 / 60, "5 min"],
    [2, "2 hr"],
    [2 + 5 / 60, "2 hr 5 min"],
    [1.9999, "2 hr"],
    [27, "1 d 3 hr 0 min"],
    [23.9999, "1 d 0 hr 0 min"],
  ])("%s hours -> %s", (hours, expected) => {
    expect(formatTime(hours)).toBe(expected);
  });

  it("passes non-finite input through", () => {
    expect(formatTime(Infinity)).toBe("Infinity");
  });
});

describe("formatNumber / formatLargeNumber", () => {
  it("formats small and large numbers", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(0.005)).toBe("0.0050");
    expect(formatNumber(3)).toBe("3");
    expect(formatLargeNumber(1_500_000)).toBe("1.50M");
    expect(formatLargeNumber(-2000)).toBe("-2K");
  });
});

describe("compareShardKeys", () => {
  it("orders by rarity, base number, then suffix", () => {
    expect(["L1", "U17-1", "C2", "U18", "U17", "C10"].sort(compareShardKeys)).toEqual(["C2", "C10", "U17", "U17-1", "U18", "L1"]);
  });
});
