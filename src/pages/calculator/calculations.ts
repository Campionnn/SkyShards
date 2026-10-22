import type { CalculationFormData } from "../../schemas";
import type { CalculationParams, CalculationResult, Data, InventoryCalculationResult, RecipeOverride } from "../../types/types";
import { CalculationService, DataService, InvCalculationService, buildCalculationParams } from "../../services";
import { calculateMultipleShardsParallel, calculateOptimalPathWithWorker, type WorkerProgress } from "../../services/workerCalculationService";

/**
 * The calculator page's calculation runs, independent of React. Each resolves to null
 * when the form has no valid target, and calls `onStart` once it actually begins.
 */

type CustomRates = { [shardId: string]: number | undefined };

export interface StandardOutcome {
  mode: "standard";
  result: CalculationResult;
  data: Data;
  params: CalculationParams;
  targetShardName: string;
  targetShardKey: string;
  /** Multi-shard mode: each selected shard's own result (incl. its tree), so trees can be viewed without recalculating. */
  perShardResults: Map<string, CalculationResult>;
}

export interface InventoryOutcome {
  mode: "inventory";
  result: InventoryCalculationResult;
  data: Data;
  params: CalculationParams;
  targetShardName: string;
  targetShardKey: string;
}

export type CalculationOutcome = StandardOutcome | InventoryOutcome;

export interface RunCallbacks {
  signal: AbortSignal;
  onStart: (initialProgress: WorkerProgress | null) => void;
  onProgress: (progress: WorkerProgress) => void;
}

export const hasTarget = (form: CalculationFormData): boolean => form.shard.trim() !== "" || (form.materialsOnly && (form.selectedShardKeys?.length ?? 0) > 0);

/** Picking a shard or changing what is made should feel immediate; tweaking a setting can wait for the user to stop. */
export const isTargetChange = (previous: CalculationFormData, next: CalculationFormData): boolean =>
  next.shard !== previous.shard ||
  next.quantity !== previous.quantity ||
  next.materialsOnly !== previous.materialsOnly ||
  JSON.stringify(next.selectedShardKeys) !== JSON.stringify(previous.selectedShardKeys);

const resolveShardKey = async (name: string): Promise<string | undefined> => {
  if (name.trim() === "") return undefined;
  const nameToKey = await DataService.getInstance().getShardNameToKeyMap();
  return nameToKey[name.toLowerCase()];
};

/** Resolve the worker's promise, terminating the worker if the run is aborted first. */
const runWorker = <T>({ promise, cancel }: { promise: Promise<T>; cancel: () => void }, signal: AbortSignal): Promise<T> => {
  signal.addEventListener("abort", cancel, { once: true });
  return promise;
};

/** Combine per-shard results into one materials total. */
const combineResults = (results: CalculationResult[], totalShardsRequested: number): CalculationResult => {
  const totalQuantities = new Map<string, number>();
  let totalTime = 0;
  let craftTime = 0;
  let craftsNeeded = 0;

  for (const result of results) {
    result.totalQuantities?.forEach((quantity, shardId) => totalQuantities.set(shardId, (totalQuantities.get(shardId) || 0) + quantity));
    totalTime += result.totalTime || 0;
    craftTime += result.craftTime || 0;
    craftsNeeded += result.craftsNeeded || 0;
  }

  return {
    timePerShard: totalShardsRequested > 0 ? totalTime / totalShardsRequested : 0,
    totalTime,
    totalShardsProduced: totalShardsRequested,
    craftsNeeded,
    totalQuantities,
    craftTime,
    tree: null,
    // The worker service already merges the breakdown across shards into the first result.
    materialBreakdown: results[0]?.materialBreakdown,
  };
};

/** Multi-shard ("materials only") mode: every selected shard in parallel workers, totals combined. */
const calculateMaterials = async (formData: CalculationFormData, customRates: CustomRates, recipeOverrides: RecipeOverride[], run: RunCallbacks) => {
  const selectedShardKeys = formData.selectedShardKeys ?? [];
  if (selectedShardKeys.length === 0) return null;

  const params = await buildCalculationParams(formData, customRates);
  if (run.signal.aborted) return null;
  run.onStart(null);

  const quantities = new Map<string, number>();
  for (const { shard, quantity } of formData.shardQuantities ?? []) {
    if (shard && quantity) quantities.set(shard.id, quantity);
  }
  const targets = selectedShardKeys.map((shard) => ({ shard, quantity: quantities.get(shard) || 1 }));

  const results = await runWorker(calculateMultipleShardsParallel(targets, params, recipeOverrides, run.onProgress), run.signal);
  // Results come back in `targets` order.
  const perShardResults = new Map(results.map((result, index) => [targets[index].shard, result]));
  const totalShardsRequested = Array.from(quantities.values()).reduce((sum, quantity) => sum + quantity, 0) || selectedShardKeys.length;
  const data = await CalculationService.getInstance().parseData(params);

  return {
    mode: "standard",
    result: combineResults(results, totalShardsRequested),
    data,
    params,
    targetShardName: `${selectedShardKeys.length} Shards`,
    targetShardKey: selectedShardKeys[0] || "",
    perShardResults,
  } satisfies StandardOutcome;
};

/** The worker-based calculation: one target shard, or every selected shard in multi-shard mode. */
export const calculateStandard = async (
  formData: CalculationFormData,
  customRates: CustomRates,
  recipeOverrides: RecipeOverride[],
  run: RunCallbacks,
): Promise<StandardOutcome | null> => {
  if (formData.materialsOnly) return calculateMaterials(formData, customRates, recipeOverrides, run);

  const shardKey = await resolveShardKey(formData.shard);
  if (!shardKey) return null;

  const params = await buildCalculationParams(formData, customRates);
  if (run.signal.aborted) return null;
  run.onStart({ phase: "parsing", progress: 0, message: "Starting..." });

  const result = await runWorker(calculateOptimalPathWithWorker(shardKey, formData.quantity, params, recipeOverrides, run.onProgress), run.signal);
  const data = await CalculationService.getInstance().parseData(params);

  return { mode: "standard", result, data, params, targetShardName: formData.shard, targetShardKey: shardKey, perShardResults: new Map() };
};

export interface InventoryInputs {
  inventory: Map<string, number>;
  disabledShards: Set<string>;
  ownedAttributes: Map<string, number>;
}

/** Inventory-aware calculation (main thread, not cancellable): owned shards substitute for gathering. */
export const calculateInventory = async (
  formData: CalculationFormData,
  customRates: CustomRates,
  recipeOverrides: RecipeOverride[],
  { inventory, disabledShards, ownedAttributes }: InventoryInputs,
  run: RunCallbacks,
): Promise<InventoryOutcome | null> => {
  const shardKey = await resolveShardKey(formData.shard);
  if (!shardKey) return null;

  const params = await buildCalculationParams(formData, customRates);
  if (run.signal.aborted) return null;
  run.onStart(null);

  const usableInventory = new Map([...inventory].filter(([id]) => !disabledShards.has(id)));
  const result = await InvCalculationService.getInstance().calculateOptimalPath(
    shardKey,
    formData.quantity,
    params,
    usableInventory,
    recipeOverrides,
    ownedAttributes,
  );
  const data = await CalculationService.getInstance().parseData(params);

  return { mode: "inventory", result, data, params, targetShardName: formData.shard, targetShardKey: shardKey };
};
