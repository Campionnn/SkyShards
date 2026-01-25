import React, { useMemo, useState } from "react";
import { CheckCircle2, AlertCircle, Grid3X3, Leaf, ImageOff, Eye, EyeOff } from "lucide-react";
import { GRID_SIZE } from "../../constants";
import { useGreenhouseData } from "../../context";
import type { SolveResponse, CropPlacement } from "../../types/greenhouse";
import { getCropImagePath, getGroundImagePath } from "../../types/greenhouse";

interface SolverResultsProps {
  result: SolveResponse | null;
  error: string | null;
  isLoading: boolean;
}

interface MergedCrop {
  crop: string;
  size: number;
  startRow: number;
  startCol: number;
}

/**
 * Detect merged crops (2x2, 3x3) from placements.
 * Uses a greedy algorithm to find contiguous crop blocks.
 */
function detectMergedCrops(
  placements: CropPlacement[],
  cropSizes: Map<string, number>
): { mergedCrops: MergedCrop[]; occupiedCells: Set<string> } {
  const mergedCrops: MergedCrop[] = [];
  const occupiedCells = new Set<string>();

  // Filter out placements without cells (defensive check)
  const validPlacements = placements.filter(p => p.cells && Array.isArray(p.cells));

  // Build a map of cell -> crop for quick lookup
  const cellToCrop = new Map<string, string>();
  validPlacements.forEach((placement) => {
    placement.cells.forEach(([row, col]) => {
      cellToCrop.set(`${row},${col}`, placement.crop);
    });
  });

  // For each placement, try to find merged blocks
  validPlacements.forEach((placement) => {
    const cropSize = cropSizes.get(placement.crop) || 1;
    
    if (cropSize === 1) {
      // 1x1 crops are not merged
      placement.cells.forEach(([row, col]) => {
        const key = `${row},${col}`;
        if (!occupiedCells.has(key)) {
          mergedCrops.push({
            crop: placement.crop,
            size: 1,
            startRow: row,
            startCol: col,
          });
          occupiedCells.add(key);
        }
      });
    } else {
      // For 2x2 or 3x3 crops, find contiguous blocks
      const cellSet = new Set(placement.cells.map(([r, c]) => `${r},${c}`));
      const processed = new Set<string>();

      placement.cells.forEach(([row, col]) => {
        const key = `${row},${col}`;
        if (processed.has(key) || occupiedCells.has(key)) return;

        // Check if this cell is the top-left of a valid block
        let isValidBlock = true;
        for (let dr = 0; dr < cropSize && isValidBlock; dr++) {
          for (let dc = 0; dc < cropSize && isValidBlock; dc++) {
            const checkKey = `${row + dr},${col + dc}`;
            if (!cellSet.has(checkKey) || processed.has(checkKey) || occupiedCells.has(checkKey)) {
              isValidBlock = false;
            }
          }
        }

        if (isValidBlock) {
          // Mark all cells in this block as processed
          for (let dr = 0; dr < cropSize; dr++) {
            for (let dc = 0; dc < cropSize; dc++) {
              const blockKey = `${row + dr},${col + dc}`;
              processed.add(blockKey);
              occupiedCells.add(blockKey);
            }
          }
          
          mergedCrops.push({
            crop: placement.crop,
            size: cropSize,
            startRow: row,
            startCol: col,
          });
        } else {
          // Fallback: treat as 1x1
          processed.add(key);
          occupiedCells.add(key);
          mergedCrops.push({
            crop: placement.crop,
            size: 1,
            startRow: row,
            startCol: col,
          });
        }
      });
    }
  });

  return { mergedCrops, occupiedCells };
}

// Component for merged mutation cells (handles 1x1, 2x2, 3x3)
const MutationMergedCell: React.FC<{
  mutation: MergedCrop;
  groundType: string;
  cellSize: number;
  gap: number;
  showImage: boolean;
}> = ({ mutation, groundType, cellSize, gap, showImage }) => {
  const [imageError, setImageError] = useState(false);
  
  const totalWidth = mutation.size * cellSize + (mutation.size - 1) * gap;
  const totalHeight = mutation.size * cellSize + (mutation.size - 1) * gap;
  
  const imageScale = mutation.size === 1 ? 0.8 : 0.6;
  const imageWidth = totalWidth * imageScale;
  const imageHeight = totalHeight * imageScale;
  
  const style: React.CSSProperties = {
    position: "absolute",
    top: mutation.startRow * (cellSize + gap),
    left: mutation.startCol * (cellSize + gap),
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
      title={`${mutation.crop} (${mutation.startRow}, ${mutation.startCol})${mutation.size > 1 ? ` - ${mutation.size}x${mutation.size}` : ""}`}
      className="transition-transform hover:scale-105 hover:z-10"
    >
      {showImage && !imageError ? (
        <img
          src={getCropImagePath(mutation.crop)}
          alt={mutation.crop}
          style={{ width: imageWidth, height: imageHeight }}
          className="object-contain"
          onError={() => setImageError(true)}
          draggable={false}
        />
      ) : showImage && imageError ? (
        <div className="flex flex-col items-center justify-center text-purple-300/50">
          <Leaf className="w-5 h-5" />
          <span className="text-[7px] capitalize truncate max-w-full px-0.5">
            {mutation.crop.replace(/_/g, " ")}
          </span>
        </div>
      ) : null}
    </div>
  );
};

