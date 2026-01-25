import React, { useMemo, useState } from "react";
import { CheckCircle2, AlertCircle, Grid3X3, Leaf, ImageOff, Eye, EyeOff, Zap, Target, TrendingUp, Clock } from "lucide-react";
import { GRID_SIZE } from "../../constants";
import { useGreenhouseData } from "../../context";
import type { SolveResponse, CropPlacement, MutationResult, JobProgress } from "../../types/greenhouse";
import { getCropImagePath, getGroundImagePath } from "../../types/greenhouse";

interface SolverResultsProps {
  result: SolveResponse | null;
  error: string | null;
  isLoading: boolean;
  progress?: JobProgress | null;
  queuePosition?: number | null;
}

// Represents a crop/mutation placement on the grid
interface PlacementItem {
  name: string;
  size: number;
  startRow: number;
  startCol: number;
}

/**
 * Helper to get all cells occupied by a placement at a position with given size.
 */
function getOccupiedCells(position: [number, number], size: number): [number, number][] {
  const cells: [number, number][] = [];
  for (let dr = 0; dr < size; dr++) {
    for (let dc = 0; dc < size; dc++) {
      cells.push([position[0] + dr, position[1] + dc]);
    }
  }
  return cells;
}

/**
 * Convert placements from API format (position/size) to PlacementItem format.
 * Also builds a set of all occupied cells.
 */
function processPlacementsToItems(
  placements: CropPlacement[]
): { items: PlacementItem[]; occupiedCells: Set<string> } {
  const items: PlacementItem[] = [];
  const occupiedCells = new Set<string>();

  for (const p of placements) {
    items.push({
      name: p.crop,
      size: p.size,
      startRow: p.position[0],
      startCol: p.position[1],
    });
    
    // Mark all cells as occupied
    const cells = getOccupiedCells(p.position, p.size);
    for (const [row, col] of cells) {
      occupiedCells.add(`${row},${col}`);
    }
  }

  return { items, occupiedCells };
}

/**
 * Convert mutations from API format (position/size) to PlacementItem format.
 */
function processMutationsToItems(mutations: MutationResult[]): PlacementItem[] {
  return mutations.map(m => ({
    name: m.mutation,
    size: m.size,
    startRow: m.position[0],
    startCol: m.position[1],
  }));
}

// Component for merged mutation cells (handles 1x1, 2x2, 3x3)
const MutationMergedCell: React.FC<{
  item: PlacementItem;
  groundType: string;
  cellSize: number;
  gap: number;
  showImage: boolean;
}> = ({ item, groundType, cellSize, gap, showImage }) => {
  const [imageError, setImageError] = useState(false);
  
  const totalWidth = item.size * cellSize + (item.size - 1) * gap;
  const totalHeight = item.size * cellSize + (item.size - 1) * gap;
  
  const imageScale = item.size === 1 ? 0.8 : 0.6;
  const imageWidth = totalWidth * imageScale;
  const imageHeight = totalHeight * imageScale;
  
  const style: React.CSSProperties = {
    position: "absolute",
    top: item.startRow * (cellSize + gap),
    left: item.startCol * (cellSize + gap),
    width: totalWidth,
    height: totalHeight,
    backgroundImage: `url(${getGroundImagePath(groundType)})`,
    backgroundSize: `${cellSize}px ${cellSize}px`,
    backgroundPosition: "top left",
    backgroundRepeat: "repeat",
    boxShadow: showImage ? "0 0 8px rgba(0, 200, 255, 1), inset 0 0 8px rgba(0, 200, 255, 1)" : "",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    zIndex: 5, // Above crops
  };

  return (
    <div
      style={style}
      title={`${item.name} (${item.startRow}, ${item.startCol})${item.size > 1 ? ` - ${item.size}x${item.size}` : ""}`}
      className="transition-transform hover:scale-105 hover:z-10"
    >
      {showImage && !imageError ? (
        <img
          src={getCropImagePath(item.name)}
          alt={item.name}
          style={{ width: imageWidth, height: imageHeight }}
          className="object-contain"
          onError={() => setImageError(true)}
          draggable={false}
        />
      ) : showImage && imageError ? (
        <div className="flex flex-col items-center justify-center text-purple-300/50">
          <Leaf className="w-5 h-5" />
          <span className="text-[7px] capitalize truncate max-w-full px-0.5">
            {item.name.replace(/_/g, " ")}
          </span>
        </div>
      ) : null}
    </div>
  );
};

