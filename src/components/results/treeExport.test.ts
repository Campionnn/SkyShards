import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { CalculationService } from "../../services/calculationService";
import { InvCalculationService } from "../../services/invCalculationService";
import { makeParams } from "../../test/fixtures";
import type { Data, InventoryRecipeTree, RecipeTree, TreeExportOptions } from "../../types/types";
import { noFrillsTreeString, noFrillsTreesString, skyHanniMaterialsString, skyHanniTreeString, skyHanniTreesString } from "./treeExport";

/**
 * The Copy Tree exports, decoded back to JSON. Trees come from the real calculator
 * (see src/test/setup.ts), so the tests follow the shipped recipes rather than a
 * hand-built tree.
 */

type Entry = { name: string; needed: number; source?: string };

const decode = (exported: string): Entry[] => {
  const payload = exported.slice(exported.indexOf("):") + 2);
  return JSON.parse(gunzipSync(Buffer.from(payload, "base64")).toString("utf8")) as Entry[];
};

/** name (plus NoFrills source) -> amount, so a test doesn't depend on entry order. */
const amounts = (exported: string): Record<string, number> =>
  Object.fromEntries(decode(exported).map((entry) => [entry.source ? `${entry.name}|${entry.source}` : entry.name, entry.needed]));

const options = (overrides: Partial<TreeExportOptions> = {}): TreeExportOptions => ({ countOwned: false, includeFused: false, allTrees: false, ...overrides });

const PARAMS = makeParams({ hunterFortune: 300 });
const inv = InvCalculationService.getInstance();

const loadData = (): Promise<Data> => CalculationService.getInstance().parseData(PARAMS);

/** A tree with no inventory, and the same demand with half of every raw material owned. */
const withHalfOwned = async (target: string, quantity: number) => {
  const plain = await inv.calculateOptimalPath(target, quantity, PARAMS, new Map());
  const owned = new Map([...plain.totalQuantities].map(([shardId, needed]) => [shardId, Math.floor(needed / 2)]));
  const withInventory = await inv.calculateOptimalPath(target, quantity, PARAMS, owned);
  return { plain: plain.tree as InventoryRecipeTree, withInventory: withInventory.tree as InventoryRecipeTree, owned };
};

const sum = (values: Record<string, number>) => Object.values(values).reduce((total, value) => total + value, 0);

describe("inventory tree export", () => {
  it("leaves owned shards out unless countOwned is on", async () => {
    const data = await loadData();
    const { plain, withInventory, owned } = await withHalfOwned("C67", 40);
    expect(owned.size).toBeGreaterThan(0);

    const remaining = amounts(skyHanniTreeString(withInventory, data, options()));
    const full = amounts(skyHanniTreeString(plain, data, options()));
    expect(sum(remaining)).toBeLessThan(sum(full));

    // Counting owned shards brings every amount back to what the tree needs in total.
    expect(amounts(skyHanniTreeString(withInventory, data, options({ countOwned: true })))).toEqual(full);
    expect(amounts(noFrillsTreeString(withInventory, data, options({ countOwned: true })))).toEqual(amounts(noFrillsTreeString(plain, data, options())));
  });

  it("exports whole shard amounts only", async () => {
    const data = await loadData();
    const { withInventory } = await withHalfOwned("R94", 5);
    for (const countOwned of [false, true]) {
      for (const entry of decode(skyHanniTreeString(withInventory, data, options({ countOwned })))) {
        expect(Number.isInteger(entry.needed), `${entry.name} ${entry.needed}`).toBe(true);
      }
    }
  });

  it("lists fused shards for SkyHanni only with includeFused", async () => {
    const data = await loadData();
    const { plain } = await withHalfOwned("C67", 40);
    const directOnly = amounts(skyHanniTreeString(plain, data, options()));
    const withFused = amounts(skyHanniTreeString(plain, data, options({ includeFused: true })));

    // NoFrills always tags fused shards, so its fused entries are exactly what SkyHanni adds.
    const fused = Object.fromEntries(
      Object.entries(amounts(noFrillsTreeString(plain, data, options())))
        .filter(([key]) => !key.endsWith("|Direct"))
        .map(([key, needed]) => [key.slice(0, key.lastIndexOf("|")), needed]),
    );
    expect(Object.keys(fused).length).toBeGreaterThan(0);
    expect(withFused).toEqual({ ...directOnly, ...fused });
  });
});

describe("multi-tree export", () => {
  it("adds up the trees to the same totals as the materials list", async () => {
    const data = await loadData();
    const first = await inv.calculateOptimalPath("C67", 10, PARAMS, new Map());
    const second = await inv.calculateOptimalPath("U57", 6, PARAMS, new Map());
    const trees = [first.tree, second.tree] as RecipeTree[];

    const totals = new Map<string, number>();
    for (const quantities of [first.totalQuantities, second.totalQuantities]) {
      for (const [shardId, needed] of quantities) totals.set(shardId, (totals.get(shardId) || 0) + needed);
    }

    expect(amounts(skyHanniTreesString(trees, data, options({ allTrees: true })))).toEqual(amounts(skyHanniMaterialsString(totals, data)));
  });

  it("keeps each shard's source in the NoFrills export", async () => {
    const data = await loadData();
    const tree = (await inv.calculateOptimalPath("C67", 10, PARAMS, new Map())).tree as RecipeTree;
    // The same tree twice: every amount doubles, nothing gets merged across sources.
    const single = amounts(noFrillsTreeString(tree, data, options()));
    const doubled = amounts(noFrillsTreesString([tree, tree], data, options({ allTrees: true })));
    expect(doubled).toEqual(Object.fromEntries(Object.entries(single).map(([key, needed]) => [key, needed * 2])));
  });
});
