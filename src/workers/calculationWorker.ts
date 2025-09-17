import type { CalculationParams, CalculationResult, RecipeOverride } from "../types/types";
import { CalculationService } from "../services";

// Message shapes
interface StartMsg {
  type: "start";
  targetShard: string;
  requiredQuantity: number;
  params: CalculationParams;
  recipeOverrides: RecipeOverride[];
}

type ProgressPhase = "parsing" | "computing" | "building" | "assigning" | "finalizing";

interface ProgressMsg {
  type: "progress";
  phase: ProgressPhase;
  progress: number; // 0..1 best effort
  message: string;
}
interface ResultMsg {
  type: "result";
  result: CalculationResult;
}
interface ErrorMsg {
  type: "error";
  message: string;
}

type OutMsg = ProgressMsg | ResultMsg | ErrorMsg;

const post = (msg: OutMsg) => (postMessage as (m: OutMsg) => void)(msg);

self.onmessage = async (e: MessageEvent<StartMsg>) => {
  const data = e.data;
  if (!data || data.type !== "start") return;

  const { targetShard, requiredQuantity, params, recipeOverrides } = data;

  try {
    const service = CalculationService.getInstance();

    // Phase: parsing data
    post({ type: "progress", phase: "parsing", progress: 0, message: "Parsing data..." });
    const parsed = await service.parseData(params);
    post({ type: "progress", phase: "parsing", progress: 0.1, message: "Data parsed" });

    // Phase: computing min costs
    post({ type: "progress", phase: "computing", progress: 0.1, message: "Computing optimal costs..." });
    const { choices } = service.computeMinCosts(parsed, params, recipeOverrides);
    post({ type: "progress", phase: "computing", progress: 0.5, message: "Costs computed" });

    // Phase: building recipe tree
    post({ type: "progress", phase: "building", progress: 0.5, message: "Building recipe tree..." });
    const cycleNodes = params.crocodileLevel > 0 || recipeOverrides.length > 0 ? service.findCycleNodes(choices) : [];
    const tree = service.buildRecipeTree(parsed, targetShard, choices, cycleNodes, params, recipeOverrides);
    post({ type: "progress", phase: "building", progress: 0.7, message: "Tree built" });

    // Phase: assigning quantities
    post({ type: "progress", phase: "assigning", progress: 0.7, message: "Assigning quantities..." });
    const craftCounter = { total: 0 };
    const { crocodileMultiplier } = service.calculateMultipliers(params);
    service.assignQuantities(tree, requiredQuantity, parsed, craftCounter, choices, crocodileMultiplier, params, recipeOverrides);
    post({ type: "progress", phase: "assigning", progress: 0.8, message: "Quantities assigned" });

    // Phase: finalizing
    post({ type: "progress", phase: "finalizing", progress: 0.9, message: "Aggregating results..." });
    const totalQuantities = service.collectTotalQuantities(tree);

    let totalShardsProduced = requiredQuantity;
    let craftsNeeded = 1;
    const choice = choices.get(targetShard);
    if (choice?.recipe) {
      const outputQuantity = choice.recipe.isReptile ? choice.recipe.outputQuantity * crocodileMultiplier : choice.recipe.outputQuantity;
      craftsNeeded = Math.ceil(requiredQuantity / outputQuantity);
      totalShardsProduced = craftsNeeded * outputQuantity;
    }

    const craftTime = params.rateAsCoinValue ? craftCounter.total * params.craftPenalty : (craftCounter.total * params.craftPenalty) / 3600;

    const shardWeights: Map<string, number> = new Map();
    for (const [shardId, quantity] of totalQuantities.entries()) {
      const shard = parsed.shards[shardId];
      if (shard) {
        const weight = service.getDirectCost(shard, params.rateAsCoinValue) * quantity;
        shardWeights.set(shardId, weight);
      }
    }
    const totalTime = Array.from(shardWeights.values()).reduce((sum, weight) => sum + weight, 0) + craftTime;
    const timePerShard = totalTime / totalShardsProduced;

    const result: CalculationResult = {
      timePerShard,
      totalTime,
      totalShardsProduced,
      craftsNeeded,
      totalQuantities,
      totalFusions: craftCounter.total,
      craftTime,
      tree,
    };

    post({ type: "progress", phase: "finalizing", progress: 1, message: "Done" });
    post({ type: "result", result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Calculation failed";
    post({ type: "error", message });
  }
};