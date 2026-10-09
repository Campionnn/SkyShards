import { describe, expect, it } from "vitest";
import { CalculationService } from "./calculationService";
import { InvCalculationService } from "./invCalculationService";
import { fmtCost, makeParams, serializeTree, sortedEntries } from "../test/fixtures";
import type { CalculationParams, InventoryRecipeTree, RecipeOverride } from "../types/types";

/**
 * Golden-output tests for `calculateOptimalPath` — the inventory-aware entry point.
 * Both the plain and cycle quantity paths are pinned here.
 *
 * These go through `parseData`, i.e. the real fetch/build path; see src/test/setup.ts.
 */

const svc = CalculationService.getInstance();
const invSvc = InvCalculationService.getInstance();

/** Maxed-player params, so the fortune and crocodile multipliers are non-trivial. */
const PARAMS: CalculationParams = makeParams({
  hunterFortune: 300,
  frogBonus: true,
  newtLevel: 10,
  salamanderLevel: 10,
  lizardKingLevel: 10,
  leviathanLevel: 10,
  crocodileLevel: 10,
});

/** What the calculator produces for `target` with no inventory at all. */
const plainPath = async (target: string, quantity: number, params = PARAMS, overrides: RecipeOverride[] = []) => {
  const data = await svc.parseData(params);
  const { choices } = svc.computeMinCosts(data, params, overrides);
  const cycleNodes = svc.findCycleNodes(choices);
  const tree = svc.buildRecipeTree(data, target, choices, cycleNodes, params, overrides);
  svc.assignQuantities(tree, quantity, data, { total: 0 }, choices, svc.calculateMultipliers(params).crocodileMultiplier, params, overrides);

  const { craftsNeeded, craftTime, totalQuantities } = svc.collectTreeStats(tree, params);
  return { data, totalQuantities, craftsNeeded, totalTime: svc.calculateTotalTimeFromQuantities(totalQuantities, craftTime, data, params) };
};

/**
 * An inventory the target actually uses: half of every raw material the plain path
 * needs. Derived from the data rather than hard-coded so it stays relevant if the
 * shipped recipes change.
 */
const halfOfMaterials = (totalQuantities: Map<string, number>): Map<string, number> =>
  new Map([...totalQuantities.entries()].filter(([, qty]) => qty > 1).map(([shardId, qty]) => [shardId, Math.floor(qty / 2)]));

const TARGETS: [target: string, quantity: number][] = [
  ["R94", 5], // deepest chain in the graph
  ["C67", 40],
  ["U57", 12],
];

