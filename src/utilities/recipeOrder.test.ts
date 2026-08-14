import { describe, expect, it } from "vitest";
import { CalculationService } from "../services/calculationService";
import { loadDefaultRates, loadFusionJson, makeParams } from "../test/fixtures";
import { isOrderSensitiveRecipe } from "./recipeOrder";
import type { Data, Recipe } from "../types/types";

const params = makeParams();
const data: Data = CalculationService.getInstance().buildData(loadFusionJson(), loadDefaultRates(), params);

const recipeFor = (outputShardId: string, input1: string, input2: string): Recipe => {
  const recipe = data.recipes[outputShardId]?.find(({ inputs }) => inputs[0] === input1 && inputs[1] === input2);
  if (!recipe) throw new Error(`no recipe ${input1}+${input2} -> ${outputShardId}`);
  return recipe;
};

describe("isOrderSensitiveRecipe", () => {
  it("flags a pair whose mirror makes a different shard", () => {
    // Grove + Phanflare -> Phanpyrus, but Phanflare + Grove -> Phanpyre.
    expect(isOrderSensitiveRecipe("C10", recipeFor("C10", "C1", "C7"), data.recipes)).toBe(true);
    expect(data.recipes.C10.some(({ inputs }) => inputs[0] === "C7" && inputs[1] === "C1")).toBe(false);
  });

  it("leaves a pair alone when the same output also lists the mirror", () => {
    // Grove + Phanpyre -> Phanflare either way round.
    expect(isOrderSensitiveRecipe("C7", recipeFor("C7", "C1", "C4"), data.recipes)).toBe(false);
    expect(isOrderSensitiveRecipe("C7", recipeFor("C7", "C4", "C1"), data.recipes)).toBe(false);
  });

  it("stays quiet on a recipe the output's table does not contain", () => {
    const stale: Recipe = { inputs: ["C1", "C7"], outputQuantity: 1, isReptile: false };
    expect(isOrderSensitiveRecipe("C4", stale, data.recipes)).toBe(false);
  });

  it("treats a shard fused with itself as order-free", () => {
    const selfPair = Object.entries(data.recipes).flatMap(([outputShardId, list]) =>
      list.filter(({ inputs }) => inputs[0] === inputs[1]).map((recipe) => [outputShardId, recipe] as const),
    )[0];
    expect(selfPair).toBeDefined();
    expect(isOrderSensitiveRecipe(selfPair[0], selfPair[1], data.recipes)).toBe(false);
  });

  it("agrees with a direct scan of the shipped table", () => {
    let flagged = 0;
    let total = 0;
    for (const [outputShardId, list] of Object.entries(data.recipes)) {
      for (const recipe of list) {
        total++;
        if (isOrderSensitiveRecipe(outputShardId, recipe, data.recipes)) flagged++;
      }
    }
    // Sanity bounds, not a golden: order sensitivity is a real but minority property,
    // so a data sync that pushed it to 0% or most of the table is a bug worth failing on.
    expect(total).toBeGreaterThan(1000);
    expect(flagged).toBeGreaterThan(0);
    expect(flagged / total).toBeLessThan(0.5);
  });
});
