import { describe, expect, it } from "vitest";
import { maxQuantityForRarity } from "../constants";
import { makeParams } from "../test/fixtures";
import type { Data } from "../types/types";
import {
  MIN_SAVINGS_SHARE,
  NON_ATTRIBUTE_SHARDS,
  RARITY_ORDER,
  optimizeAttributes,
  type AttributeOptimization,
  type OptimizeOptions,
  type Rarity,
} from "./attributeOptimizer";
import { CalculationService } from "./calculationService";
import { InvCalculationService } from "./invCalculationService";

/** Goes through parseData, i.e. the real fetch/build path; see src/test/setup.ts. */
const PARAMS = makeParams({ hunterFortune: 200, craftPenalty: 0.8 });
const invSvc = InvCalculationService.getInstance();

const loadData = () => CalculationService.getInstance().parseData(PARAMS);
const cap = (data: Data, shardId: string) => maxQuantityForRarity(data.shards[shardId].rarity);
const rank = (data: Data, shardId: string, order: readonly Rarity[]) => order.indexOf(data.shards[shardId].rarity as Rarity);

/** Every shard maxed except `unmaxed`, which start at `fused`. */
const attributesExcept = (data: Data, unmaxed: Record<string, number>) =>
  new Map(Object.keys(data.shards).map((shardId) => [shardId, unmaxed[shardId] ?? cap(data, shardId)]));

/** An uncommon whose cheapest max is fused, not farmed, so owning its materials matters. */
const fusedTarget = async (data: Data) => {
  const attributes = attributesExcept(data, {});
  for (const shardId of Object.keys(data.shards).sort()) {
    if (data.shards[shardId].rarity !== "uncommon") continue;
    const result = await invSvc.calculateOptimalPath(shardId, cap(data, shardId), PARAMS, new Map(), [], attributes);
    if (result.craftsNeeded > 0 && !result.totalQuantities.has(shardId)) return { shardId, materials: result.totalQuantities };
  }
  throw new Error("no fused uncommon in the data");
};

const optimize = async (inventory: Map<string, number>, attributes: Map<string, number>, options: OptimizeOptions = {}) =>
  optimizeAttributes(await invSvc.createPlanner(PARAMS, [], attributes), inventory, attributes, options);

/** Deterministic pseudo-random profile: a third of the attributes unfinished, a spread of owned shards. */
const randomProfile = (data: Data, seed: number) => {
  const ids = Object.keys(data.shards).sort();
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const attributes = new Map(ids.map((shardId) => [shardId, random() < 0.33 ? Math.floor(random() * cap(data, shardId)) : cap(data, shardId)]));
  const inventory = new Map(ids.filter(() => random() < 0.5).map((shardId) => [shardId, 1 + Math.floor(random() * 150)]));
  return { attributes, inventory };
};

/** The invariants every plan must keep, whatever the inventory. */
const expectConsistent = (
  data: Data,
  inventory: Map<string, number>,
  attributes: Map<string, number>,
  plan: AttributeOptimization,
  { rarityOrder = RARITY_ORDER, minSavingsShare = MIN_SAVINGS_SHARE }: OptimizeOptions = {},
) => {
  // Chameleon has no attribute.
  expect(
    [...plan.absorbs, ...plan.completions].some((step) => step.shardId === "L4"),
    "Chameleon planned",
  ).toBe(false);

  // Shards are accounted for: what is left plus what was absorbed or used is what was owned.
  const spent = new Map<string, number>();
  const add = (shardId: string, quantity: number) => spent.set(shardId, (spent.get(shardId) ?? 0) + quantity);
  plan.absorbs.forEach(({ shardId, quantity }) => add(shardId, quantity));
  plan.completions.forEach(({ inventoryUsed }) => inventoryUsed.forEach((quantity, shardId) => add(shardId, quantity)));
  for (const [shardId, owned] of inventory) {
    expect((plan.remainingInventory.get(shardId) ?? 0) + (spent.get(shardId) ?? 0), shardId).toBe(owned);
  }

  // Nothing is absorbed past the cap.
  for (const step of plan.absorbs) {
    expect(step.fusedAfter, step.shardId).toBeLessThanOrEqual(cap(data, step.shardId));
    expect(step.fusedBefore, step.shardId).toBe(attributes.get(step.shardId) ?? 0);
  }

  // No waste: a completion only ever consumes shards whose own attribute is already maxed.
  const maxed = new Set([...attributes].filter(([shardId, fused]) => data.shards[shardId] && fused >= cap(data, shardId)).map(([shardId]) => shardId));
  plan.absorbs.filter((step) => step.completes).forEach((step) => maxed.add(step.shardId));
  // Shards without an attribute have nothing to save them for.
  NON_ATTRIBUTE_SHARDS.forEach((shardId) => maxed.add(shardId));
  for (const step of plan.completions) {
    for (const shardId of step.inventoryUsed.keys()) expect(maxed.has(shardId), `${step.shardId} uses unmaxed ${shardId}`).toBe(true);
    expect(step.fusedBefore + step.quantity, step.shardId).toBe(cap(data, step.shardId));
    expect(step.inventoryUsed.size, step.shardId).toBeGreaterThan(0);
    maxed.add(step.shardId);
  }

  // From-inventory completions first, each group in rarity order; mixed ones save at least the minimum share.
  const free = plan.completions.filter((step) => step.fromInventoryOnly);
  const mixed = plan.completions.filter((step) => !step.fromInventoryOnly);
  expect(plan.completions, "from-inventory completions come first").toEqual([...free, ...mixed]);
  free.forEach((step) => expect(step.materials.size, step.shardId).toBe(0));
  mixed.forEach((step) => expect(step.baselineCost - step.extraCost, step.shardId).toBeGreaterThanOrEqual(minSavingsShare * step.baselineCost));
  [...free, ...mixed].forEach((step) => expect(rank(data, step.shardId, rarityOrder), `${step.shardId} rarity not chosen`).toBeGreaterThanOrEqual(0));
  for (const run of [free, mixed]) {
    for (let i = 1; i < run.length; i++) {
      expect(rank(data, run[i].shardId, rarityOrder), run[i].shardId).toBeGreaterThanOrEqual(rank(data, run[i - 1].shardId, rarityOrder));
    }
  }
};

