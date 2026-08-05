import { describe, expect, it } from "vitest";
import { CalculationService } from "./calculationService";
import { coinValueRates, fmtCost, loadDefaultRates, loadFusionJson, makeParams, serializeTree, summarizeMinCosts } from "../test/fixtures";
import type { CalculationParams, Data, Recipe, RecipeOverride, RecipeTree } from "../types/types";

/**
 * Golden-output tests for the three functions that *are* the product:
 * `computeMinCosts`, `buildRecipeTree` and `assignQuantities`.
 *
 * Two kinds of assertion live here, deliberately:
 *  - snapshots, which pin today's exact numbers so any behaviour change surfaces; and
 *  - property assertions, which state *why* those numbers are right. A snapshot alone
 *    is only as good as whoever presses `-u`, so the invariants are spelled out too.
 */

const svc = CalculationService.getInstance();

/** buildData is pure, so scenarios can share one parse of the JSON. */
const fusionJson = loadFusionJson();
const defaultRates = loadDefaultRates();

const buildScenario = (overrides: Partial<CalculationParams> = {}) => {
  const params = makeParams(overrides);
  return { params, data: svc.buildData(fusionJson, defaultRates, params) };
};

const SCENARIOS = {
  /** Neutral: in-game time cost, no fortune, no pets. */
  default: {},
  /** Everything a maxed player would have on, so the fortune/multiplier paths run. */
  maxed: {
    hunterFortune: 300,
    frogBonus: true,
    newtLevel: 10,
    salamanderLevel: 10,
    lizardKingLevel: 10,
    leviathanLevel: 10,
    pythonLevel: 10,
    kingCobraLevel: 100,
    seaSerpentLevel: 10,
    tiamatLevel: 10,
    crocodileLevel: 10,
  },
  /** Ironman-off pricing: cost is coins, and craftPenalty is used raw (not /3600). */
  coinValue: { rateAsCoinValue: true, customRates: coinValueRates(), craftPenalty: 1000 },
  /** The two rate overrides that bypass the normal rates.json path. */
  kuudraAndBait: { kuudraTier: "t5" as const, moneyPerHour: 50_000_000, noWoodenBait: true, excludeChameleon: true },
} satisfies Record<string, Partial<CalculationParams>>;

describe("computeMinCosts", () => {
  for (const [name, overrides] of Object.entries(SCENARIOS)) {
    it(`pins the cost of every shard — ${name}`, () => {
      const { params, data } = buildScenario(overrides);
      const { minCosts, choices } = svc.computeMinCosts(data, params);

      expect(summarizeMinCosts(data, minCosts, choices).join("\n")).toMatchSnapshot();
    });

    it(`reaches a Bellman-Ford fixpoint — ${name}`, () => {
      const { params, data } = buildScenario(overrides);
      const { minCosts, choices } = svc.computeMinCosts(data, params);
      const { crocodileMultiplier, craftPenalty } = svc.calculateMultipliers(params);
      const tolerance = params.rateAsCoinValue ? 1e-2 : 1e-10;

      const recipeCost = (recipe: Recipe) => {
        const [in1, in2] = recipe.inputs;
        const total = minCosts.get(in1)! * data.shards[in1].fuse_amount + minCosts.get(in2)! * data.shards[in2].fuse_amount + craftPenalty;
        return total / svc.getEffectiveOutputQuantity(recipe, crocodileMultiplier);
      };

      const notAtFixpoint: string[] = [];
      const beatenByAnotherRecipe: string[] = [];

      for (const shardId of Object.keys(data.shards)) {
        const cost = minCosts.get(shardId);
        expect(cost, `no cost computed for ${shardId}`).toBeDefined();
        expect(choices.has(shardId), `no choice recorded for ${shardId}`).toBe(true);

        const chosen = choices.get(shardId)!.recipe;
        const expected = chosen === null ? svc.getDirectCost(data.shards[shardId], params.rateAsCoinValue) : recipeCost(chosen);

        // The chosen option must actually cost what the shard is priced at.
        if (isFinite(expected) && Math.abs(expected - cost!) > Math.max(tolerance, Math.abs(expected) * 1e-9)) {
          notAtFixpoint.push(`${shardId}: priced ${fmtCost(cost)} but its choice costs ${fmtCost(expected)}`);
        }

        // ...and nothing else may be cheaper, or relaxation stopped early.
        for (const recipe of data.recipes[shardId] ?? []) {
          if (recipeCost(recipe) < cost! - tolerance) {
            beatenByAnotherRecipe.push(`${shardId}: priced ${fmtCost(cost)} but ${recipe.inputs.join("+")} costs ${fmtCost(recipeCost(recipe))}`);
            break;
          }
        }
      }

      expect(notAtFixpoint).toEqual([]);
      expect(beatenByAnotherRecipe).toEqual([]);
    });
  }

  it("prices a shard as directly farmable only when it has a rate", () => {
    const { params, data } = buildScenario();
    const { minCosts, choices } = svc.computeMinCosts(data, params);

    for (const [shardId, shard] of Object.entries(data.shards)) {
      if (choices.get(shardId)!.recipe !== null) continue;
      // rate <= 0 means "no known way to farm it"; cost must be Infinity, never 0.
      expect(minCosts.get(shardId), shardId).toBe(shard.rate > 0 ? 1 / shard.rate : Infinity);
    }
  });
});

