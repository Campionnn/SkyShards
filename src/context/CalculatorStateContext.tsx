import React, { createContext, useContext, useState, useCallback } from "react";
import type { CalculationFormData } from "../schemas/validation";

const defaultForm: CalculationFormData = {
  shard: "",
  quantity: 1,
  hunterFortune: 0,
  excludeChameleon: false,
  frogPet: false,
  newtLevel: 0,
  salamanderLevel: 0,
  lizardKingLevel: 0,
  leviathanLevel: 0,
  pythonLevel: 0,
  kingCobraLevel: 0,
  seaSerpentLevel: 0,
  tiamatLevel: 0,
  kuudraTier: "none", // No Kuudra by default
  moneyPerHour: Infinity,
  noWoodenBait: false,
};

interface CalculatorStateContextType {
  form: CalculationFormData;
  setForm: (data: CalculationFormData) => void;
  resetForm: () => void;
  result: any;
  setResult: (result: any) => void;
  calculationData: any;
  setCalculationData: (data: any) => void;
  targetShardName: string;
  setTargetShardName: (name: string) => void;
}

const CalculatorStateContext = createContext<CalculatorStateContextType | undefined>(undefined);

export const CalculatorStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [form, setForm] = useState<CalculationFormData>(defaultForm);
  const [result, setResult] = useState<any>(null);
  const [calculationData, setCalculationData] = useState<any>(null);
  const [targetShardName, setTargetShardName] = useState<string>("");

  React.useEffect(() => {
    console.log("[CalculatorStateProvider] Mounted");
    return () => {
      console.log("[CalculatorStateProvider] Unmounted");
    };
  }, []);

  const handleSetForm = useCallback((data: CalculationFormData) => {
    setForm(data);
  }, []);

  const resetForm = useCallback(() => {
    setForm(defaultForm);
  }, []);

  return (
    <CalculatorStateContext.Provider value={{ form, setForm: handleSetForm, resetForm, result, setResult, calculationData, setCalculationData, targetShardName, setTargetShardName }}>
      {children}
    </CalculatorStateContext.Provider>
  );
};

export const useCalculatorState = () => {
  const ctx = useContext(CalculatorStateContext);
  if (!ctx) throw new Error("useCalculatorState must be used within CalculatorStateProvider");
  return ctx;
};
