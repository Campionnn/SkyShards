import type { CalculationParams, CalculationResult, RecipeOverride, Data, RecipeChoice } from "../types/types";
import { CalculationService } from "../services";

interface StartMsg {
  type: "start";
  targetShard: string;
  requiredQuantity: number;
  params: CalculationParams;
  recipeOverrides: RecipeOverride[];
}

interface BatchStartWithDataMsg {
  type: "batch-start-with-data";
  targets: Array<{ shard: string; quantity: number }>;
  params: CalculationParams;
  recipeOverrides: RecipeOverride[];
  parsedData: Data;
  choices: Record<string, RecipeChoice>;
  cycleNodes: string[][];
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
interface BatchResultMsg {
  type: "batch-result";
  results: CalculationResult[];
  materialBreakdown?: Map<string, Map<string, number>>;
}
interface ErrorMsg {
  type: "error";
  message: string;
}

type OutMsg = ProgressMsg | ResultMsg | BatchResultMsg | ErrorMsg;

const post = (msg: OutMsg) => (postMessage as (m: OutMsg) => void)(msg);

let lastProgressTime = 0;
const PROGRESS_THROTTLE_MS = 100;

const postProgress = (phase: ProgressPhase, progress: number, message: string, force = false) => {
  const now = Date.now();
  if (force || now - lastProgressTime >= PROGRESS_THROTTLE_MS) {
    lastProgressTime = now;
    post({ type: "progress", phase, progress, message });
  }
};

self.onmessage = async (e: MessageEvent<StartMsg | BatchStartWithDataMsg>) => {
  const data = e.data;
  if (!data || !data.type) return;

  if (data.type === "batch-start-with-data") {
    await handleBatchCalculationWithData(data);
  } else if (data.type === "start") {
    await handleSingleCalculation(data);
  }
};

async function handleBatchCalculationWithData(data: BatchStartWithDataMsg) {
  const { targets, params, recipeOverrides, parsedData, choices: choicesObj, cycleNodes } = data;

  try {
    const service = CalculationService.getInstance();

    // convert choices object back to Map
    const choices = new Map<string, RecipeChoice>();
    Object.entries(choicesObj).forEach(([key, value]) => {
      choices.set(key, value);
    });

    // calculate each shard
    const results: CalculationResult[] = [];
    const { crocodileMultiplier } = service.calculateMultipliers(params);

    // Track material breakdown: Map<materialShardId, Map<targetShardId, quantity>>
    const materialBreakdown = new Map<string, Map<string, number>>();

    for (let i = 0; i < targets.length; i++) {
      const { shard: targetShard, quantity: requiredQuantity } = targets[i];

      if (!parsedData.shards[targetShard]) {
        const emptyResult: CalculationResult = {
          timePerShard: 0,
          totalTime: 0,
          totalShardsProduced: 0,
          craftsNeeded: 0,
          totalQuantities: new Map<string, number>(),
          totalFusions: 0,
          craftTime: 0,
          tree: { shard: targetShard, method: "direct", quantity: 0 },
          materialBreakdown: new Map(),
        };
        results.push(emptyResult);

        // report progress after completing this shard
        postProgress("building", (i + 1) / targets.length, `Calculating ${i + 1} of ${targets.length} shards...`);
        continue;
      }

      // build recipe tree
      const tree = service.buildRecipeTree(parsedData, targetShard, choices, cycleNodes, params, recipeOverrides);

      // assign quantities
      const craftCounter = { total: 0 };
      service.assignQuantities(tree, requiredQuantity, parsedData, craftCounter, choices, crocodileMultiplier, params, recipeOverrides);

      // collect results
      const totalQuantities = service.collectTotalQuantities(tree);

      // Track materials for this target shard
      totalQuantities.forEach((quantity, materialShardId) => {
        if (!materialBreakdown.has(materialShardId)) {
          materialBreakdown.set(materialShardId, new Map());
        }
        const targetMap = materialBreakdown.get(materialShardId)!;
        targetMap.set(targetShard, (targetMap.get(targetShard) || 0) + quantity);
      });

      const { totalShardsProduced, craftsNeeded, shardWeights } = service.calculateShardProductionStats({
        requiredQuantity,
        targetShard,
        choices,
        crocodileMultiplier,
        totalQuantities,
        data: parsedData,
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

      results.push(result);

      // report progress after completing this shard
      postProgress("building", (i + 1) / targets.length, `Calculating ${i + 1} of ${targets.length} shards...`);
    }

    post({ type: "progress", phase: "finalizing", progress: 1, message: "Done" });
    post({ type: "batch-result", results, materialBreakdown });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Batch calculation failed";
    post({ type: "error", message });
  }
}

async function handleSingleCalculation(data: StartMsg) {
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
}
