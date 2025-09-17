import type { CalculationParams, CalculationResult, RecipeOverride } from "../types/types";

export type WorkerProgress = {
  phase: "parsing" | "computing" | "building" | "assigning" | "finalizing";
  progress: number; // 0..1 best-effort
  message: string;
};

type WorkerMsg =
  | ({ type: "progress" } & WorkerProgress)
  | { type: "result"; result: CalculationResult }
  | { type: "error"; message: string };

type WorkerStartMsg = {
  type: "start";
  targetShard: string;
  requiredQuantity: number;
  params: CalculationParams;
  recipeOverrides: RecipeOverride[];
};

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
