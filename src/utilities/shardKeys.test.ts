import { describe, expect, it } from "vitest";
import { compareShardKeys, sortShardsByNameWithPrefixAwareness } from "./shardKeys";

describe("compareShardKeys", () => {
  it("orders by rarity, base number, then suffix", () => {
    expect(["L1", "U17-1", "C2", "U18", "U17", "C10"].sort(compareShardKeys)).toEqual(["C2", "C10", "U17", "U17-1", "U18", "L1"]);
  });

  it("falls back to string order for keys it cannot parse", () => {
    expect(compareShardKeys("X1", "C1")).toBeGreaterThan(0);
  });
});

describe("sortShardsByNameWithPrefixAwareness", () => {
  it("sorts by id within a shared-prefix family, by name otherwise", () => {
    const shards = [
      { name: "Lizard King", id: "R8" },
      { name: "Bat", id: "C1" },
      { name: "Lizard", id: "C5" },
    ];
    expect(shards.sort(sortShardsByNameWithPrefixAwareness).map((s) => s.id)).toEqual(["C1", "C5", "R8"]);
  });
});
