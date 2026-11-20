import type { CalculationParams, CalculationResult, RecipeOverride } from "../types/types";
import type { CalculationTarget, WorkerProgress, WorkerRequest, WorkerResponse } from "../workers/workerProtocol";

export type { WorkerProgress } from "../workers/workerProtocol";

const MAX_WORKERS = 8;

const spawnWorker = () => new Worker(new URL("../workers/calculationWorker.ts", import.meta.url), { type: "module" });

const postRequest = (worker: Worker, request: WorkerRequest) => worker.postMessage(request);

/** Calculates one shard in a worker. `cancel` terminates it; the promise then never settles. */
export function calculateOptimalPathWithWorker(
  targetShard: string,
  requiredQuantity: number,
  params: CalculationParams,
  recipeOverrides: RecipeOverride[] = [],
  onProgress?: (p: WorkerProgress) => void,
): { promise: Promise<CalculationResult>; cancel: () => void } {
  const worker = spawnWorker();

  const promise = new Promise<CalculationResult>((resolve, reject) => {
    worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      if (data?.type === "progress") {
        onProgress?.({ phase: data.phase, progress: data.progress, message: data.message });
      } else if (data?.type === "result") {
        worker.terminate();
        resolve(data.result);
      } else if (data?.type === "error") {
        worker.terminate();
        reject(new Error(data.message || "Worker calculation failed"));
      }
    };
    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };

    postRequest(worker, { type: "start", targetShard, requiredQuantity, params, recipeOverrides });
  });

  return { promise, cancel: () => worker.terminate() };
}

/**
 * Calculates many shards across up to 8 workers. Min costs are solved once here and
 * shipped to every worker with its chunk of targets. Results come back in target
 * order, each carrying the same merged materialBreakdown (material -> target -> qty).
 */
export function calculateMultipleShardsParallel(
  targets: CalculationTarget[],
  params: CalculationParams,
  recipeOverrides: RecipeOverride[] = [],
  onProgress?: (p: WorkerProgress) => void,
): { promise: Promise<CalculationResult[]>; cancel: () => void } {
  const workerCount = Math.min(navigator.hardwareConcurrency || 4, MAX_WORKERS, targets.length);
  const workers: Worker[] = [];
  let cancelled = false;
  const terminateAll = () => workers.forEach((w) => w.terminate());

  const run = async (): Promise<CalculationResult[]> => {
    onProgress?.({ phase: "parsing", progress: 0, message: "Parsing data..." });
    const [{ CalculationService }, { computeMinCosts, findCycleNodesIfNeeded }] = await Promise.all([
      import("./calculationService"),
      import("./minCostSolver"),
    ]);
    const parsedData = await CalculationService.getInstance().parseData(params);

    onProgress?.({ phase: "computing", progress: 0, message: "Computing optimal costs..." });
    const { choices } = computeMinCosts(parsedData, params, recipeOverrides);
    const cycleNodes = findCycleNodesIfNeeded(choices, params, recipeOverrides);
    const choicesObj = Object.fromEntries(choices);
    // Cancelled while solving: don't spawn workers nobody will terminate.
    if (cancelled) return new Promise<never>(() => {});

    onProgress?.({ phase: "building", progress: 0, message: `Starting ${workerCount} parallel workers...` });

    const chunkSize = Math.ceil(targets.length / workerCount);
    const chunks: CalculationTarget[][] = [];
    for (let i = 0; i < targets.length; i += chunkSize) {
      chunks.push(targets.slice(i, i + chunkSize));
    }

    // Fraction complete per chunk, weighted by chunk size into shards completed.
    const chunkProgress = chunks.map(() => 0);
    const shardsCompleted = () => chunkProgress.reduce((sum, progress, i) => sum + progress * chunks[i].length, 0);

    const chunkResults = await Promise.all(
      chunks.map(
        (chunk, chunkIndex) =>
          new Promise<{ results: CalculationResult[]; materialBreakdown?: Map<string, Map<string, number>> }>((resolve, reject) => {
            const worker = spawnWorker();
            workers.push(worker);

            worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
              if (cancelled) return;
              if (data?.type === "progress") {
                chunkProgress[chunkIndex] = data.progress;
                const completed = shardsCompleted();
                onProgress?.({
                  phase: "building",
                  progress: completed / targets.length,
                  message: `Calculating ${Math.floor(completed)} of ${targets.length} shards...`,
                });
              } else if (data?.type === "batch-result") {
                worker.terminate();
                chunkProgress[chunkIndex] = 1;
                const completed = shardsCompleted();
                onProgress?.({
                  phase: "finalizing",
                  progress: completed / targets.length,
                  message: `Completed ${Math.floor(completed)} of ${targets.length} shards...`,
                });
                resolve(data);
              } else if (data?.type === "error") {
                terminateAll();
                reject(new Error(data.message || "Worker calculation failed"));
              }
            };
            worker.onerror = (err) => {
              if (cancelled) return;
              terminateAll();
              reject(err);
            };

            postRequest(worker, {
              type: "batch-start-with-data",
              targets: chunk,
              params,
              recipeOverrides,
              parsedData,
              choices: choicesObj,
              cycleNodes,
            });
          }),
      ),
    );

    const materialBreakdown = new Map<string, Map<string, number>>();
    for (const chunk of chunkResults) {
      chunk.materialBreakdown?.forEach((perTarget, materialId) => {
        const merged = materialBreakdown.get(materialId) ?? new Map<string, number>();
        perTarget.forEach((qty, targetId) => merged.set(targetId, (merged.get(targetId) || 0) + qty));
        materialBreakdown.set(materialId, merged);
      });
    }

    const allResults = chunkResults.flatMap((chunk) => chunk.results);
    for (const result of allResults) result.materialBreakdown = materialBreakdown;
    return allResults;
  };

  const promise = run().catch((err) => {
    terminateAll();
    throw err;
  });

  return {
    promise,
    cancel: () => {
      cancelled = true;
      terminateAll();
    },
  };
}
