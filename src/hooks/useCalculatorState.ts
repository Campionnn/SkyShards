import { useContext } from "react";
import { CalculatorStateContext } from "../context/CalculatorStateContext";

export const useCalculatorState = () => {
  const ctx = useContext(CalculatorStateContext);
  if (!ctx) throw new Error("useCalculatorState must be used within CalculatorStateProvider");
  return ctx;
};