// Component for a single crop cell with image
const CropCell: React.FC<{
  item: PlacementItem;
  groundType: string;
  cellSize: number;
  gap: number;
}> = ({ item, groundType, cellSize, gap }) => {
  const [cropImageError, setCropImageError] = useState(false);
  
  const totalWidth = item.size * cellSize + (item.size - 1) * gap;
  const totalHeight = item.size * cellSize + (item.size - 1) * gap;
  
  // Scale: 90% for 1x1, 75% for 2x2 and 3x3
  const imageScale = item.size === 1 ? 0.8 : 0.6;
  const imageWidth = totalWidth * imageScale;
  const imageHeight = totalHeight * imageScale;
  
  const style: React.CSSProperties = {
    position: "absolute",
    top: item.startRow * (cellSize + gap),
    left: item.startCol * (cellSize + gap),
    width: totalWidth,
    height: totalHeight,
    backgroundImage: `url(${getGroundImagePath(groundType)})`,
    // Tile the ground texture instead of stretching - use cellSize for each tile
    backgroundSize: `${cellSize}px ${cellSize}px`,
    backgroundPosition: "top left",
    backgroundRepeat: "repeat",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "transparent",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  return (
    <div
      style={style}
      title={`${item.name} (${item.startRow}, ${item.startCol})${item.size > 1 ? ` - ${item.size}x${item.size}` : ""}`}
      className="transition-transform hover:scale-105 hover:z-10"
    >
      {!cropImageError ? (
        <img
          src={getCropImagePath(item.name)}
          alt={item.name}
          style={{ width: imageWidth, height: imageHeight }}
          className="object-contain"
          onError={() => setCropImageError(true)}
          draggable={false}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-white/60">
          <ImageOff className="w-4 h-4" />
          <span className="text-[8px] mt-0.5 capitalize truncate max-w-full px-1">
            {item.name.replace(/_/g, " ")}
          </span>
        </div>
      )}
    </div>
  );
};

export const SolverResults: React.FC<SolverResultsProps> = ({
  result,
  error,
  isLoading,
  progress,
  queuePosition,
}) => {
  const { getCropDef, getMutationDef } = useGreenhouseData();
  const [showMutations, setShowMutations] = useState(true);

  // Build ground type map for crops
  // Check both crop definitions AND mutation definitions for ground type
  const cropGrounds = useMemo(() => {
    const grounds = new Map<string, string>();
    if (result) {
      (result.placements || []).forEach((p) => {
        const cropDef = getCropDef(p.crop);
        const mutationDef = getMutationDef(p.crop);
        
        // Ground type: prefer crop definition, fallback to mutation definition
        // This handles cases where mutations are used as requirements (e.g., magic_jellybean)
        grounds.set(p.crop, cropDef?.ground || mutationDef?.ground || "farmland");
      });
    }
    return grounds;
  }, [result, getCropDef, getMutationDef]);

  // Build ground type map for mutations
  // Check both mutation definitions AND crop definitions for ground type
  const mutationGrounds = useMemo(() => {
    const grounds = new Map<string, string>();
    if (result) {
      (result.mutations || []).forEach((m) => {
        const mutationDef = getMutationDef(m.mutation);
        const cropDef = getCropDef(m.mutation);
        
        // Ground type: prefer crop definition (for intermediate mutations), fallback to mutation definition
        grounds.set(m.mutation, cropDef?.ground || mutationDef?.ground || "farmland");
      });
    }
    return grounds;
  }, [result, getMutationDef, getCropDef]);

  // Process placements into PlacementItems for rendering
  const { items: cropItems, occupiedCells } = useMemo(() => {
    if (!result) return { items: [], occupiedCells: new Set<string>() };
    return processPlacementsToItems(result.placements || []);
  }, [result]);

  // Process mutations into PlacementItems for rendering
  const mutationItems = useMemo(() => {
    if (!result || !result.mutations) return [];
    return processMutationsToItems(result.mutations);
  }, [result]);

  // Calculate grid dimensions
  const cellSize = 48; // Base cell size in pixels
  const gap = 2; // Gap between cells
  const gridWidth = GRID_SIZE * cellSize + (GRID_SIZE - 1) * gap;
  const gridHeight = GRID_SIZE * cellSize + (GRID_SIZE - 1) * gap;

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
        
        {/* Empty grid visualization */}
        <div className="mb-4">
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
            Grid Layout
          </h4>
          <div className="w-full overflow-x-auto">
            <div
              className="relative mx-auto"
              style={{
                width: cellSize * GRID_SIZE + gap * (GRID_SIZE - 1),
                height: cellSize * GRID_SIZE + gap * (GRID_SIZE - 1),
                minWidth: cellSize * GRID_SIZE + gap * (GRID_SIZE - 1),
              }}
            >
              {/* Background grid */}
              {Array.from({ length: GRID_SIZE }).map((_, rowIndex) =>
                Array.from({ length: GRID_SIZE }).map((_, colIndex) => {
                  const key = `${rowIndex},${colIndex}`;
                  return (
                    <div
                      key={key}
                      style={{
                        position: "absolute",
                        top: rowIndex * (cellSize + gap),
                        left: colIndex * (cellSize + gap),
                        width: cellSize,
                        height: cellSize,
                      }}
                      className="bg-slate-700/30 rounded"
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
        
        <div className="text-center py-4 text-slate-500 text-sm">
          Configure your targets and click "Solve" to find the optimal crop placement
        </div>
      </div>
    );
  }

  const isOptimal = result.status === "OPTIMAL";
  const isSolving = progress !== null && progress !== undefined; // Only show as solving when progress exists

  return (
    <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        {isOptimal ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        ) : isSolving ? (
          <div className="w-4 h-4 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        ) : (
          <AlertCircle className="w-4 h-4 text-yellow-400" />
        )}
        <h3 className="text-sm font-medium text-slate-200">
          {isSolving ? "Current Best Solution" : "Solution"}
        </h3>
        {result.cache_hit && (
          <span className="text-xs text-slate-500 ml-auto">cached</span>
        )}
      </div>

      {/* Status */}
      {!isSolving && (
        <div
          className={`px-3 py-2 rounded-md text-sm mb-4 ${
            isOptimal
              ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
              : "bg-yellow-500/20 border border-yellow-500/30 text-yellow-300"
          }`}
        >
          {isOptimal ? "Optimal solution found!" : `Status: ${result.status}`}
        </div>
      )}

      {/* Queue Position - shown when queued */}
      {queuePosition !== null && queuePosition !== undefined && (
        <div className="mb-4 bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex flex-col items-center justify-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              #{queuePosition}
            </div>
            <span className="text-sm text-slate-300">Position in queue</span>
            <p className="text-xs text-slate-500 mt-2">
              Your job will start when previous jobs complete
            </p>
          </div>
        </div>
      )}

      {/* Progress Bar - shown when progress is available */}
      {progress && (
        <div className="mb-4">
          {/* Phase and percentage */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">{progress.phase}</span>
              {progress.percentage !== null && progress.percentage > 0 && (
                <span className="text-xs text-emerald-400">
                  {Math.round(progress.percentage)}%
                </span>
              )}
            </div>
            {progress.percentage !== null && progress.percentage > 0 && (
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            )}
          </div>

          {/* Current activity */}
          {progress.current_activity && (
            <p className="text-xs text-slate-400 mb-3">
              {progress.current_activity}
            </p>
          )}

          {/* Stats grid - all in 1 row */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-slate-700/30 rounded-md p-2">
              <div className="flex items-center gap-1 mb-0.5">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span className="text-xs text-slate-400">Solutions</span>
              </div>
              <span className="text-base font-semibold text-slate-200">
                {progress.solutions_found}
              </span>
            </div>

            {progress.best_objective !== null && (
              <div className="bg-slate-700/30 rounded-md p-2">
                <div className="flex items-center gap-1 mb-0.5">
                  <Target className="w-3 h-3 text-blue-400" />
                  <span className="text-xs text-slate-400">Best Obj</span>
                </div>
                <span className="text-base font-semibold text-slate-200">
                  {progress.best_objective}
                </span>
              </div>
            )}

            {progress.best_bound !== null && (
              <div className="bg-slate-700/30 rounded-md p-2">
                <div className="flex items-center gap-1 mb-0.5">
                  <TrendingUp className="w-3 h-3 text-yellow-400" />
                  <span className="text-xs text-slate-400">Best Bound</span>
                </div>
                <span className="text-base font-semibold text-slate-200">
                  {progress.best_bound.toFixed(1)}
                </span>
              </div>
            )}

            {progress.elapsed_seconds !== null && (
              <div className="bg-slate-700/30 rounded-md p-2">
                <div className="flex items-center gap-1 mb-0.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-400">Elapsed</span>
                </div>
                <span className="text-base font-semibold text-slate-200">
                  {(() => {
                    const elapsedTime = Math.round(progress.elapsed_seconds);
                    const minutes = Math.floor(elapsedTime / 60);
                    const seconds = elapsedTime % 60;
                    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                  })()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full-width Grid Layout */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Grid Layout
          </h4>
          <button
            onClick={() => setShowMutations(!showMutations)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 hover:text-slate-200"
            title={showMutations ? "Hide mutation overlays" : "Show mutation overlays"}
          >
            {showMutations ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide Target Mutations</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Show Target Mutations</span>
              </>
            )}
          </button>
        </div>
        <div className="w-full overflow-x-auto">
          <div
            className="relative mx-auto"
            style={{
              width: gridWidth,
              height: gridHeight,
              minWidth: gridWidth,
            }}
          >
            {/* Background grid */}
            {Array.from({ length: GRID_SIZE }).map((_, rowIndex) =>
              Array.from({ length: GRID_SIZE }).map((_, colIndex) => {
                const key = `${rowIndex},${colIndex}`;
                const isOccupied = occupiedCells.has(key);
                if (isOccupied) return null;
                
                return (
                  <div
                    key={key}
                    style={{
                      position: "absolute",
                      top: rowIndex * (cellSize + gap),
                      left: colIndex * (cellSize + gap),
                      width: cellSize,
                      height: cellSize,
                    }}
                    className="bg-slate-700/30 rounded"
                  />
                );
              })
            )}

            {/* Merged crop cells */}
            {cropItems.map((item, index) => (
              <CropCell
                key={`${item.name}-${item.startRow}-${item.startCol}-${index}`}
                item={item}
                groundType={cropGrounds.get(item.name) || "farmland"}
                cellSize={cellSize}
                gap={gap}
              />
            ))}
            
            {/* Merged mutation cells overlay - rendered on top of crops */}
            {mutationItems.map((item, index) => (
              <MutationMergedCell
                key={`mutation-${item.name}-${item.startRow}-${item.startCol}-${index}`}
                item={item}
                groundType={mutationGrounds.get(item.name) || "farmland"}
                cellSize={cellSize}
                gap={gap}
                showImage={showMutations}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mutation Summary */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
          Mutations
        </h4>
        <div className="space-y-2">
          {/* Count occurrences of each mutation */}
          {(() => {
            const mutationMap = new Map<string, number>();
            (result.mutations || []).forEach((m) => {
              mutationMap.set(m.mutation, (mutationMap.get(m.mutation) || 0) + 1);
            });
            return Array.from(mutationMap.entries()).map(([mutationName, count]) => (
              <div
                key={mutationName}
                className="flex items-center justify-between bg-slate-700/30 rounded-md px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={getCropImagePath(mutationName)}
                    alt={mutationName}
                    className="w-5 h-5 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <span className="text-sm text-slate-200 capitalize">
                    {mutationName.replace(/_/g, " ")}
                  </span>
                </div>
                <span className="text-sm font-medium text-emerald-400">
                  x{count}
                </span>
              </div>
            ));
          })()}
          {(!result.mutations || result.mutations.length === 0) && (
            <div className="text-center py-2 text-xs text-slate-500">
              No mutations found
            </div>
          )}
        </div>
      </div>

      {/* Crop Placements */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
          Crop Placements
        </h4>
        <div className="flex flex-wrap gap-2">
          {/* Count occurrences of each crop */}
          {(() => {
            const placementMap = new Map<string, number>();
            (result.placements || []).forEach((p) => {
              placementMap.set(p.crop, (placementMap.get(p.crop) || 0) + 1);
            });
            return Array.from(placementMap.entries()).map(([cropName, count]) => (
              <div
                key={cropName}
                className="flex items-center gap-2 bg-slate-700/30 rounded-md px-2 py-1"
              >
                <img
                  src={getCropImagePath(cropName)}
                  alt={cropName}
                  className="w-5 h-5 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <span className="text-xs text-slate-300 capitalize">
                  {cropName.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-slate-500">x{count}</span>
              </div>
            ));
          })()}
          {(!result.placements || result.placements.length === 0) && (
            <div className="text-center py-2 text-xs text-slate-500">
              No crops placed
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