describe("findCycleNodes", () => {
  /**
   * fusion-data.json contains no recipe that consumes its own output, and no set of
   * *cheapest* recipes forms a loop under any parameter combination — so the cycle
   * machinery is unreachable unless the user pins recipes by hand. That is what makes
   * the `recipeOverrides.length > 0` gate at the call sites correct, and it is why
   * every cycle test below has to supply overrides.
   */
  it("finds no cycles in the shipped data, at any crocodile level", () => {
    for (const crocodileLevel of [0, 5, 10]) {
      const { params, data } = buildScenario({ crocodileLevel });
      const { choices } = svc.computeMinCosts(data, params);
      expect(svc.findCycleNodes(choices), `crocodileLevel=${crocodileLevel}`).toEqual([]);
    }
  });

  it("finds the strongly-connected component a pair of overrides creates", () => {
    const { params, data } = buildScenario({ crocodileLevel: 10 });
    const overrides: RecipeOverride[] = [
      { shardId: "C1", recipe: data.recipes.C1.find((r) => r.inputs[0] === "C4" && r.inputs[1] === "U8")! },
      { shardId: "C4", recipe: data.recipes.C4.find((r) => r.inputs[0] === "C1" && r.inputs[1] === "C2")! },
    ];
    const { choices } = svc.computeMinCosts(data, params, overrides);

    expect(svc.findCycleNodes(choices)).toEqual([["C4", "C1"]]);
  });
});

/** Walks a built tree so properties can be asserted over every node. */
const walk = (tree: RecipeTree, visit: (node: RecipeTree) => void): void => {
  visit(tree);
  if (tree.method === "recipe") tree.inputs.forEach((input) => walk(input, visit));
  if (tree.method === "cycle") {
    walk(tree.inputRecipe, visit);
    tree.cycleInputs.forEach((input) => walk(input, visit));
  }
};

const buildTree = (data: Data, params: CalculationParams, target: string, quantity: number, overrides: RecipeOverride[] = []) => {
  const { choices } = svc.computeMinCosts(data, params, overrides);
  const cycleNodes = svc.findCycleNodes(choices);
  const tree = svc.buildRecipeTree(data, target, choices, cycleNodes, params, overrides);
  const craftCounter = { total: 0 };
  svc.assignQuantities(tree, quantity, data, craftCounter, choices, svc.calculateMultipliers(params).crocodileMultiplier, params, overrides);
  return { tree, craftCounter };
};

