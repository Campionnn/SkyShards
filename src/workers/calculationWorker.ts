import type { CalculationParams, CalculationResult, RecipeOverride } from "../types/types";
import { CalculationService } from "../services";

const DEBUG_SLOW_MS = 0;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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
    if (DEBUG_SLOW_MS > 0) await sleep(DEBUG_SLOW_MS);
    const parsed = await service.parseData(params);
    post({ type: "progress", phase: "parsing", progress: 1, message: "Data parsed" });
    if (DEBUG_SLOW_MS > 0) await sleep(DEBUG_SLOW_MS);

    // Phase: computing min costs (with a fake ticker so the bar moves while CPU is busy)
    post({ type: "progress", phase: "computing", progress: 0, message: "Computing optimal costs..." });
    let computeProgress = 0;
    let ticker: number | null = null;
    if (DEBUG_SLOW_MS > 0) {
      ticker = setInterval(() => {
        computeProgress = Math.min(0.8, computeProgress + 0.05);
        post({ type: "progress", phase: "computing", progress: computeProgress, message: "Computing optimal costs..." });
      }, DEBUG_SLOW_MS) as unknown as number;
    }
    const { choices } = service.computeMinCosts(parsed, params, recipeOverrides);
    if (ticker !== null) {
      clearInterval(ticker as unknown as number);
      ticker = null;
    }
    post({ type: "progress", phase: "computing", progress: 1, message: "Costs computed" });
    if (DEBUG_SLOW_MS > 0) await sleep(DEBUG_SLOW_MS);

    // Phase: building recipe tree
    post({ type: "progress", phase: "building", progress: 0, message: "Building recipe tree..." });
    if (DEBUG_SLOW_MS > 0) await sleep(DEBUG_SLOW_MS);
    const cycleNodes = params.crocodileLevel > 0 || recipeOverrides.length > 0 ? service.findCycleNodes(choices) : [];
    const tree = service.buildRecipeTree(parsed, targetShard, choices, cycleNodes, params, recipeOverrides);
    post({ type: "progress", phase: "building", progress: 1, message: "Tree built" });
    if (DEBUG_SLOW_MS > 0) await sleep(DEBUG_SLOW_MS);

    // Phase: assigning quantities
    post({ type: "progress", phase: "assigning", progress: 0.25, message: "Assigning quantities..." });
    if (DEBUG_SLOW_MS > 0) await sleep(DEBUG_SLOW_MS);
    const craftCounter = { total: 0 };
    const { crocodileMultiplier } = service.calculateMultipliers(params);
    service.assignQuantities(tree, requiredQuantity, parsed, craftCounter, choices, crocodileMultiplier, params, recipeOverrides);
    post({ type: "progress", phase: "assigning", progress: 1, message: "Quantities assigned" });
    if (DEBUG_SLOW_MS > 0) await sleep(DEBUG_SLOW_MS);

    // Phase: finalizing
    post({ type: "progress", phase: "finalizing", progress: 0.25, message: "Aggregating results..." });
    if (DEBUG_SLOW_MS > 0) await sleep(DEBUG_SLOW_MS);
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
    if (DEBUG_SLOW_MS > 0) await sleep(DEBUG_SLOW_MS);
    post({ type: "result", result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Calculation failed";
    post({ type: "error", message });
  }
};
