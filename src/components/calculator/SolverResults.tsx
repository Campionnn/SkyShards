import React from "react";
import { CheckCircle2, AlertCircle, Grid3X3, Leaf } from "lucide-react";
import { GRID_SIZE } from "../../constants";
import type { SolveResponse } from "../../types/greenhouse";
import { getCropColor } from "../../types/greenhouse";

interface SolverResultsProps {
  result: SolveResponse | null;
  error: string | null;
  isLoading: boolean;
}

export const SolverResults: React.FC<SolverResultsProps> = ({
  result,
  error,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Grid3X3 className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-medium text-slate-200">Solution</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3" />
          <span className="text-sm text-slate-400">Solving...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-medium text-slate-200">Error</h3>
        </div>
        <div className="px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-md text-red-300 text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Grid3X3 className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-medium text-slate-400">Solution</h3>
        </div>
        <div className="text-center py-8 text-slate-500 text-sm">
          Click "Solve" to find the optimal crop placement
        </div>
      </div>
    );
  }

  // Build a grid map of crop placements for visualization
  const gridMap: (string | null)[][] = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(null));

  result.placements.forEach((placement) => {
    placement.cells.forEach(([row, col]) => {
      gridMap[row][col] = placement.crop;
    });
  });

  // Mark mutation eligible cells
  const mutationCells: Map<string, Set<string>> = new Map();
  result.mutations.forEach((mutation) => {
    const cellSet = new Set<string>();
    mutation.eligible_cells.forEach(([row, col]) => {
      cellSet.add(`${row},${col}`);
    });
    mutationCells.set(mutation.mutation, cellSet);
  });

  const isOptimal = result.status === "OPTIMAL";

  return (
    <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        {isOptimal ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        ) : (
          <AlertCircle className="w-4 h-4 text-yellow-400" />
        )}
        <h3 className="text-sm font-medium text-slate-200">Solution</h3>
        {result.cache_hit && (
          <span className="text-xs text-slate-500 ml-auto">cached</span>
        )}
      </div>

      {/* Status */}
      <div
        className={`px-3 py-2 rounded-md text-sm mb-4 ${
          isOptimal
            ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
            : "bg-yellow-500/20 border border-yellow-500/30 text-yellow-300"
        }`}
      >
        {isOptimal ? "Optimal solution found!" : `Status: ${result.status}`}
      </div>

      {/* Mutations Summary */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
          Mutations
        </h4>
        <div className="space-y-2">
          {result.mutations.map((mutation) => (
            <div
              key={mutation.mutation}
              className="flex items-center justify-between bg-slate-700/30 rounded-md px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-slate-200 capitalize">
                  {mutation.mutation.replace(/_/g, " ")}
                </span>
              </div>
              <span className="text-sm font-medium text-emerald-400">
                x{mutation.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Crop Placements */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
          Crop Placements
        </h4>
        <div className="flex flex-wrap gap-2">
          {result.placements.map((placement) => (
            <div
              key={placement.crop}
              className="flex items-center gap-2 bg-slate-700/30 rounded-md px-2 py-1"
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: getCropColor(placement.crop) }}
              />
              <span className="text-xs text-slate-300 capitalize">
                {placement.crop.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-slate-500">x{placement.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Grid */}
      <div className="mb-3">
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
          Grid Layout
        </h4>
        <div className="inline-block">
          <div className="flex flex-col gap-0.5">
            {gridMap.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-0.5">
                {row.map((crop, colIndex) => {
                  const cellKey = `${rowIndex},${colIndex}`;
                  // Check if this cell is eligible for any mutation
                  let isMutationCell = false;
                  mutationCells.forEach((cells) => {
                    if (cells.has(cellKey)) {
                      isMutationCell = true;
                    }
                  });

                  return (
                    <div
                      key={colIndex}
                      className={`w-5 h-5 rounded-sm flex items-center justify-center ${
                        crop
                          ? isMutationCell
                            ? "ring-1 ring-yellow-400"
                            : ""
                          : "bg-slate-700/30"
                      }`}
                      style={{
                        backgroundColor: crop
                          ? getCropColor(crop)
                          : undefined,
                      }}
                      title={crop ? `${crop} (${rowIndex}, ${colIndex})` : "empty"}
                    >
                      {isMutationCell && (
                        <div className="w-2 h-2 rounded-full bg-yellow-400/80" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-400 pt-2 border-t border-slate-700/50">
        <span className="text-slate-500">Legend:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-slate-700/30" />
          <span>Empty</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-emerald-500/50 ring-1 ring-yellow-400 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400/80" />
          </div>
          <span>Mutation Cell</span>
        </div>
      </div>
    </div>
  );
};
