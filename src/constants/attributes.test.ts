import { describe, expect, it } from "vitest";
import { MAX_QUANTITIES, fusedCountToTierLevel, maxQuantityForRarity } from "./attributes";

describe("fusedCountToTierLevel", () => {
  it.each([
    [0, "common", 0],
    [1, "common", 1],
    [3, "common", 1],
    [4, "common", 2],
    [95, "common", 9],
    [96, "Common", 10],
    [500, "legendary", 10],
    [1, "legendary", 1],
    [2, "legendary", 2],
    [5, "mythic", 0],
  ])("%s %s shards -> level %s", (count, rarity, level) => {
    expect(fusedCountToTierLevel(count, rarity)).toBe(level);
  });

  it("reaches level 10 exactly at the rarity's max quantity", () => {
    for (const [rarity, max] of Object.entries(MAX_QUANTITIES)) {
      expect(fusedCountToTierLevel(max - 1, rarity)).toBe(9);
      expect(fusedCountToTierLevel(max, rarity)).toBe(10);
    }
  });
});

describe("maxQuantityForRarity", () => {
  it("is case-insensitive and falls back to common", () => {
    expect(maxQuantityForRarity("Legendary")).toBe(24);
    expect(maxQuantityForRarity("rare")).toBe(48);
    expect(maxQuantityForRarity("unknown")).toBe(96);
  });
});
