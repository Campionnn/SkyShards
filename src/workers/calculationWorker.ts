import type { CalculationResult, RecipeChoice } from "../types/types";
import { CalculationService } from "../services/calculationService";
import { computeMinCosts, findCycleNodesIfNeeded } from "../services/minCostSolver";
import { calculatePath, emptyCalculationResult } from "../services/recipeTree";
import type { ProgressPhase, WorkerRequest, WorkerResponse } from "./workerProtocol";

type StartRequest = Extract<WorkerRequest, { type: "start" }>;
type BatchRequest = Extract<WorkerRequest, { type: "batch-start-with-data" }>;

const post = (msg: WorkerResponse) => (postMessage as (m: WorkerResponse) => void)(msg);

const PROGRESS_THROTTLE_MS = 100;
let lastProgressTime = 0;

const postProgress = (phase: ProgressPhase, progress: number, message: string, throttle = false) => {
  const now = Date.now();
  if (throttle && now - lastProgressTime < PROGRESS_THROTTLE_MS) return;
  lastProgressTime = now;
  post({ type: "progress", phase, progress, message });
};

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const request = e.data;
  try {
    if (request?.type === "batch-start-with-data") {
      handleBatch(request);
    } else if (request?.type === "start") {
      await handleSingle(request);
    }
  } catch (err: unknown) {
    post({ type: "error", message: err instanceof Error ? err.message : "Calculation failed" });
  }
};

async function handleSingle({ targetShard, requiredQuantity, params, recipeOverrides }: StartRequest) {
  postProgress("parsing", 0, "Parsing data...");
  const data = await CalculationService.getInstance().parseData(params);

  if (!data.shards[targetShard]) {
    post({ type: "result", result: emptyCalculationResult(targetShard) });
    return;
  }

  postProgress("computing", 0, "Computing optimal costs...");
  const { choices } = computeMinCosts(data, params, recipeOverrides);

  postProgress("building", 0.4, "Building recipe tree...");
  const result = calculatePath(data, targetShard, requiredQuantity, choices, findCycleNodesIfNeeded(choices, params, recipeOverrides), params);

  postProgress("finalizing", 1, "Done");
  post({ type: "result", result });
}

function handleBatch({ targets, params, parsedData, choices: choicesObj, cycleNodes }: BatchRequest) {
  const choices = new Map<string, RecipeChoice>(Object.entries(choicesObj));
  const results: CalculationResult[] = [];
  const materialBreakdown = new Map<string, Map<string, number>>();

  targets.forEach(({ shard, quantity }, i) => {
    if (!parsedData.shards[shard]) {
      results.push({ ...emptyCalculationResult(shard), materialBreakdown: new Map() });
    } else {
      const result = calculatePath(parsedData, shard, quantity, choices, cycleNodes, params);
      for (const [materialId, materialQuantity] of result.totalQuantities) {
        const perTarget = materialBreakdown.get(materialId) ?? new Map<string, number>();
        perTarget.set(shard, (perTarget.get(shard) || 0) + materialQuantity);
        materialBreakdown.set(materialId, perTarget);
      }
      results.push(result);
    }
    postProgress("building", (i + 1) / targets.length, `Calculating ${i + 1} of ${targets.length} shards...`, true);
  });

  postProgress("finalizing", 1, "Done");
  post({ type: "batch-result", results, materialBreakdown });
}
