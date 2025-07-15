import { useState, useCallback, useRef } from "react";
import { CalculationService, AsyncCalculationService } from "../services";
import type { CalculationParams, CalculationResult, RecipeOverride } from "../types/types";
import type { AsyncCalculationProgress } from "../services/asyncCalculationService";

export const useCalculation = () => {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<AsyncCalculationProgress | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  const calculate = useCallback(async (targetShard: string, requiredQuantity: number, params: CalculationParams, recipeOverrides: RecipeOverride[] = [], useAsync: boolean = true) => {
    try {
      setLoading(true);
      setError(null);
      setProgress(null);

      if (useAsync) {
        const asyncService = AsyncCalculationService.getInstance();

        cancelRef.current = () => asyncService.cancelCalculation();

        const calculationResult = await asyncService.calculateOptimalPathAsync(targetShard, requiredQuantity, params, recipeOverrides, (progressInfo) => {
          setProgress(progressInfo);
        });

        setResult(calculationResult);
      } else {
        const calculationService = CalculationService.getInstance();
        const calculationResult = await calculationService.calculateOptimalPath(targetShard, requiredQuantity, params, recipeOverrides);

        setResult(calculationResult);
      }

      setProgress(null);
      cancelRef.current = null;
    } catch (err) {
      if (err instanceof Error && err.message === "Calculation cancelled") {
        setResult(null);
      } else {
        setError(err instanceof Error ? err.message : "Calculation failed");
        setResult(null);
      }
      setProgress(null);
      cancelRef.current = null;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelCalculation = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current();
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    setProgress(null);
  }, []);

  return {
    result,
    loading,
    error,
    progress,
    calculate,
    cancelCalculation,
    clearResult,
  };
};
