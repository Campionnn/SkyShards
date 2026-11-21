import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CalculationFormData } from "../../schemas";
import type { RecipeOverride } from "../../types/types";
import { loadOptimizerSettings, saveOptimizerSettings, sanitizeOptimizerSettings, type OptimizerSettings } from "../../utilities";
import { optimizeInventory, type InventoryInputs, type InventoryOptimizationOutcome } from "./calculations";

export interface OptimizerInputs extends InventoryInputs {
  form: CalculationFormData;
  customRates: { [shardId: string]: number | undefined };
  recipeOverrides: RecipeOverride[];
}

export type OptimizerState =
  | { status: "idle" }
  | { status: "running"; progress: number }
  | { status: "done"; outcome: InventoryOptimizationOutcome }
  | { status: "error"; message: string };

/**
 * Everything a plan depends on, as one string. The calculator's target fields are left
 * out on purpose: opening a step in the calculator changes them, and that must not make
 * the plan look out of date.
 */
const inputsKey = ({ form, customRates, recipeOverrides, inventory, disabledShards, ownedAttributes }: OptimizerInputs): string => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { shard, quantity, materialsOnly, selectedShardKeys, shardQuantities, ...settings } = form;
  const sorted = (map: Map<string, number>) => [...map].sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify([settings, customRates, recipeOverrides, sorted(inventory), [...disabledShards].sort(), sorted(ownedAttributes)]);
};

/**
 * The "Optimize Inventory" plan, owned by the calculator page so it survives the modal
 * closing: reopening shows the last plan instead of planning again. A plan keeps
 * running when the modal closes. It is redone when the settings change or on request;
 * when the inventory or calculator settings change it is only flagged as out of date.
 */
export const useInventoryOptimizer = (inputs: OptimizerInputs) => {
  const [settings, setSettingsState] = useState<OptimizerSettings>(loadOptimizerSettings);
  const [state, setState] = useState<OptimizerState>({ status: "idle" });
  const [planKey, setPlanKey] = useState<string | null>(null);

  const inputsRef = useRef(inputs);
  useEffect(() => {
    inputsRef.current = inputs;
  });
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  const { form, customRates, recipeOverrides, inventory, disabledShards, ownedAttributes } = inputs;
  const currentKey = useMemo(
    () => inputsKey({ form, customRates, recipeOverrides, inventory, disabledShards, ownedAttributes }),
    [form, customRates, recipeOverrides, inventory, disabledShards, ownedAttributes],
  );

  const run = useCallback((withSettings: OptimizerSettings) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const current = inputsRef.current;
    setPlanKey(inputsKey(current));
    setState({ status: "running", progress: 0 });

    optimizeInventory(current.form, current.customRates, current.recipeOverrides, current, withSettings, controller.signal, (progress) => {
      if (!controller.signal.aborted) setState({ status: "running", progress });
    })
      .then((outcome) => {
        if (!controller.signal.aborted) setState({ status: "done", outcome });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Inventory optimization failed:", err);
        setState({ status: "error", message: err instanceof Error ? err.message : "Optimization failed" });
      });
  }, []);

  /** Plans if there is nothing to show yet; otherwise keeps the last plan. */
  const ensurePlan = useCallback(() => {
    if (state.status === "idle" || state.status === "error") run(settings);
  }, [state.status, run, settings]);

  const recalculate = useCallback(() => run(settings), [run, settings]);

  const setSettings = useCallback(
    (next: OptimizerSettings) => {
      const clean = sanitizeOptimizerSettings(next);
      setSettingsState(clean);
      saveOptimizerSettings(clean);
      run(clean);
    },
    [run],
  );

  return {
    state,
    settings,
    setSettings,
    ensurePlan,
    recalculate,
    /** The shown plan was made for a different inventory or calculator settings. */
    isStale: state.status === "done" && planKey !== currentKey,
  };
};
