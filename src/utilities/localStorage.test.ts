import { beforeEach, describe, expect, it } from "vitest";
import type { CalculationFormData } from "../schemas";
import { loadDisabledShards, loadFormData, loadHypixelProfileMeta, loadInventory, saveDisabledShards, saveFormData, saveInventory } from "./localStorage";

/**
 * Minimal in-memory `localStorage`. The vitest environment is `node`, so there isn't
 * one, and a real browser store would leak between tests anyway.
 */
class FakeStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  seed(key: string, value: string): void {
    this.map.set(key, value);
  }
}

let storage: FakeStorage;

beforeEach(() => {
  storage = new FakeStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage;
});

const validForm: CalculationFormData = {
  shard: "Paragon",
  quantity: 24,
  hunterFortune: 122,
  excludeChameleon: true,
  frogBonus: false,
  newtLevel: 10,
  salamanderLevel: 0,
  lizardKingLevel: 3,
  leviathanLevel: 4,
  pythonLevel: 5,
  kingCobraLevel: 6,
  seaSerpentLevel: 7,
  tiamatLevel: 8,
  crocodileLevel: 10,
  kuudraTier: "t5",
  moneyPerHour: 2_000_000,
  customKuudraTime: true,
  kuudraTimeSeconds: 90,
  noWoodenBait: true,
  ironManView: true,
  instantBuyPrices: false,
  craftPenalty: 0.8,
  materialsOnly: false,
  selectedShardKeys: ["C35", "U8"],
  shardQuantities: [{ shard: { id: "C35" }, quantity: 2 }],
};

/** What we expect to come back: everything except the two per-session fields. */
const persistedPart = (form: CalculationFormData): Record<string, unknown> => {
  const rest: Record<string, unknown> = { ...form };
  delete rest.shard;
  delete rest.quantity;
  return rest;
};

describe("saved form round trip", () => {
  it("keeps every field except the two that are deliberately not persisted", () => {
    saveFormData(validForm);
    expect(loadFormData()).toEqual(persistedPart(validForm));
  });

  it("keeps a freshly-defaulted form intact", () => {
    const defaults: CalculationFormData = { ...validForm, hunterFortune: 0, crocodileLevel: 0, kuudraTier: "none", customKuudraTime: false, kuudraTimeSeconds: null, craftPenalty: 1000, selectedShardKeys: [], shardQuantities: [] };
    saveFormData(defaults);
    expect(loadFormData()).toEqual(persistedPart(defaults));
  });

  it("stores Infinity money-per-hour as null, since JSON has no Infinity", () => {
    // Pre-existing behaviour, pinned so the validation isn't blamed for it: the form
    // re-applies Infinity on mount when the value comes back null.
    saveFormData({ ...validForm, moneyPerHour: Infinity });
    expect(loadFormData()?.moneyPerHour).toBeNull();
  });
});

describe("saved form validation", () => {
  const load = (stored: unknown) => {
    storage.seed("calculator_data", JSON.stringify(stored));
    return loadFormData();
  };

  it("drops only the offending field, keeping the rest", () => {
    const loaded = load({ hunterFortune: -5, crocodileLevel: 7, ironManView: true });
    expect(loaded).toEqual({ crocodileLevel: 7, ironManView: true });
  });

  it("drops fields whose type is wrong", () => {
    expect(load({ hunterFortune: "122", crocodileLevel: 7 })).toEqual({ crocodileLevel: 7 });
  });

  it("drops out-of-range shard levels", () => {
    expect(load({ crocodileLevel: 11, tiamatLevel: 10 })).toEqual({ tiamatLevel: 10 });
  });

  it("drops an unrecognised kuudra tier", () => {
    expect(load({ kuudraTier: "t9", noWoodenBait: true })).toEqual({ noWoodenBait: true });
  });

  it("drops keys the schema does not know about", () => {
    expect(load({ ironManView: false, somethingRemoved: 1 })).toEqual({ ironManView: false });
  });

  it("returns null for a stored value that is not an object", () => {
    expect(load("just a string")).toBeNull();
    expect(load([1, 2, 3])).toBeNull();
    expect(load(null)).toBeNull();
  });

  it("returns null rather than throwing on unparseable JSON", () => {
    const warn = console.warn;
    console.warn = () => {}; // this path warns by design; keep the test output clean
    try {
      storage.seed("calculator_data", "{not json");
      expect(loadFormData()).toBeNull();
    } finally {
      console.warn = warn;
    }
  });
});

describe("inventory validation", () => {
  it("round trips counts unchanged", () => {
    const inventory = new Map([["C35", 40], ["L6", 2]]);
    saveInventory(inventory);
    expect(loadInventory()).toEqual(inventory);
  });

  it("drops entries that are not finite numbers instead of storing NaN", () => {
    storage.seed("inventory", JSON.stringify({ C35: 40, U8: "abc", R8: null, E5: 12, L6: "7" }));
    // "7" coerces cleanly and is kept; "abc" -> NaN and null -> 0 are the interesting cases.
    expect(loadInventory()).toEqual(new Map([["C35", 40], ["R8", 0], ["E5", 12], ["L6", 7]]));
  });

  it("falls back to empty when the stored value is not an object", () => {
    storage.seed("inventory", JSON.stringify([1, 2, 3]));
    expect(loadInventory()).toEqual(new Map());
  });
});

describe("disabled shards validation", () => {
  it("round trips ids unchanged", () => {
    const disabled = new Set(["C35", "U8"]);
    saveDisabledShards(disabled);
    expect(loadDisabledShards()).toEqual(disabled);
  });

  it("keeps only strings", () => {
    storage.seed("inventory_disabled_shards", JSON.stringify(["C35", 7, null, "U8"]));
    expect(loadDisabledShards()).toEqual(new Set(["C35", "U8"]));
  });

  it("falls back to empty for a non-array", () => {
    storage.seed("inventory_disabled_shards", JSON.stringify({ C35: true }));
    expect(loadDisabledShards()).toEqual(new Set());
  });
});

describe("profile meta validation", () => {
  it("rejects a partial record rather than rendering undefined", () => {
    storage.seed("hypixel_profile_meta", JSON.stringify({ username: "someone" }));
    expect(loadHypixelProfileMeta()).toBeNull();
  });

  it("accepts a complete record", () => {
    const meta = { username: "someone", profileName: "Mango", lastImportTime: 1_700_000_000_000 };
    storage.seed("hypixel_profile_meta", JSON.stringify(meta));
    expect(loadHypixelProfileMeta()).toEqual(meta);
  });
});
