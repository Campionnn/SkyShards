import React, { useState, useRef, useCallback } from "react";
import { Calculator, Play, Loader2, StopCircle } from "lucide-react";
import { useGridState, useGreenhouseData } from "../context";
import { GridPreview } from "../components/grid";
import { MutationTargets, SolverProgress, SolverResults } from "../components/calculator";
import { solveGreenhouseWithJob } from "../services/greenhouseService";
import type { SolveResponse, MutationGoal, JobProgress } from "../types/greenhouse";

export const CalculatorPage: React.FC = () => {
  const { getUnlockedCellsArray, unlockedCells } = useGridState();
  const { selectedMutations, isLoading: dataLoading } = useGreenhouseData();

  // Solver state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SolveResponse | null>(null);
  
  // Job progress state
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [previewResult, setPreviewResult] = useState<SolveResponse | null>(null);
  
  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSolve = useCallback(async () => {
    const cells = getUnlockedCellsArray();

    if (cells.length === 0) {
      setError("No cells are unlocked. Go to the Grid tab to configure your greenhouse.");
      return;
    }

    if (selectedMutations.length === 0) {
      setError("No mutation targets selected. Add at least one target to optimize for.");
      return;
    }

    // Reset state
    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgress(null);
    setQueuePosition(null);
    setPreviewResult(null);

    // Create abort controller for this solve
    abortControllerRef.current = new AbortController();

    try {
      // Convert selected mutations to API format
      const targets: MutationGoal[] = selectedMutations.map((m) => ({
        mutation: m.name,
        maximize: m.mode === "maximize",
        count: m.mode === "target" ? m.targetCount : null,
      }));

      const response = await solveGreenhouseWithJob(
        { cells, targets },
        {
          onProgress: (p) => {
            setProgress(p);
            setQueuePosition(null);
          },
          onQueuePosition: (pos) => {
            setQueuePosition(pos);
            setProgress(null);
          },
          onPreviewUpdate: (preview) => {
            setPreviewResult(preview);
          },
        },
        abortControllerRef.current.signal
      );

      setResult(response);
      setPreviewResult(null);
    } catch (err) {
      if (err instanceof Error && err.message === "Job cancelled") {
        // If we have a preview result, show it as the final result
        if (previewResult) {
          setResult({ ...previewResult, status: "CANCELLED" });
        }
      } else {
        setError(err instanceof Error ? err.message : "Failed to solve");
        setResult(null);
      }
    } finally {
      setIsLoading(false);
      setProgress(null);
      setQueuePosition(null);
      abortControllerRef.current = null;
    }
  }, [getUnlockedCellsArray, selectedMutations, previewResult]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const unlockedCount = unlockedCells.size;

  // Determine what to show in the results area
  const showProgress = isLoading && (progress !== null || queuePosition !== null);
  const displayResult = result || previewResult;

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
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
            onClick={isLoading ? handleCancel : handleSolve}
            disabled={dataLoading}
            className={`w-full px-4 py-3 font-medium rounded-lg text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              isLoading
                ? "bg-red-500/80 hover:bg-red-600 text-white"
                : "bg-emerald-500 hover:bg-emerald-600 text-white"
            }`}
          >
            {isLoading ? (
              <>
                <StopCircle className="w-4 h-4" />
                <span>Stop Solving</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Solve</span>
              </>
            )}
          </button>

          {/* Progress Panel (when solving) */}
          {showProgress && (
            <SolverProgress
              progress={progress}
              queuePosition={queuePosition}
              onCancel={handleCancel}
            />
          )}
        </div>

        {/* Right Column - Results */}
        <div className="lg:col-span-2">
          {isLoading && !showProgress && !displayResult ? (
            <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
                <span className="text-sm text-slate-400">Submitting job...</span>
              </div>
            </div>
          ) : (
            <SolverResults
              result={displayResult}
              error={error}
              isLoading={false}
            />
          )}
        </div>
      </div>
    </div>
  );
};
