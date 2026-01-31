import React, { useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { useGridState } from "../../context";
import { optimizeExpansion } from "../../services";

export const ExpansionOptimizer: React.FC = () => {
  const { 
    getUnlockedCellsArray, 
    getLockedCellsArray, 
    setExpansionSteps, 
    clearExpansionSteps,
    expansionSteps,
  } = useGridState();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ totalSteps: number; finalCount: number } | null>(null);
  
  const handleOptimize = async () => {
    const unlockedCells = getUnlockedCellsArray();
    const lockedCells = getLockedCellsArray();
    
    if (unlockedCells.length === 0) {
      setError("Please select at least one cell first");
      return;
    }
    
    if (lockedCells.length === 0) {
      setError("No locked cells to expand to");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await optimizeExpansion({
        unlocked_cells: unlockedCells,
        locked_cells: lockedCells,
      });
      
      setExpansionSteps(response.steps);
      setResult({
        totalSteps: response.total_steps,
        finalCount: response.final_gloomgourd_count,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to optimize expansion");
      clearExpansionSteps();
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClear = () => {
    clearExpansionSteps();
    setResult(null);
    setError(null);
  };
  
  const hasOverlay = expansionSteps.length > 0;
  
  return (
    <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-medium text-slate-200">Expansion Optimizer</h3>
      </div>
      
      <p className="text-xs text-slate-400 mb-4">
        Find the optimal order to unlock cells to maximize gloomgourd potential.
        Click the highlighted cells in order to follow the expansion path.
      </p>
      
      <div className="flex gap-2">
        <button
          onClick={handleOptimize}
          disabled={isLoading}
          className="flex-1 px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 font-medium rounded-md text-sm border border-yellow-500/20 hover:border-yellow-500/30 transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Calculating...</span>
            </>
          ) : (
            <>
              <span>Optimize</span>
            </>
          )}
        </button>
        
        {hasOverlay && (
          <button
            onClick={handleClear}
            className="px-3 py-2 bg-slate-600/50 hover:bg-slate-600/70 text-slate-300 font-medium rounded-md text-sm border border-slate-500/30 hover:border-slate-500/50 transition-colors duration-200 flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Clear</span>
          </button>
        )}
      </div>
      
      {error && (
        <div className="mt-3 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-md text-red-300 text-xs">
          {error}
        </div>
      )}
      
      {result && hasOverlay && (
        <div className="mt-3 px-3 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-md text-emerald-300 text-xs">
          <span className="font-medium">{result.totalSteps} expansion steps</span>
        </div>
      )}
    </div>
  );
};
