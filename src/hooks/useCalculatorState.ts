import { useContext } from "react";
import { CalculatorStateContext } from "../context/contexts";

export const useCalculatorState = () => {
  const context = useContext(CalculatorStateContext);
  if (!context) throw new Error("useCalculatorState must be used within a CalculatorStateProvider");
  return context;
};
