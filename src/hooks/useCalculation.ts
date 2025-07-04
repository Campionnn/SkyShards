import { useState, useCallback } from "react";
import { CalculationService } from "../services/calculationService";
import type { CalculationParams, CalculationResult } from "../types";

export const useCalculation = () => {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(async (targetShard: string, requiredQuantity: number, params: CalculationParams) => {
    try {
      setLoading(true);
      setError(null);

      const calculationService = CalculationService.getInstance();
      const calculationResult = await calculationService.calculateOptimalPath(targetShard, requiredQuantity, params);

      setResult(calculationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calculation failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    result,
    loading,
    error,
    calculate,
    clearResult,
  };
};