// Component for a single crop cell with image
const CropCell: React.FC<{
  crop: MergedCrop;
  groundType: string;
  cellSize: number;
  gap: number;
}> = ({ crop, groundType, cellSize, gap }) => {
  const [cropImageError, setCropImageError] = useState(false);
  
  const totalWidth = crop.size * cellSize + (crop.size - 1) * gap;
  const totalHeight = crop.size * cellSize + (crop.size - 1) * gap;
  
  // Scale: 90% for 1x1, 75% for 2x2 and 3x3
  const imageScale = crop.size === 1 ? 0.8 : 0.6;
  const imageWidth = totalWidth * imageScale;
  const imageHeight = totalHeight * imageScale;
  
  const style: React.CSSProperties = {
    position: "absolute",
    top: crop.startRow * (cellSize + gap),
    left: crop.startCol * (cellSize + gap),
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
      title={`${crop.crop} (${crop.startRow}, ${crop.startCol})${crop.size > 1 ? ` - ${crop.size}x${crop.size}` : ""}`}
      className="transition-transform hover:scale-105 hover:z-10"
    >
      {!cropImageError ? (
        <img
          src={getCropImagePath(crop.crop)}
          alt={crop.crop}
          style={{ width: imageWidth, height: imageHeight }}
          className="object-contain"
          onError={() => setCropImageError(true)}
          draggable={false}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-white/60">
          <ImageOff className="w-4 h-4" />
          <span className="text-[8px] mt-0.5 capitalize truncate max-w-full px-1">
            {crop.crop.replace(/_/g, " ")}
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
}) => {
  const { getCropDef, getMutationDef } = useGreenhouseData();
  const [showMutations, setShowMutations] = useState(true);

  // Build crop size map and ground type map
  // Check both crop definitions AND mutation definitions for ground type
  const { cropSizes, cropGrounds } = useMemo(() => {
    const sizes = new Map<string, number>();
    const grounds = new Map<string, string>();
    if (result) {
      (result.placements || []).forEach((p) => {
        const cropDef = getCropDef(p.crop);
        const mutationDef = getMutationDef(p.crop);
        
        // Size comes from either crop or mutation definition
        sizes.set(p.crop, cropDef?.size || mutationDef?.size || 1);
        
        // Ground type: prefer crop definition, fallback to mutation definition
        // This handles cases where mutations are used as requirements (e.g., magic_jellybean)
        grounds.set(p.crop, cropDef?.ground || mutationDef?.ground || "farmland");
      });
    }
    return { cropSizes: sizes, cropGrounds: grounds };
  }, [result, getCropDef, getMutationDef]);

  // Build mutation size map and ground type map
  // Check both mutation definitions AND crop definitions for ground type
  const { mutationSizes, mutationGrounds } = useMemo(() => {
    const sizes = new Map<string, number>();
    const grounds = new Map<string, string>();
    if (result) {
      (result.mutations || []).forEach((m) => {
        const mutationDef = getMutationDef(m.mutation);
        const cropDef = getCropDef(m.mutation);
        
        // Size comes from mutation definition
        sizes.set(m.mutation, mutationDef?.size || 1);
        
        // Ground type: prefer crop definition (for intermediate mutations), fallback to mutation definition
        grounds.set(m.mutation, cropDef?.ground || mutationDef?.ground || "farmland");
      });
    }
    return { mutationSizes: sizes, mutationGrounds: grounds };
  }, [result, getMutationDef, getCropDef]);

  // Detect merged crops
  const { mergedCrops, occupiedCells } = useMemo(() => {
    if (!result) return { mergedCrops: [], occupiedCells: new Set<string>() };
    return detectMergedCrops(result.placements, cropSizes);
  }, [result, cropSizes]);

  // Detect merged mutations (same logic as crops)
  const mergedMutations = useMemo(() => {
    if (!result || !result.mutations) return [];
    
    // Convert mutations to same format as placements for merge detection
    const mutationPlacements: CropPlacement[] = result.mutations.map(m => ({
      crop: m.mutation,
      cells: m.eligible_cells || [],
      count: m.count
    }));
    
    const { mergedCrops: merged } = detectMergedCrops(mutationPlacements, mutationSizes);
    return merged;
  }, [result, mutationSizes]);

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
        <div className="text-center py-8 text-slate-500 text-sm">
          Click "Solve" to find the optimal crop placement
        </div>
      </div>
    );
  }

  const isOptimal = result.status === "OPTIMAL";
  const isSolving = result.status === "SOLVING";

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
            {mergedCrops.map((crop, index) => (
              <CropCell
                key={`${crop.crop}-${crop.startRow}-${crop.startCol}-${index}`}
                crop={crop}
                groundType={cropGrounds.get(crop.crop) || "farmland"}
                cellSize={cellSize}
                gap={gap}
              />
            ))}
            
            {/* Merged mutation cells overlay - rendered on top of crops */}
            {mergedMutations.map((mutation, index) => (
              <MutationMergedCell
                key={`mutation-${mutation.crop}-${mutation.startRow}-${mutation.startCol}-${index}`}
                mutation={mutation}
                groundType={mutationGrounds.get(mutation.crop) || "farmland"}
                cellSize={cellSize}
                gap={gap}
                showImage={showMutations}
              />
            ))}
            
            {/* Pulsing overlay when still solving */}
            {isSolving && (
              <div
                className="absolute inset-0 bg-emerald-500/5 animate-pulse pointer-events-none rounded"
                style={{
                  animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mutation Summary */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
          Mutations
        </h4>
        <div className="space-y-2">
          {/* Deduplicate mutations by name and sum counts */}
          {(() => {
            const mutationMap = new Map<string, number>();
            (result.mutations || []).forEach((m) => {
              mutationMap.set(m.mutation, (mutationMap.get(m.mutation) || 0) + (m.count || 0));
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
          {/* Deduplicate placements by crop name and sum counts */}
          {(() => {
            const placementMap = new Map<string, number>();
            (result.placements || []).forEach((p) => {
              placementMap.set(p.crop, (placementMap.get(p.crop) || 0) + (p.count || 0));
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
