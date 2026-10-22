import type { CalculationParams, CalculationResult, Data, RecipeChoice, RecipeOverride } from "../types/types";

/** Messages between workerCalculationService (main thread) and calculationWorker. */

export type ProgressPhase = "parsing" | "computing" | "building" | "assigning" | "finalizing";

export type WorkerProgress = {
  phase: ProgressPhase;
  progress: number;
  message: string;
};

export type CalculationTarget = { shard: string; quantity: number };

/** Main thread -> worker. */
export type WorkerRequest =
  | {
      /** Calculate one shard from scratch. */
      type: "start";
      targetShard: string;
      requiredQuantity: number;
      params: CalculationParams;
      recipeOverrides: RecipeOverride[];
    }
  | {
      /** Calculate a chunk of shards against Data and choices already solved on the main thread. */
      type: "batch-start-with-data";
      targets: CalculationTarget[];
      params: CalculationParams;
      recipeOverrides: RecipeOverride[];
      parsedData: Data;
      /** Plain object rather than a Map, as solved on the main thread. */
      choices: Record<string, RecipeChoice>;
      cycleNodes: string[][];
    };

/** Worker -> main thread. */
export type WorkerResponse =
  | ({ type: "progress" } & WorkerProgress)
  | { type: "result"; result: CalculationResult }
  /** `materialBreakdown`: material shard -> target shard -> quantity, for this chunk. */
  | { type: "batch-result"; results: CalculationResult[]; materialBreakdown?: Map<string, Map<string, number>> }
  | { type: "error"; message: string };
