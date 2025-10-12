import type { CalculationParams, CalculationResult, RecipeOverride, Data, RecipeChoice } from "../types/types";

type ProgressPhase = "parsing" | "computing" | "building" | "assigning" | "finalizing";

export type WorkerProgress = {
  phase: ProgressPhase;
  progress: number;
  message: string;
};

type WorkerMsg = ({ type: "progress" } & WorkerProgress) | { type: "result"; result: CalculationResult } | { type: "error"; message: string };

type WorkerStartMsg = {
  type: "start";
  targetShard: string;
  requiredQuantity: number;
  params: CalculationParams;
  recipeOverrides: RecipeOverride[];
};

type WorkerBatchStartWithDataMsg = {
  type: "batch-start-with-data";
  targets: Array<{ shard: string; quantity: number }>;

  params: CalculationParams;
  recipeOverrides: RecipeOverride[];
  parsedData: Data;
  choices: Record<string, RecipeChoice>;
  cycleNodes: string[][];
};

type WorkerBatchMsg =
  | ({ type: "progress" } & WorkerProgress)
  | { type: "batch-result"; results: CalculationResult[]; materialBreakdown?: Map<string, Map<string, number>> }
  | { type: "error"; message: string };

export function calculateOptimalPathWithWorker(
  targetShard: string,
  requiredQuantity: number,
  params: CalculationParams,
  recipeOverrides: RecipeOverride[] = [],
  onProgress?: (p: WorkerProgress) => void
): { promise: Promise<CalculationResult>; cancel: () => void } {
  const worker = new Worker(new URL("../workers/calculationWorker.ts", import.meta.url), { type: "module" });

  const promise = new Promise<CalculationResult>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<WorkerMsg>) => {
      const data = event.data;
      if (!data || !("type" in data)) return;
      if (data.type === "progress") {
        onProgress?.({ phase: data.phase, progress: data.progress, message: data.message });
      } else if (data.type === "result") {
        worker.terminate();
        resolve(data.result);
      } else if (data.type === "error") {
        worker.terminate();
        reject(new Error(data.message || "Worker calculation failed"));
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };

    const startMsg: WorkerStartMsg = {
      type: "start",
      targetShard,
      requiredQuantity,
      params,
      recipeOverrides,
    };
    worker.postMessage(startMsg);
  });

  const cancel = () => {
    worker.terminate();
  };

  return { promise, cancel };
}