describe("calculateOptimalPath", () => {
  it("returns an empty result for a shard that does not exist", async () => {
    const result = await invSvc.calculateOptimalPath("not-a-shard", 10, PARAMS, new Map());

    expect(result).toEqual({
      timePerShard: 0,
      totalTime: 0,
      totalShardsProduced: 0,
      craftsNeeded: 0,
      totalQuantities: new Map(),
      craftTime: 0,
      tree: { shard: "not-a-shard", method: "direct", quantity: 0 },
    });
  });

  for (const [target, quantity] of TARGETS) {
    it(`matches the plain path when the inventory is empty — ${target}`, async () => {
      const plain = await plainPath(target, quantity);
      const result = await invSvc.calculateOptimalPath(target, quantity, PARAMS, new Map());

      expect(result.craftsNeeded).toBe(plain.craftsNeeded);
      expect(sortedEntries(result.totalQuantities)).toEqual(sortedEntries(plain.totalQuantities));
      expect(result.totalTime).toBeCloseTo(plain.totalTime, 9);
      expect(result.totalShardsProduced).toBe(quantity);
      expect(result.timePerShard).toBeCloseTo(plain.totalTime / quantity, 9);
    });

    it(`pins the substituted tree and totals — ${target}`, async () => {
      const plain = await plainPath(target, quantity);
      const inventory = halfOfMaterials(plain.totalQuantities);
      const result = await invSvc.calculateOptimalPath(target, quantity, PARAMS, inventory);

      expect({
        craftsNeeded: result.craftsNeeded,
        totalTime: fmtCost(result.totalTime),
        totalQuantities: sortedEntries(result.totalQuantities),
        remainingInventory: sortedEntries(result.remainingInventory!),
        tree: serializeTree(result.tree!),
      }).toMatchSnapshot();
    });

    it(`never spends more time than ignoring the inventory — ${target}`, async () => {
      const plain = await plainPath(target, quantity);

      for (const inventory of [halfOfMaterials(plain.totalQuantities), new Map(plain.totalQuantities)]) {
        const result = await invSvc.calculateOptimalPath(target, quantity, PARAMS, new Map(inventory));

        // The guarantee calculateOptimalPath is written to provide: substitution only
        // ever replaces work with shards you already own.
        expect(result.totalTime, target).toBeLessThanOrEqual(plain.totalTime + 1e-9);
      }
    });

    it(`only ever consumes inventory it was given — ${target}`, async () => {
      const plain = await plainPath(target, quantity);
      const inventory = halfOfMaterials(plain.totalQuantities);
      const result = await invSvc.calculateOptimalPath(target, quantity, PARAMS, new Map(inventory));
      const remaining = result.remainingInventory!;

      for (const [shardId, owned] of inventory) {
        const left = remaining.get(shardId) ?? 0;
        expect(left, `${shardId} went negative`).toBeGreaterThanOrEqual(0);
        expect(left, `${shardId} gained stock`).toBeLessThanOrEqual(owned);
      }
      // Nothing may appear that was never owned.
      for (const shardId of remaining.keys()) {
        expect(inventory.has(shardId), `${shardId} appeared in remaining inventory`).toBe(true);
      }
    });
  }

  it("restructures onto an alternative recipe for shards the default path does not use", async () => {
    const [target, quantity] = TARGETS[0];
    const plain = await plainPath(target, quantity);
    // Deliberately off-path: none of these appear in the cheapest tree. Owning them
    // can still help, because `tryApplyInventoryAlternatives` may swap in a recipe
    // that consumes them — so this pins the alternatives path, which nothing else does.
    const offPath = new Map(
      Object.keys(plain.data.shards)
        .filter((shardId) => !plain.totalQuantities.has(shardId))
        .slice(0, 20)
        .map((shardId) => [shardId, 1000] as const)
    );

    const result = await invSvc.calculateOptimalPath(target, quantity, PARAMS, new Map(offPath));

    expect(result.totalTime).toBeLessThanOrEqual(plain.totalTime + 1e-9);
    expect({
      offPathOwned: [...offPath.keys()],
      consumed: sortedEntries(new Map([...offPath].map(([id, n]) => [id, n - (result.remainingInventory?.get(id) ?? 0)]).filter(([, used]) => used !== 0) as [string, number][])),
      totalTime: fmtCost(result.totalTime),
      plainTotalTime: fmtCost(plain.totalTime),
      totalQuantities: sortedEntries(result.totalQuantities),
    }).toMatchSnapshot();
  });

  /**
   * The user-reported Bramble case. Bramble is craftable as Rat + Glacite Walker or
   * Field Mouse + Glacite Walker, and only the first is the min-cost default.
   *
   * Owning a *token* amount of the default's input used to veto every alternative:
   * `calculateEffectiveCost` discounted an input on `inv >= fuse_amount` — enough for
   * a single craft — so 50 Rat against the 2500 the build needs priced the whole Rat
   * recipe as free. Nothing can beat free, so the 5000 Field Mouse were never
   * considered and the remaining 2450 Rat were farmed from scratch.
   */
  it("does not let a token amount of an input veto a fully-owned alternative — reported Bramble case", async () => {
    const inventory = new Map([
      ["R6", 10000], // Glacite Walker — shared by both recipes
      ["U91", 50],   // Rat — the default recipe's input, but only 50 of the 2500 needed
      ["U10", 5000], // Field Mouse — enough to cover the alternative outright
    ]);

    const result = await invSvc.calculateOptimalPath("U1", 1000, PARAMS, new Map(inventory));

    // Everything is on hand one way or the other, so nothing needs farming.
    expect(result.totalTime).toBe(0);
    expect(serializeTree(result.tree!)).toEqual([
      "U1 recipe qty=1000 crafts=500 [U10+R6 x2]",
      "  U10 inventory qty=2500",
      "  R6 inventory qty=2500",
    ]);
  });
});

