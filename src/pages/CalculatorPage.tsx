import React, { useState } from "react";
import { Calculator, Play, Loader2 } from "lucide-react";
import { useGridState, useGreenhouseData } from "../context";
import { GridPreview } from "../components/grid";
import { MutationTargets, SolverResults } from "../components/calculator";
import { solveGreenhouse } from "../services/greenhouseService";
import type { SolveResponse, MutationGoal } from "../types/greenhouse";

export const CalculatorPage: React.FC = () => {
  const { getUnlockedCellsArray, unlockedCells } = useGridState();
  const { crops, mutations, selectedMutations, isLoading: dataLoading } = useGreenhouseData();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SolveResponse | null>(null);

  const handleSolve = async () => {
    const cells = getUnlockedCellsArray();

    if (cells.length === 0) {
      setError("No cells are unlocked. Go to the Grid tab to configure your greenhouse.");
      return;
    }

    if (selectedMutations.length === 0) {
      setError("No mutation targets selected. Add at least one target to optimize for.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert selected mutations to API format
      const targets: MutationGoal[] = selectedMutations.map((m) => ({
        mutation: m.name,
        maximize: m.mode === "maximize",
        count: m.mode === "target" ? m.targetCount : null,
      }));

      const response = await solveGreenhouse({
        cells,
        targets,
      });

      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to solve");
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const unlockedCount = unlockedCells.size;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Calculator className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Calculator</h1>
        </div>
        <p className="text-slate-400 text-sm">
          Optimize crop placement in your greenhouse to maximize mutation output.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Configuration */}
        <div className="space-y-4">
          {/* Mutation Targets */}
          <MutationTargets />

          {/* Grid Preview */}
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-200">Your Grid</h3>
              <span className="text-xs text-slate-400">
                {unlockedCount} cells unlocked
              </span>
            </div>
            <GridPreview />
            <p className="text-xs text-slate-500 mt-2">
              Click the grid to edit in the Grid tab
            </p>
          </div>

          {/* Solve Button */}
          <button
            onClick={handleSolve}
            disabled={isLoading || dataLoading}
            className="w-full px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-500"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Solving...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Solve</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column - Results */}
        <div className="lg:col-span-2">
          <SolverResults result={result} error={error} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};