export function calculateMultipleShardsParallel(
  targets: Array<{ shard: string; quantity: number }>,
  params: CalculationParams,
  recipeOverrides: RecipeOverride[] = [],
  onProgress?: (p: WorkerProgress) => void
): { promise: Promise<CalculationResult[]>; cancel: () => void } {
  // Determine optimal number of workers (use CPU cores, max 8 to avoid overhead)
  const maxWorkers = Math.min(navigator.hardwareConcurrency || 4, 8, targets.length);

  const workers: Worker[] = [];
  const completedChunks: Map<number, CalculationResult[]> = new Map();
  const completedBreakdowns: Map<number, Map<string, Map<string, number>>> = new Map();
  const chunkProgress: Map<number, number> = new Map(); // Track progress per chunk
  const chunkPhases: Map<number, ProgressPhase> = new Map(); // Track phase per chunk
  let cancelled = false;
  const totalShards = targets.length;

  const promise = new Promise<CalculationResult[]>((resolve, reject) => {
    (async () => {
      try {
        // parse data and compute min costs
        onProgress?.({
          phase: "parsing",
          progress: 0,
          message: "Parsing data..."
        });

        const { CalculationService } = await import("../services/calculationService");
        const service = CalculationService.getInstance();
        const parsedData = await service.parseData(params);

        onProgress?.({
          phase: "computing",
          progress: 0,
          message: "Computing optimal costs..."
        });

        const { choices } = service.computeMinCosts(parsedData, params, recipeOverrides);
        const cycleNodes = params.crocodileLevel > 0 || recipeOverrides.length > 0 ? service.findCycleNodes(choices) : [];

        const choicesObj: Record<string, RecipeChoice> = {};
        choices.forEach((value, key) => {
          choicesObj[key] = value;
        });

        onProgress?.({
          phase: "building",
          progress: 0,
          message: `Starting ${Math.min(maxWorkers, targets.length)} parallel workers...`
        });

        // split targets into chunks for each worker
        const chunkSize = Math.ceil(targets.length / maxWorkers);
        const chunks: Array<Array<{ shard: string; quantity: number }>> = [];

        for (let i = 0; i < targets.length; i += chunkSize) {
          chunks.push(targets.slice(i, i + chunkSize));
        }

        // progress tracking for each chunk
        chunks.forEach((_, idx) => {
          chunkProgress.set(idx, 0);
          chunkPhases.set(idx, "building");
        });

        const reportOverallProgress = () => {
          // calculate total shards completed across all workers
          let totalCompleted = 0;
          chunkProgress.forEach((progress, chunkIdx) => {
            totalCompleted += progress * chunks[chunkIdx].length;
          });

          const overallProgress = totalCompleted / totalShards;
          const shardsCompleted = Math.floor(totalCompleted);

          onProgress?.({
            phase: "building",
            progress: overallProgress,
            message: `Calculating ${shardsCompleted} of ${totalShards} shards...`
          });
        };

        // Create workers for each chunk
        chunks.forEach((chunk, chunkIndex) => {
          const worker = new Worker(new URL("../workers/calculationWorker.ts", import.meta.url), { type: "module" });
          workers.push(worker);

          worker.onmessage = (event: MessageEvent<WorkerBatchMsg>) => {
            if (cancelled) return;

            const data = event.data;
            if (!data || !("type" in data)) return;

            if (data.type === "progress") {
              // Update this chunk's progress
              chunkProgress.set(chunkIndex, data.progress);
              chunkPhases.set(chunkIndex, data.phase);
              reportOverallProgress();
            } else if (data.type === "batch-result") {
              worker.terminate();
              completedChunks.set(chunkIndex, data.results);
              if (data.materialBreakdown) {
                completedBreakdowns.set(chunkIndex, data.materialBreakdown);
              }
              chunkProgress.set(chunkIndex, 1); // Mark as 100% complete

              // Calculate how many total shards are done
              let totalCompleted = 0;
              chunkProgress.forEach((progress, idx) => {
                totalCompleted += progress * chunks[idx].length;
              });

              // Update progress to show completed shards
              onProgress?.({
                phase: "finalizing",
                progress: totalCompleted / totalShards,
                message: `Completed ${Math.floor(totalCompleted)} of ${totalShards} shards...`
              });

              // Check if all workers completed
              if (completedChunks.size === chunks.length) {
                // Combine results in order
                const allResults: CalculationResult[] = [];
                for (let i = 0; i < chunks.length; i++) {
                  const chunkResults = completedChunks.get(i);
                  if (chunkResults) {
                    allResults.push(...chunkResults);
                  }
                }

                // Merge all material breakdowns
                const globalMaterialBreakdown = new Map<string, Map<string, number>>();
                completedBreakdowns.forEach((breakdown) => {
                  breakdown.forEach((targetMap, materialId) => {
                    if (!globalMaterialBreakdown.has(materialId)) {
                      globalMaterialBreakdown.set(materialId, new Map());
                    }
                    const globalTargetMap = globalMaterialBreakdown.get(materialId)!;
                    targetMap.forEach((qty, targetId) => {
                      globalTargetMap.set(targetId, (globalTargetMap.get(targetId) || 0) + qty);
                    });
                  });
                });

                // Add the merged breakdown to all results
                allResults.forEach(result => {
                  result.materialBreakdown = globalMaterialBreakdown;
                });

                resolve(allResults);
              }
            } else if (data.type === "error") {
              worker.terminate();
              workers.forEach(w => w.terminate());
              reject(new Error(data.message || "Worker calculation failed"));
            }
          };

          worker.onerror = (err) => {
            if (cancelled) return;
            worker.terminate();
            workers.forEach(w => w.terminate());
            reject(err);
          };

          // Send pre-computed data to worker
          const startMsg: WorkerBatchStartWithDataMsg = {
            type: "batch-start-with-data",
            targets: chunk,
            params,
            recipeOverrides,
            parsedData,
            choices: choicesObj,
            cycleNodes,
          };
          worker.postMessage(startMsg);
        });
      } catch (err) {
        workers.forEach(w => w.terminate());
        reject(err);
      }
    })();
  });

  const cancel = () => {
    cancelled = true;
    workers.forEach(w => w.terminate());
  };

  return { promise, cancel };
}
