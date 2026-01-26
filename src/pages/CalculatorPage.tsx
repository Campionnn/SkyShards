import React, { useState, useRef, useCallback } from "react";
import { Play } from "lucide-react";
import { useGridState, useGreenhouseData, useLockedPlacements } from "../context";
import { GridPreview, GridManagerModal } from "../components";
import { MutationTargets, SolverResults, CropConfigurationsPanel } from "../components";
import { solveGreenhouseWithJob } from "../services";
import type { SolveResponse, MutationGoal, JobProgress } from "../types/greenhouse";

export const CalculatorPage: React.FC = () => {
  const { getUnlockedCellsArray, unlockedCells } = useGridState();
  const { selectedMutations, isLoading: dataLoading } = useGreenhouseData();
  const { getLocksForAPI, priorities } = useLockedPlacements();

  // Modal state
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);

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
        mutation: m.id,
        maximize: m.mode === "maximize",
        count: m.mode === "target" ? m.targetCount : null,
      }));

      const response = await solveGreenhouseWithJob(
        { 
          cells, 
          targets,
          priorities: Object.keys(priorities).length > 0 ? priorities : undefined,
          locks: getLocksForAPI().length > 0 ? getLocksForAPI() : undefined,
        },
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
  }, [getUnlockedCellsArray, selectedMutations, previewResult, priorities, getLocksForAPI]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);
  
  const handleClearResults = useCallback(() => {
    setResult(null);
    setPreviewResult(null);
    setError(null);
    setProgress(null);
    setQueuePosition(null);
  }, []);

  const unlockedCount = unlockedCells.size;

  // Determine what to show in the results area
  const displayResult = result || previewResult;

  return (
    <>
      <div className="container mx-auto px-4 py-6 max-w-screen-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_420px] gap-6">
          {/* Column 1 - Configuration */}
          <div className="space-y-4">
            {/* Grid Preview - small clickable preview */}
            <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-200">Grid Configuration</h3>
                <span className="text-xs text-slate-400">
                  {unlockedCount} cells unlocked
                </span>
              </div>
              <GridPreview onClick={() => setIsGridModalOpen(true)} />
              <p className="text-xs text-slate-500 mt-2">
                Click to manage unlocked cells
              </p>
            </div>

            {/* Mutation Targets */}
            <MutationTargets />

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
                  <span>Stop Solving</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Solve</span>
                </>
              )}
            </button>
          </div>

          {/* Columns 2 - Results (Interactive Grid with Locked Placements) */}
          <div>
            <SolverResults
              result={displayResult}
              error={error}
              isLoading={false}
              progress={progress}
              queuePosition={queuePosition}
              onClear={handleClearResults}
            />
          </div>

          {/* Column 3 - Crop Configurations (wider) */}
          <div className="space-y-4">
            <CropConfigurationsPanel />
          </div>
        </div>
      </div>

      {/* Grid Manager Modal */}
      <GridManagerModal 
        isOpen={isGridModalOpen} 
        onClose={() => setIsGridModalOpen(false)} 
      />
    </>
  );
};
