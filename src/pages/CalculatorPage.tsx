import React, { useState, useRef, useCallback, useEffect } from "react";
import { Play, Grid3x3 } from "lucide-react";
import { useGridState, useGreenhouseData, useLockedPlacements } from "../context";
import { GridManagerModal, FirstTimeVisitorModal } from "../components";
import { MutationTargets, SolverResults, CropConfigurationsPanel } from "../components";
import { solveGreenhouseWithJob } from "../services";
import { LocalStorageManager } from "../utilities";
import type { SolveResponse, MutationGoal, JobProgress } from "../types/greenhouse";

export const CalculatorPage: React.FC = () => {
  const { getUnlockedCellsArray, unlockedCells } = useGridState();
  const { selectedMutations, isLoading: dataLoading } = useGreenhouseData();
  const { getLocksForAPI, priorities } = useLockedPlacements();

  // Modal state
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const [isFirstTimeModalOpen, setIsFirstTimeModalOpen] = useState(false);

  // Check if user is a first-time visitor
  useEffect(() => {
    // Small delay to ensure contexts have initialized
    const timer = setTimeout(() => {
      // Check if the user has actually customized anything
      const gridConfig = LocalStorageManager.loadGridConfig();
      const mutationTargets = LocalStorageManager.loadMutationTargets();
      const designerInputs = LocalStorageManager.loadDesignerInputs();
      const designerTargets = LocalStorageManager.loadDesignerTargets();
      const lockedPlacements = LocalStorageManager.loadLockedPlacements();
      const priorities = LocalStorageManager.loadPriorities();
      const hasVisited = localStorage.getItem("skyshards-has-visited");
      
      // Check if grid config is the default (12 cells in a 4x4 diamond pattern)
      const isDefaultGrid = gridConfig && gridConfig.size === 12;
      
      // Check if there's any actual user data (non-empty, non-default)
      const hasUserData = 
        (!isDefaultGrid && gridConfig && gridConfig.size > 0) || // Non-default grid
        (mutationTargets && mutationTargets.length > 0) || // Has mutation targets
        (designerInputs && designerInputs.length > 0) || // Has designer inputs
        (designerTargets && designerTargets.length > 0) || // Has designer targets
        (lockedPlacements && lockedPlacements.length > 0) || // Has locked placements
        (priorities && Object.keys(priorities).length > 0); // Has custom priorities
      
      // If no user data AND hasn't visited before, show the first-time modal
      if (!hasUserData && !hasVisited) {
        setIsFirstTimeModalOpen(true);
      }
      
      // Mark as visited
      localStorage.setItem("skyshards-has-visited", "true");
    }, 100); // Small delay to let contexts initialize
    
    return () => clearTimeout(timer);
  }, []);

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
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-screen-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_420px] gap-4 lg:gap-6">
          <div className="space-y-4 order-2 lg:order-1">
            <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-200">Grid Configuration</h3>
                <span className="text-xs text-slate-400">
                  {unlockedCount} cells unlocked
                </span>
              </div>
              <button
                onClick={() => setIsGridModalOpen(true)}
                className="w-full px-4 py-3 bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/50 hover:border-emerald-500/50 rounded-lg text-sm font-medium text-slate-300 hover:text-emerald-300 transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Grid3x3 className="w-4 h-4" />
                <span>Configure Grid</span>
              </button>
              <p className="text-xs text-slate-500 mt-2 text-center">
                <span className="hidden sm:inline">Click to manage unlocked cells</span>
                <span className="sm:hidden">Tap to manage unlocked cells</span>
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

          <div className="order-1 lg:order-2">
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
          <div className="flex flex-col h-[500px] lg:h-[calc(100vh-180px)] lg:min-h-[500px] order-3">
            <CropConfigurationsPanel className="flex-1 overflow-hidden" />
          </div>
        </div>
      </div>

      {/* Grid Manager Modal */}
      <GridManagerModal 
        isOpen={isGridModalOpen} 
        onClose={() => setIsGridModalOpen(false)} 
      />

      {/* First Time Visitor Modal */}
      <FirstTimeVisitorModal
        isOpen={isFirstTimeModalOpen}
        onClose={() => setIsFirstTimeModalOpen(false)}
        onConfigureGrid={() => setIsGridModalOpen(true)}
      />
    </>
  );
};
