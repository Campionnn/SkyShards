import { useCallback, useEffect, useRef, useState } from "react";
import type { CalculationFormData } from "../../schemas";
import type { RecipeOverride } from "../../types/types";
import type { WorkerProgress } from "../../services/workerCalculationService";
import { calculateInventory, calculateStandard, type CalculationOutcome, type InventoryInputs, type RunCallbacks } from "./calculations";

export interface CalculationInputs extends InventoryInputs {
  customRates: { [shardId: string]: number | undefined };
  recipeOverrides: RecipeOverride[];
  useInventory: boolean;
}

/** Failures that just mean "nothing to show" rather than a bug worth logging. */
const isExpectedFailure = (err: unknown) => err instanceof Error && (err.message === "Worker calculation failed" || err.message.includes("not found"));

/**
 * Debounced, cancellable calculation runs for the calculator page.
 *
 * `schedule` drops whatever is shown or running and starts a fresh run after `delay`;
 * only the latest run ever writes state. The form is passed in, everything else is read
 * from the latest `inputs` when the run starts.
 */
export const useCalculation = (inputs: CalculationInputs) => {
  const [outcome, setOutcome] = useState<CalculationOutcome | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [progress, setProgress] = useState<WorkerProgress | null>(null);

  const inputsRef = useRef(inputs);
  useEffect(() => {
    inputsRef.current = inputs;
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const runRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    clearTimeout(timerRef.current);
    runRef.current?.abort();
    runRef.current = null;
  }, []);

  const clear = useCallback(() => {
    setOutcome(null);
    setProgress(null);
  }, []);

  const run = useCallback(async (formData: CalculationFormData) => {
    const controller = new AbortController();
    runRef.current = controller;
    const { signal } = controller;
    const { customRates, recipeOverrides, useInventory, ...inventoryInputs } = inputsRef.current;

    const callbacks: RunCallbacks = {
      signal,
      onStart: (initialProgress) => {
        setIsCalculating(true);
        setProgress(initialProgress);
      },
      onProgress: (next) => !signal.aborted && setProgress(next),
    };

    try {
      const next =
        useInventory && !formData.materialsOnly
          ? await calculateInventory(formData, customRates, recipeOverrides, inventoryInputs, callbacks)
          : await calculateStandard(formData, customRates, recipeOverrides, callbacks);
      if (!signal.aborted) setOutcome(next);
    } catch (err) {
      if (!signal.aborted && !isExpectedFailure(err)) console.error("Calculation failed:", err);
    } finally {
      // A superseded run leaves the indicator to its successor, so it doesn't flicker off between runs.
      if (!signal.aborted) {
        setIsCalculating(false);
        setProgress(null);
      }
    }
  }, []);

  const schedule = useCallback(
    (formData: CalculationFormData, delay: number) => {
      cancel();
      clear();
      timerRef.current = setTimeout(() => void run(formData), delay);
    },
    [cancel, clear, run],
  );

  useEffect(() => cancel, [cancel]);

  return { outcome, isCalculating, progress, schedule, clear };
};