describe("buildRecipeTree + assignQuantities", () => {
  // C4 is farmed directly; R94 is the deepest chain in the graph (11 fusions);
  // C67 and U57 sit mid-graph on unrelated branches.
  const TARGETS = ["C4", "R94", "C67", "U57"];

  for (const target of TARGETS) {
    it(`pins the tree and quantities for ${target}`, () => {
      const { params, data } = buildScenario(SCENARIOS.maxed);
      const { tree, craftCounter } = buildTree(data, params, target, 10);

      expect({ totalCrafts: craftCounter.total, tree: serializeTree(tree) }).toMatchSnapshot();
    });
  }

  it("derives each input quantity from its parent's craft count", () => {
    const { params, data } = buildScenario(SCENARIOS.maxed);
    const { crocodileMultiplier } = svc.calculateMultipliers(params);

    for (const target of TARGETS) {
      for (const quantity of [1, 7, 250]) {
        const { tree, craftCounter } = buildTree(data, params, target, quantity);

        let summedCrafts = 0;
        walk(tree, (node) => {
          if (node.method !== "recipe") {
            if (node.method === "cycle") summedCrafts += node.craftsNeeded;
            return;
          }
          summedCrafts += node.craftsNeeded;

          const output = svc.getEffectiveOutputQuantity(node.recipe, crocodileMultiplier);
          expect(node.craftsNeeded, `${target}x${quantity} ${node.shard} crafts`).toBe(Math.ceil(node.quantity / output));

          node.recipe.inputs.forEach((inputId, i) => {
            const expected = node.craftsNeeded * data.shards[inputId].fuse_amount;
            expect(node.inputs[i].quantity, `${target}x${quantity} ${node.shard} -> ${inputId}`).toBe(expected);
          });
        });

        expect(tree.quantity, `${target}x${quantity} root`).toBe(quantity);
        expect(craftCounter.total, `${target}x${quantity} craft counter`).toBe(summedCrafts);
      }
    }
  });
});

describe("assignQuantities — cycle case", () => {
  /**
   * The only reachable cycles come from overrides (see findCycleNodes above), so these
   * build one deliberately. Both branches of the `netOutputPerCycle > 0` split are
   * covered: with `C4 <- C1+C2` a cycle nets +0.4 C1, with `C4 <- C1+C1` it nets -1.6
   * and the code falls back to dividing by the raw output.
   */
  const cycleOverrides = (data: Data, secondInput: string): RecipeOverride[] => [
    { shardId: "C1", recipe: data.recipes.C1.find((r) => r.inputs[0] === "C4" && r.inputs[1] === "U8")! },
    { shardId: "C4", recipe: data.recipes.C4.find((r) => r.inputs[0] === "C1" && r.inputs[1] === secondInput)! },
  ];

  for (const [label, secondInput] of [
    ["net-positive", "C2"],
    ["net-negative", "C1"],
  ] as const) {
    it(`pins the cycle tree — ${label}`, () => {
      const { params, data } = buildScenario({ crocodileLevel: 10 });
      const { tree, craftCounter } = buildTree(data, params, "C1", 100, cycleOverrides(data, secondInput));

      expect(tree.method).toBe("cycle");
      expect({ totalCrafts: craftCounter.total, tree: serializeTree(tree) }).toMatchSnapshot();
    });

    it(`rounds crafts up to a whole number of loops — ${label}`, () => {
      const { params, data } = buildScenario({ crocodileLevel: 10 });
      const overrides = cycleOverrides(data, secondInput);

      for (const quantity of [1, 3, 100, 1001]) {
        const { tree } = buildTree(data, params, "C1", quantity, overrides);
        if (tree.method !== "cycle") throw new Error("expected a cycle tree");

        // Every step of the loop has to be crafted the same number of times, so the
        // total must stay a multiple of the step count.
        expect(tree.craftsNeeded % tree.steps.length, `qty=${quantity}`).toBe(0);
        expect(tree.craftsNeeded, `qty=${quantity}`).toBeGreaterThan(0);
        expect(tree.multiplier).toBe(svc.calculateMultipliers(params).crocodileMultiplier);
      }
    });
  }
});