describe("calculateOptimalPath — whole shard quantities", () => {
  /**
   * A reptile recipe's expected output is fractional (`outputQuantity *
   * crocodileMultiplier`, e.g. 2 * 1.2 = 2.4), so a split that credited a segment with
   * the raw product used to leave the next segment holding the fraction: a node with
   * `quantity` 0.20000000000000018, which the tree renders as "0x <shard>" while still
   * listing a full set of inputs and a fusion count.
   */
  const nonWholeNodes = (tree: InventoryRecipeTree, path = "root"): string[] => {
    if (Array.isArray(tree)) return tree.flatMap((branch, i) => nonWholeNodes(branch, `${path}[${i}]`));

    const bad: string[] = [];
    if (!Number.isInteger(tree.quantity)) bad.push(`${path} ${tree.shard} qty=${tree.quantity} (fractional)`);
    else if (tree.quantity <= 0) bad.push(`${path} ${tree.shard} qty=${tree.quantity} (node produces nothing)`);

    if (tree.method === "recipe") {
      bad.push(...nonWholeNodes(tree.inputs[0], `${path}.0`), ...nonWholeNodes(tree.inputs[1], `${path}.1`));
    } else if (tree.method === "cycle") {
      bad.push(...nonWholeNodes(tree.inputRecipe, `${path}.inputRecipe`));
      bad.push(...tree.cycleInputs.flatMap((input, i) => nonWholeNodes(input, `${path}.cycle[${i}]`)));
    }
    return bad;
  };

  /** The user-reported case: Dodo, built from an inventory that splits Condor across
   * three recipes. The third segment used to come out as "0x Condor = 5x Harpy + 2x
   * Titanoboa, fusions 1". */
  it("splits Condor into whole segments that add up — reported Dodo case", async () => {
    const inventory = new Map([
      ["L29", 2],   // Megalith
      ["C24", 367], // Harpy
      ["L6", 4],    // Tiamat
      ["L47", 2],   // Titanoboa
    ]);

    const result = await invSvc.calculateOptimalPath("L34", 2, PARAMS, inventory);
    expect(nonWholeNodes(result.tree!)).toEqual([]);
    expect(serializeTree(result.tree!)).toMatchSnapshot();
  });

  for (const [target, quantity] of TARGETS) {
    it(`keeps every node quantity a whole number — ${target}`, async () => {
      const plain = await plainPath(target, quantity);

      // Sweep the inventory depth: how much is owned decides how many segments a node
      // splits into, and it was the last, leftover segment that held the fraction.
      for (const share of [0.25, 0.5, 0.75, 0.9, 1]) {
        const inventory = new Map([...plain.totalQuantities].map(([shardId, qty]) => [shardId, Math.floor(qty * share)] as const));
        const result = await invSvc.calculateOptimalPath(target, quantity, PARAMS, inventory);

        expect(nonWholeNodes(result.tree!), `${target} @ ${share}`).toEqual([]);
      }
    });
  }
});

describe("calculateOptimalPath — cycle case", () => {
  /**
   * Cycles are only reachable through recipe overrides (see calculationService.test.ts),
   * so pin them explicitly here: this is the path that runs `processNode`'s inlined
   * copy of the cycle-quantity math.
   */
  const cycleParams = makeParams({ crocodileLevel: 10 });

  const cycleOverrides = async (secondInput: string): Promise<RecipeOverride[]> => {
    const data = await svc.parseData(cycleParams);
    return [
      { shardId: "C1", recipe: data.recipes.C1.find((r) => r.inputs[0] === "C4" && r.inputs[1] === "U8")! },
      { shardId: "C4", recipe: data.recipes.C4.find((r) => r.inputs[0] === "C1" && r.inputs[1] === secondInput)! },
    ];
  };

  for (const [label, secondInput] of [
    ["net-positive", "C2"],
    ["net-negative", "C1"],
  ] as const) {
    it(`pins the cycle tree with inventory applied — ${label}`, async () => {
      const overrides = await cycleOverrides(secondInput);
      const plain = await plainPath("C1", 100, cycleParams, overrides);
      const inventory = halfOfMaterials(plain.totalQuantities);

      const result = await invSvc.calculateOptimalPath("C1", 100, cycleParams, inventory, overrides);

      expect({
        craftsNeeded: result.craftsNeeded,
        totalTime: fmtCost(result.totalTime),
        totalQuantities: sortedEntries(result.totalQuantities),
        tree: serializeTree(result.tree!),
      }).toMatchSnapshot();
    });

    it(`keeps cycle crafts a whole number of loops — ${label}`, async () => {
      const overrides = await cycleOverrides(secondInput);

      for (const quantity of [1, 100, 1001]) {
        const result = await invSvc.calculateOptimalPath("C1", quantity, cycleParams, new Map(), overrides);
        const tree = result.tree;
        if (Array.isArray(tree) || tree?.method !== "cycle") throw new Error(`expected a cycle tree for qty=${quantity}`);

        expect(tree.craftsNeeded % tree.steps.length, `qty=${quantity}`).toBe(0);
        expect(tree.multiplier).toBe(svc.calculateMultipliers(cycleParams).crocodileMultiplier);
      }
    });
  }
});
