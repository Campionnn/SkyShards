import { describe, expect, it } from "vitest";
import { formatLargeNumber, formatNumber, formatQuantity, formatTime } from "./format";

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
    expect(formatLargeNumber(2_340_000_000)).toBe("2.34B");
    expect(formatLargeNumber(1_000)).toBe("1K");
    expect(formatLargeNumber(12.5)).toBe("12.50");
    expect(formatLargeNumber(7)).toBe("7");
  });
});

describe("formatQuantity", () => {
  it("rounds to two decimals without trailing zeros", () => {
    expect(formatQuantity(3)).toBe("3");
    expect(formatQuantity(2.456)).toBe("2.46");
  });
});
