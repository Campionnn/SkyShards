import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { solveGreenhouseDirect } from "../../services/greenhouseService";
import { getGroundImagePath } from "../../types/greenhouse";
import { CropImage } from "../shared";
import type { SolveResponse, CropPlacement, MutationResult } from "../../types/greenhouse";
import type { CropDataJSON, MutationDataJSON } from "../../services/greenhouseDataService";

interface MutationRequirementGridProps {
  mutationId: string;
  // Map of crop/mutation IDs to their data for getting ground types
  cropDataMap?: Record<string, CropDataJSON | MutationDataJSON>;
}

// Generate all 10x10 cells
function generateFullGrid(): [number, number][] {
  const cells: [number, number][] = [];
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      cells.push([row, col]);
    }
  }
  return cells;
}

export const MutationRequirementGrid: React.FC<MutationRequirementGridProps> = ({
  mutationId,
  cropDataMap = {},
}) => {
  const [result, setResult] = useState<SolveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    
    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => resizeObserver.disconnect();
  }, []);

  // Fetch mutation layout from API
  useEffect(() => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchLayout = async () => {
      setLoading(true);
      setError(null);

      try {
        const cells = generateFullGrid();
        const targets = [{ mutation: mutationId, count: 1, maximize: false }];
        
        const response = await solveGreenhouseDirect(cells, targets, abortController.signal);
        
        if (!abortController.signal.aborted) {
          setResult(response);
          setLoading(false);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          setError(err instanceof Error ? err.message : "Failed to load layout");
          setLoading(false);
        }
      }
    };

    fetchLayout();

    return () => {
      abortController.abort();
    };
  }, [mutationId]);

  const getGroundType = (cropId: string): string => {
    const cropData = cropDataMap[cropId];
    if (cropData) {
      return cropData.ground;
    }
    return "farmland";
  };

  // Gap between cells
  const gap = 2;

  if (loading) {
    return (
      <div 
        ref={containerRef}
        className="w-full flex items-center justify-center py-8"
      >
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div 
        ref={containerRef}
        className="w-full text-center py-4 text-sm text-red-400"
      >
        {error || "Failed to load layout"}
      </div>
    );
  }

  // Find the target mutation
  const targetMutation = result.mutations.find(m => m.mutation === mutationId);
  
  // Build a map of positions to placements for quick lookup
  const placementMap = new Map<string, CropPlacement>();
  for (const placement of result.placements) {
    const key = `${placement.position[0]},${placement.position[1]}`;
    placementMap.set(key, placement);
  }

  const mutationMap = new Map<string, MutationResult>();
  for (const mutation of result.mutations) {
    const key = `${mutation.position[0]},${mutation.position[1]}`;
    mutationMap.set(key, mutation);
  }

  // Calculate minimum bounding box from all placements and mutations
  // Account for sizes of both crops and mutations
  let minRow = 10, maxRow = -1, minCol = 10, maxCol = -1;
  
  for (const placement of result.placements) {
    const [row, col] = placement.position;
    const size = placement.size || 1;
    minRow = Math.min(minRow, row);
    maxRow = Math.max(maxRow, row + size - 1);
    minCol = Math.min(minCol, col);
    maxCol = Math.max(maxCol, col + size - 1);
  }
  
  for (const mutation of result.mutations) {
    const [row, col] = mutation.position;
    const size = mutation.size || 1;
    minRow = Math.min(minRow, row);
    maxRow = Math.max(maxRow, row + size - 1);
    minCol = Math.min(minCol, col);
    maxCol = Math.max(maxCol, col + size - 1);
  }
  
  // Fallback if no results
  if (minRow > maxRow) {
    minRow = 0; maxRow = 0; minCol = 0; maxCol = 0;
  }
  
  let gridRows = maxRow - minRow + 1;
  let gridCols = maxCol - minCol + 1;

  // Ensure minimum 5x5 grid
  // Only center the target mutation if the original bounding box is 3x3 or smaller
  const MIN_GRID_SIZE = 5;
  const originalGridRows = gridRows;
  const originalGridCols = gridCols;

  if (gridRows < MIN_GRID_SIZE || gridCols < MIN_GRID_SIZE) {
    const targetRows = Math.max(gridRows, MIN_GRID_SIZE);
    const targetCols = Math.max(gridCols, MIN_GRID_SIZE);
    
    // Only center the mutation if original bounding box is 3x3 or smaller
    if (targetMutation && originalGridRows <= 3 && originalGridCols <= 3) {
      // Calculate the center of the target mutation
      const [mutRow, mutCol] = targetMutation.position;
      const mutSize = targetMutation.size || 1;
      const mutCenterRow = mutRow + (mutSize - 1) / 2;
      const mutCenterCol = mutCol + (mutSize - 1) / 2;
      
      // Calculate the desired grid center
      const gridCenterRow = (targetRows - 1) / 2;
      const gridCenterCol = (targetCols - 1) / 2;
      
      // Calculate how much we need to shift to center the mutation
      const shiftRow = gridCenterRow - mutCenterRow;
      const shiftCol = gridCenterCol - mutCenterCol;
      
      // Apply the shift to create a centered grid
      minRow = Math.floor(-shiftRow);
      maxRow = minRow + targetRows - 1;
      minCol = Math.floor(-shiftCol);
      maxCol = minCol + targetCols - 1;
      
      gridRows = targetRows;
      gridCols = targetCols;
    } else {
      // Fallback: center the bounding box if bounding box is larger than 3x3
      const paddingTop = Math.floor((targetRows - gridRows) / 2);
      const paddingLeft = Math.floor((targetCols - gridCols) / 2);
      
      minRow -= paddingTop;
      maxRow = minRow + targetRows - 1;
      minCol -= paddingLeft;
      maxCol = minCol + targetCols - 1;
      
      gridRows = targetRows;
      gridCols = targetCols;
    }
  }

  // Build set of cells occupied by multi-cell items (crops and mutations)
  // so we can skip rendering cells that are covered by a larger item
  const occupiedCells = new Set<string>();
  
  // Mark cells occupied by mutations
  for (const mutation of result.mutations) {
    const [mRow, mCol] = mutation.position;
    const size = mutation.size || 1;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Don't mark the top-left cell as occupied (that's where we render from)
        if (r !== 0 || c !== 0) {
          occupiedCells.add(`${mRow + r},${mCol + c}`);
        }
      }
    }
  }
  
  // Mark cells occupied by multi-cell crops
  for (const placement of result.placements) {
    const [pRow, pCol] = placement.position;
    const size = placement.size || 1;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Don't mark the top-left cell as occupied (that's where we render from)
        if (r !== 0 || c !== 0) {
          occupiedCells.add(`${pRow + r},${pCol + c}`);
        }
      }
    }
  }

  // Calculate cell size based on container width and bounding box dimensions
  const boundedCellSize = containerWidth > 0 
    ? Math.floor((containerWidth - (gridCols - 1) * gap) / gridCols) 
    : 28;
  const boundedGridWidth = gridCols * boundedCellSize + (gridCols - 1) * gap;
  const boundedGridHeight = gridRows * boundedCellSize + (gridRows - 1) * gap;

  return (
    <div ref={containerRef} className="w-full">
      <div
        className="relative mx-auto"
        style={{
          width: boundedGridWidth,
          height: boundedGridHeight,
        }}
      >
        {/* Render grid cells within bounding box */}
        {Array.from({ length: gridRows }).map((_, localRowIdx) =>
          Array.from({ length: gridCols }).map((_, localColIdx) => {
            // Convert local coords back to original grid coords
            const rowIdx = localRowIdx + minRow;
            const colIdx = localColIdx + minCol;
            const key = `${rowIdx},${colIdx}`;
            const placement = placementMap.get(key);
            const mutation = mutationMap.get(key);

            // Skip cells that are occupied by another item (part of multi-cell crop/mutation)
            if (occupiedCells.has(key)) {
              return null;
            }

            const cellTop = localRowIdx * (boundedCellSize + gap);
            const cellLeft = localColIdx * (boundedCellSize + gap);

            // Render mutation
            if (mutation) {
              const mutationWidth = mutation.size * boundedCellSize + (mutation.size - 1) * gap;
              const mutationHeight = mutation.size * boundedCellSize + (mutation.size - 1) * gap;
              const groundType = getGroundType(mutation.mutation);
              const imageSize = Math.min(mutationWidth - 8, mutationHeight - 8);

              return (
                <div
                  key={key}
                  className="absolute"
                  style={{
                    top: cellTop,
                    left: cellLeft,
                    width: mutationWidth,
                    height: mutationHeight,
                    backgroundImage: `url(${getGroundImagePath(groundType)})`,
                    backgroundSize: `${boundedCellSize}px ${boundedCellSize}px`,
                    backgroundPosition: "top left",
                    backgroundRepeat: "repeat",
                    borderRadius: 3,
                    boxShadow: "0 0 6px rgba(0, 200, 255, 0.8), inset 0 0 4px rgba(0, 200, 255, 0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                  }}
                >
                  <CropImage
                    cropId={mutation.mutation}
                    cropName={mutation.mutation}
                    width={imageSize}
                    height={imageSize}
                    showGround={false}
                    showFallback={false}
                  />
                </div>
              );
            }

            // Render crop placement
            if (placement) {
              const cropSize = placement.size || 1;
              const cropWidth = cropSize * boundedCellSize + (cropSize - 1) * gap;
              const cropHeight = cropSize * boundedCellSize + (cropSize - 1) * gap;
              const groundType = getGroundType(placement.crop);
              const imageSize = Math.min(cropWidth - 6, cropHeight - 6);

              return (
                <div
                  key={key}
                  className="absolute"
                  style={{
                    top: cellTop,
                    left: cellLeft,
                    width: cropWidth,
                    height: cropHeight,
                    backgroundImage: `url(${getGroundImagePath(groundType)})`,
                    backgroundSize: `${boundedCellSize}px ${boundedCellSize}px`,
                    backgroundPosition: "top left",
                    backgroundRepeat: "repeat",
                    borderRadius: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CropImage
                    cropId={placement.crop}
                    cropName={placement.crop}
                    width={imageSize}
                    height={imageSize}
                    showGround={false}
                    showFallback={false}
                  />
                </div>
              );
            }

            // Empty cell (shouldn't appear in bounding box, but just in case)
            return (
              <div
                key={key}
                className="absolute bg-slate-800/30 border border-slate-700/30"
                style={{
                  top: cellTop,
                  left: cellLeft,
                  width: boundedCellSize,
                  height: boundedCellSize,
                  borderRadius: 3,
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