describe("optimizeAttributes", () => {
  it("absorbs owned shards into their own attribute up to the cap and keeps the rest", async () => {
    const data = await loadData();
    const attributes = attributesExcept(data, { U1: 10 });
    const inventory = new Map([["U1", 100]]);

    const plan = await optimize(inventory, attributes);

    expect(plan.absorbs).toEqual([{ shardId: "U1", quantity: 54, fusedBefore: 10, fusedAfter: 64, completes: true }]);
    expect(plan.completions).toEqual([]);
    expect(plan.remainingInventory.get("U1")).toBe(46);
    expect(plan.totals.attributesMaxed).toBe(1);
  });

  it("completes an attribute from surplus alone when the surplus covers it", async () => {
    const data = await loadData();
    const { shardId: target, materials } = await fusedTarget(data);
    const attributes = attributesExcept(data, { [target]: 0 });
    // Own every raw material the cheapest tree for a full max needs, with every one of those attributes maxed.
    const inventory = new Map([...materials].map(([shardId, quantity]) => [shardId, Math.ceil(quantity)]));

    const plan = await optimize(inventory, attributes);

    expect(plan.completions.map((step) => step.shardId)).toEqual([target]);
    expect(plan.completions[0].materials.size).toBe(0);
    expect(plan.attributes.get(target)).toBe(cap(data, target));
    expectConsistent(data, inventory, attributes, plan);
  });

  it("never fuses away a shard its own unfinished attribute needs", async () => {
    const data = await loadData();
    const { shardId: target, materials } = await fusedTarget(data);
    const attributes = attributesExcept(data, { [target]: 0 });
    const inventory = new Map([...materials].map(([shardId, quantity]) => [shardId, Math.ceil(quantity)]));
    // Un-max the attribute of the most-used material: those shards must now be absorbed, not fused.
    const [material] = [...inventory].sort((a, b) => b[1] - a[1])[0];
    attributes.set(material, 0);

    const plan = await optimize(inventory, attributes);

    expect(plan.absorbs.find((step) => step.shardId === material)?.quantity).toBe(Math.min(inventory.get(material)!, cap(data, material)));
    expectConsistent(data, inventory, attributes, plan);
  });

  it("keeps its invariants on a large mixed inventory", async () => {
    const data = await loadData();
    const { attributes, inventory } = randomProfile(data, 7);

    const started = Date.now();
    const plan = await optimize(inventory, attributes);
    console.log(
      `  large inventory: ${Date.now() - started}ms, ${plan.absorbs.length} absorbs, ${plan.completions.length} completions ` +
        `(${plan.completions.filter((step) => step.fromInventoryOnly).length} from inventory alone)`,
    );

    expect(plan.totals.attributesMaxed).toBeGreaterThan(0);
    expectConsistent(data, inventory, attributes, plan);
  });

  it("follows the chosen rarity order and minimum saving", async () => {
    const data = await loadData();
    const { attributes, inventory } = randomProfile(data, 11);
    const options: OptimizeOptions = { rarityOrder: ["legendary", "epic", "rare"], minSavingsShare: 0.6 };

    const plan = await optimize(inventory, attributes, options);

    expect(plan.completions.length).toBeGreaterThan(0);
    expectConsistent(data, inventory, attributes, plan, options);
  });

  it("never plans Chameleon, which has no attribute", async () => {
    const data = await loadData();
    const attributes = attributesExcept(data, { L4: 0 });

    const plan = await optimize(new Map([["L4", 30]]), attributes);

    expect(plan.absorbs).toEqual([]);
    expect(plan.completions).toEqual([]);
    expect(plan.remainingInventory.get("L4")).toBe(30);
  });

  it("stops when aborted", async () => {
    const data = await loadData();
    const attributes = attributesExcept(data, { U57: 0, R9: 0 });
    const controller = new AbortController();
    controller.abort();
    const planner = await invSvc.createPlanner(PARAMS, [], attributes);

    let error: unknown = null;
    try {
      await optimizeAttributes(planner, new Map([["C1", 500]]), attributes, { signal: controller.signal });
    } catch (err) {
      error = err;
    }
    expect((error as Error)?.name).toBe("AbortError");
  });
});
