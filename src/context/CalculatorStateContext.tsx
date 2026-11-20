import React, { useState, useCallback, useEffect, useMemo } from "react";
import type { CalculationFormData } from "../schemas";
import { saveFormData, loadFormData, clearFormData, getSaveEnabled, setSaveEnabled } from "../utilities";
import { CalculatorStateContext, type CalculatorStateContextType } from "./contexts";

const DEFAULT_FORM: CalculationFormData = {
  shard: "",
  quantity: 1,
  hunterFortune: 0,
  excludeChameleon: false,
  frogBonus: false,
  newtLevel: 0,
  salamanderLevel: 0,
  lizardKingLevel: 0,
  leviathanLevel: 0,
  pythonLevel: 0,
  kingCobraLevel: 0,
  seaSerpentLevel: 0,
  tiamatLevel: 0,
  crocodileLevel: 0,
  kuudraTier: "none",
  moneyPerHour: Infinity,
  customKuudraTime: false,
  kuudraTimeSeconds: null,
  noWoodenBait: false,
  ironManView: true,
  instantBuyPrices: false,
  craftPenalty: 0.8,
  materialsOnly: false,
  selectedShardKeys: [],
  shardQuantities: [],
};

/** Saved settings layered over the defaults; a field that failed validation on load keeps its default. */
const loadInitialForm = (): CalculationFormData => {
  const saved = getSaveEnabled() ? loadFormData() : null;
  return saved ? { ...DEFAULT_FORM, ...saved } : DEFAULT_FORM;
};

/**
 * Calculator form, lifted above the router so it survives page navigation (the
 * Shards page reads it too). Auto-saves to localStorage while saving is enabled.
 */
export const CalculatorStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [form, setForm] = useState<CalculationFormData>(loadInitialForm);
  const [saveEnabled, setSaveEnabledLocal] = useState(getSaveEnabled);

  useEffect(() => {
    if (saveEnabled) saveFormData(form);
  }, [form, saveEnabled]);

  const setSaveEnabledState = useCallback((enabled: boolean) => {
    setSaveEnabledLocal(enabled);
    setSaveEnabled(enabled);
    // Turning saving off forgets the saved copy but keeps the form on screen.
    if (!enabled) clearFormData();
  }, []);

  const value = useMemo<CalculatorStateContextType>(() => ({ form, setForm, saveEnabled, setSaveEnabledState }), [form, saveEnabled, setSaveEnabledState]);

  return <CalculatorStateContext.Provider value={value}>{children}</CalculatorStateContext.Provider>;
};
