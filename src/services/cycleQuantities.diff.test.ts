import { describe, expect, it } from "vitest";
import { CalculationService } from "./calculationService";
import type { Data, Recipe, Shard } from "../types/types";

/**
 * Differential test for `computeCycleQuantities` against an independent reference
 * implementation of the same math.
 *
 * The goldens only pin the two cycle shapes the shipped data can reach via recipe
 * overrides. A cycle can in principle arise from any set of chosen recipes, and the
 * data changes with every sync, so this exercises a wide space of synthetic cycles —
 * including shapes the current data cannot produce.
 *
 * `referenceCycleMath` is the independent implementation. Do not refactor it to share
 * code with the function under test; its value is being written separately.
 */

const svc = CalculationService.getInstance();

type Step = { outputShard: string; recipe: Recipe };

/** Independent implementation of the cycle quantity math, for comparison. */
const referenceCycleMath = (
  treeShard: string,
  steps: Step[],
  requiredQuantity: number,
  data: Data,
  crocodileMultiplier: number
): { roundedCrafts: number; stepCount: number; inputQuantities: Map<string, number> } | null => {
  const outputStep = steps.find((step) => step.outputShard === treeShard);
  if (!outputStep) return null;

  const recipe = outputStep.recipe;
  const baseOutput = recipe.outputQuantity;
  const expectedOutput = recipe.isReptile ? baseOutput * crocodileMultiplier : baseOutput;

  let totalInputsConsumed = 0;
  steps.forEach((step) => {
    step.recipe.inputs.forEach((inputId) => {
      if (inputId === treeShard) {
        const inputShard = data.shards[inputId];
        totalInputsConsumed += inputShard.fuse_amount;
      }
    });
  });

  const netOutputPerCycle = expectedOutput - totalInputsConsumed;
  const expectedCrafts = netOutputPerCycle > 0 ? Math.ceil(requiredQuantity / netOutputPerCycle) : Math.ceil(requiredQuantity / expectedOutput);
  const stepCount = steps.length;
  const roundedCrafts = Math.ceil(expectedCrafts / stepCount) * stepCount;

  const inputQuantities = new Map<string, number>();
  const outputShards = new Set(steps.map((step) => step.outputShard));

  steps.forEach((step) => {
    step.recipe.inputs.forEach((inputId) => {
      if (!outputShards.has(inputId)) {
        const inputShard = data.shards[inputId];
        const currentQuantity = inputQuantities.get(inputId) || 0;
        inputQuantities.set(inputId, currentQuantity + inputShard.fuse_amount);
      }
    });
  });

  return { roundedCrafts, stepCount, inputQuantities };
};

/** Deterministic PRNG so a failure is reproducible from the seed alone. */
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x100000000;
};

const makeShard = (id: string, fuseAmount: number): Shard => ({
  id,
  name: id,
  family: "Test Family",
  type: "Global",
  rarity: "common",
  fuse_amount: fuseAmount,
  internal_id: id,
  rate: 1,
});

/**
 * Builds a random loop of `stepCount` shards plus some external inputs, deliberately
 * covering shapes the real data never produces: self-consuming recipes, zero output
 * quantities, and fuse amounts large enough to make the cycle net-negative.
 */
const randomCycle = (next: () => number) => {
  const stepCount = 1 + Math.floor(next() * 5);
  const loop = Array.from({ length: stepCount }, (_, i) => `L${i}`);
  const externals = ["X0", "X1", "X2"];

  const shards: Record<string, Shard> = {};
  for (const id of [...loop, ...externals]) shards[id] = makeShard(id, 1 + Math.floor(next() * 8));

  const steps: Step[] = loop.map((outputShard, i) => {
    const nextInLoop = loop[(i + 1) % stepCount];
    // Sometimes consume the loop's own head, sometimes an external shard, and
    // sometimes the output itself — a shape the shipped recipes never contain.
    const pick = next();
    const second = pick < 0.35 ? externals[Math.floor(next() * externals.length)] : pick < 0.7 ? loop[Math.floor(next() * stepCount)] : outputShard;

    return {
      outputShard,
      recipe: {
        inputs: [nextInLoop, second] as [string, string],
        // 0 is included on purpose: it drives expectedOutput to 0 and the division to Infinity.
        outputQuantity: Math.floor(next() * 5),
        isReptile: next() < 0.5,
      },
    };
  });

  return { data: { shards, recipes: {} } as Data, steps, loop, externals };
};

