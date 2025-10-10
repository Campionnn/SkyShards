import type { CalculationParams, CalculationResult, RecipeOverride } from "../types/types";
import { CalculationService } from "../services";

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
  progress: number;
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

    if (!parsed.shards[targetShard]) {
      const emptyResult: CalculationResult = {
        timePerShard: 0,
        totalTime: 0,
        totalShardsProduced: 0,
        craftsNeeded: 0,
        totalQuantities: new Map<string, number>(),
        totalFusions: 0,
        craftTime: 0,
        tree: { shard: targetShard, method: "direct", quantity: 0 },
      };
      post({ type: "result", result: emptyResult });
      return;
    }

    // Phase: computing min costs
    post({ type: "progress", phase: "computing", progress: 0, message: "Computing optimal costs..." });
    const { choices } = service.computeMinCosts(parsed, params, recipeOverrides);

    // Phase: building recipe tree
    post({ type: "progress", phase: "building", progress: 0.4, message: "Building recipe tree..." });
    const cycleNodes = params.crocodileLevel > 0 || recipeOverrides.length > 0 ? service.findCycleNodes(choices) : [];
    const tree = service.buildRecipeTree(parsed, targetShard, choices, cycleNodes, params, recipeOverrides);

    // Phase: assigning quantities
    post({ type: "progress", phase: "assigning", progress: 0.7, message: "Assigning quantities..." });
    const craftCounter = { total: 0 };
    const { crocodileMultiplier } = service.calculateMultipliers(params);
    service.assignQuantities(tree, requiredQuantity, parsed, craftCounter, choices, crocodileMultiplier, params, recipeOverrides);

    // Phase: finalizing
    post({ type: "progress", phase: "finalizing", progress: 0.9, message: "Aggregating results..." });
    const totalQuantities = service.collectTotalQuantities(tree);

    const { totalShardsProduced, craftsNeeded, shardWeights } = service.calculateShardProductionStats({
      requiredQuantity,
      targetShard,
      choices,
      crocodileMultiplier,
      totalQuantities,
      data: parsed,
      params,
      getDirectCostFn: service.getDirectCost.bind(service)
    });

    const craftTime = params.rateAsCoinValue ? craftCounter.total * params.craftPenalty : (craftCounter.total * params.craftPenalty) / 3600;
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
