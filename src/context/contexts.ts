import { createContext } from "react";
import type { CalculationFormData } from "../schemas";
import type { Shard } from "../types/types";

// Context objects live apart from their providers so the provider files export only
// components (react-refresh). Read them through `useCalculatorState` / `useRecipeState`.

export interface CalculatorStateContextType {
  form: CalculationFormData;
  setForm: (data: CalculationFormData) => void;
  saveEnabled: boolean;
  setSaveEnabledState: (enabled: boolean) => void;
}

export const CalculatorStateContext = createContext<CalculatorStateContextType | undefined>(undefined);

export interface RecipeStateContextType {
  selectedShard: Shard | null;
  setSelectedShard: (shard: Shard | null) => void;
  selectedOutputShard: Shard | null;
  setSelectedOutputShard: (shard: Shard | null) => void;
}

export const RecipeStateContext = createContext<RecipeStateContextType | undefined>(undefined);