describe("computeCycleQuantities matches the code it replaced", () => {
  it("agrees on 20000 randomly generated cycles", () => {
    const next = rng(0x5EED);
    const mismatches: string[] = [];
    let nulls = 0;
    let infinite = 0;

    for (let i = 0; i < 20000; i++) {
      const { data, steps, loop, externals } = randomCycle(next);
      const target = next() < 0.1 ? "not-in-loop" : loop[Math.floor(next() * loop.length)];
      const crocodileMultiplier = 1 + (2 * Math.floor(next() * 11)) / 100;
      const requiredQuantity = [0, 1, 3, 17, 100, 1001, 999999][Math.floor(next() * 7)];

      const expected = referenceCycleMath(target, steps, requiredQuantity, data, crocodileMultiplier);
      const actual = svc.computeCycleQuantities(target, steps, requiredQuantity, data, crocodileMultiplier);

      if (expected === null || actual === null) {
        if (expected !== actual) mismatches.push(`#${i} null disagreement: ${expected} vs ${actual}`);
        nulls++;
        continue;
      }
      if (!isFinite(expected.roundedCrafts)) infinite++;

      // Object.is, not toBe on a number: it separates NaN and -0, both reachable here.
      if (!Object.is(expected.roundedCrafts, actual.roundedCrafts)) {
        mismatches.push(`#${i} roundedCrafts ${expected.roundedCrafts} vs ${actual.roundedCrafts}`);
      }
      if (expected.stepCount !== actual.stepCount) {
        mismatches.push(`#${i} stepCount ${expected.stepCount} vs ${actual.stepCount}`);
      }

      for (const shardId of [...loop, ...externals, "absent-shard"]) {
        const before = (expected.inputQuantities.get(shardId) || 0) * (expected.roundedCrafts / expected.stepCount);
        const after = actual.quantityForInput(shardId);
        if (!Object.is(before, after)) mismatches.push(`#${i} ${shardId} quantity ${before} vs ${after}`);
      }
    }

    expect(mismatches.slice(0, 10)).toEqual([]);
    // Guard against the loop silently degenerating into trivial cases.
    expect(nulls).toBeGreaterThan(100);
    expect(infinite).toBeGreaterThan(100);
  });

  it("agrees on hand-picked degenerate shapes", () => {
    const shards: Record<string, Shard> = {
      A: makeShard("A", 2),
      B: makeShard("B", 3),
      X: makeShard("X", 5),
    };
    const data = { shards, recipes: {} } as Data;

    const r = (inputs: [string, string], outputQuantity: number, isReptile: boolean): Recipe => ({ inputs, outputQuantity, isReptile });

    const cases: { name: string; target: string; steps: Step[]; quantity: number; croc: number }[] = [
      { name: "single self-consuming step", target: "A", steps: [{ outputShard: "A", recipe: r(["A", "X"], 3, false) }], quantity: 10, croc: 1.2 },
      { name: "net output exactly zero", target: "A", steps: [{ outputShard: "A", recipe: r(["A", "X"], 2, false) }], quantity: 10, croc: 1 },
      { name: "zero output quantity", target: "A", steps: [{ outputShard: "A", recipe: r(["B", "X"], 0, false) }], quantity: 10, croc: 1.2 },
      { name: "zero required quantity", target: "A", steps: [{ outputShard: "A", recipe: r(["B", "X"], 2, true) }], quantity: 0, croc: 1.2 },
      { name: "target absent from steps", target: "B", steps: [{ outputShard: "A", recipe: r(["B", "X"], 2, false) }], quantity: 10, croc: 1.2 },
      { name: "target consumed twice in one recipe", target: "A", steps: [{ outputShard: "A", recipe: r(["A", "A"], 5, true) }], quantity: 7, croc: 1.2 },
      { name: "crocodile multiplier of 1", target: "A", steps: [{ outputShard: "A", recipe: r(["B", "X"], 2, true) }], quantity: 7, croc: 1 },
      {
        name: "two-step loop, both reptile",
        target: "A",
        steps: [
          { outputShard: "A", recipe: r(["B", "X"], 2, true) },
          { outputShard: "B", recipe: r(["A", "X"], 2, true) },
        ],
        quantity: 100,
        croc: 1.2,
      },
    ];

    for (const { name, target, steps, quantity, croc } of cases) {
      const expected = referenceCycleMath(target, steps, quantity, data, croc);
      const actual = svc.computeCycleQuantities(target, steps, quantity, data, croc);

      if (expected === null) {
        expect(actual, name).toBeNull();
        continue;
      }
      expect(actual, name).not.toBeNull();
      expect(Object.is(actual!.roundedCrafts, expected.roundedCrafts), `${name}: crafts ${actual!.roundedCrafts} vs ${expected.roundedCrafts}`).toBe(true);

      for (const shardId of ["A", "B", "X", "absent"]) {
        const before = (expected.inputQuantities.get(shardId) || 0) * (expected.roundedCrafts / expected.stepCount);
        expect(Object.is(actual!.quantityForInput(shardId), before), `${name}: ${shardId}`).toBe(true);
      }
    }
  });
});
