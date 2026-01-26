import React, { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { CheckCircle2, AlertCircle, Grid3X3, Leaf, ImageOff, Eye, EyeOff, Zap, Target, TrendingUp, Clock, RotateCcw, Trash2 } from "lucide-react";
import { GRID_SIZE } from "../../constants";
import { useGreenhouseData, useGridState, useLockedPlacements } from "../../context";
import { useToast } from "../ui/toastContext";
import type { SolveResponse, CropPlacement, MutationResult, JobProgress, SelectedCropForPlacement, LockedPlacement } from "../../types/greenhouse";
import { getCropImagePath, getGroundImagePath } from "../../types/greenhouse";

interface SolverResultsProps {
  result: SolveResponse | null;
  error: string | null;
  isLoading: boolean;
  progress?: JobProgress | null;
  queuePosition?: number | null;
  onClear?: () => void;
}

// Represents a crop/mutation placement on the grid
interface PlacementItem {
  id: string; // The crop/mutation ID (key)
  name: string; // Display name
  size: number;
  startRow: number;
  startCol: number;
  locked?: boolean; // Whether this placement was locked by the user
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
  placements: CropPlacement[],
  getCropDef: (id: string) => { name: string } | undefined,
  getMutationDef: (id: string) => { name: string } | undefined
): { items: PlacementItem[]; occupiedCells: Set<string> } {
  const items: PlacementItem[] = [];
  const occupiedCells = new Set<string>();

  for (const p of placements) {
    const cropDef = getCropDef(p.crop);
    const mutationDef = getMutationDef(p.crop);
    const displayName = cropDef?.name || mutationDef?.name || p.crop.replace(/_/g, " ");
    
    items.push({
      id: p.crop,
      name: displayName,
      size: p.size,
      startRow: p.position[0],
      startCol: p.position[1],
      locked: p.locked || false,
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
function processMutationsToItems(
  mutations: MutationResult[],
  getMutationDef: (id: string) => { name: string } | undefined
): PlacementItem[] {
  return mutations.map(m => {
    const mutationDef = getMutationDef(m.mutation);
    const displayName = mutationDef?.name || m.mutation.replace(/_/g, " ");
    
    return {
      id: m.mutation,
      name: displayName,
      size: m.size,
      startRow: m.position[0],
      startCol: m.position[1],
    };
  });
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
          src={getCropImagePath(item.id)}
          alt={item.name}
          style={{ width: imageWidth, height: imageHeight }}
          className="object-contain"
          onError={() => setImageError(true)}
          draggable={false}
        />
      ) : showImage && imageError ? (
        <div className="flex flex-col items-center justify-center text-purple-300/50">
          <Leaf className="w-5 h-5" />
          <span className="text-[7px] truncate max-w-full px-0.5">
            {item.name}
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
    // Add yellow glow for locked placements
    boxShadow: item.locked 
      ? "0 0 8px rgba(234, 179, 8, 0.8), inset 0 0 8px rgba(234, 179, 8, 0.4)" 
      : undefined,
  };

  return (
    <div
      style={style}
      title={`${item.name} (${item.startRow}, ${item.startCol})${item.size > 1 ? ` - ${item.size}x${item.size}` : ""}${item.locked ? " (Locked)" : ""}`}
      className="transition-transform hover:scale-105 hover:z-10"
    >
      {!cropImageError ? (
        <img
          src={getCropImagePath(item.id)}
          alt={item.name}
          style={{ width: imageWidth, height: imageHeight }}
          className="object-contain"
          onError={() => setCropImageError(true)}
          draggable={false}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-white/60">
          <ImageOff className="w-4 h-4" />
          <span className="text-[8px] mt-0.5 truncate max-w-full px-1">
            {item.name}
          </span>
        </div>
      )}
    </div>
  );
};

// Component for rendering a locked placement on the grid (for interactive placement)
const LockedPlacementCell: React.FC<{
  placement: LockedPlacement;
  groundType: string;
  cellSize: number;
  gap: number;
  isDragging: boolean;
  isHovered: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}> = ({ placement, groundType, cellSize, gap, isDragging, isHovered, onMouseDown, onMouseEnter, onMouseLeave }) => {
  const [imageError, setImageError] = useState(false);
  
  const totalWidth = placement.size * cellSize + (placement.size - 1) * gap;
  const totalHeight = placement.size * cellSize + (placement.size - 1) * gap;
  
  const imageScale = placement.size === 1 ? 0.8 : 0.6;
  const imageWidth = totalWidth * imageScale;
  const imageHeight = totalHeight * imageScale;
  
  const style: React.CSSProperties = {
    position: "absolute",
    top: placement.position[0] * (cellSize + gap),
    left: placement.position[1] * (cellSize + gap),
    width: totalWidth,
    height: totalHeight,
    backgroundImage: `url(${getGroundImagePath(groundType)})`,
    backgroundSize: `${cellSize}px ${cellSize}px`,
    backgroundPosition: "top left",
    backgroundRepeat: "repeat",
    boxShadow: isHovered 
      ? "0 0 8px rgba(239, 68, 68, 0.8), inset 0 0 8px rgba(239, 68, 68, 0.4)"
      : "0 0 8px rgba(234, 179, 8, 0.8), inset 0 0 8px rgba(234, 179, 8, 0.4)",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    zIndex: isDragging ? 20 : 10,
    cursor: isDragging ? "grabbing" : "grab",
    opacity: isDragging ? 0.8 : 1,
    transition: isDragging ? "none" : "transform 0.15s ease, box-shadow 0.15s ease",
  };

  return (
    <div
      style={style}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onContextMenu={(e) => e.preventDefault()}
      title={`${placement.crop} - Drag to move, right-click to remove`}
    >
      {!imageError ? (
        <img
          src={getCropImagePath(placement.crop)}
          alt={placement.crop}
          style={{ width: imageWidth, height: imageHeight }}
          className="object-contain pointer-events-none"
          onError={() => setImageError(true)}
          draggable={false}
        />
      ) : (
        <span className="text-yellow-300 text-xs font-medium">
          {placement.crop.slice(0, 4)}
        </span>
      )}
      
      {/* Trash icon on hover */}
      {isHovered && (
        <div className="absolute top-0.5 right-0.5 bg-red-500 rounded-bl-md p-0.5">
          <Trash2 className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  );
};

// Preview overlay for placing crops
const PlacementPreview: React.FC<{
  position: [number, number];
  crop: SelectedCropForPlacement;
  isValid: boolean;
  cellSize: number;
  gap: number;
}> = ({ position, crop, isValid, cellSize, gap }) => {
  const [imageError, setImageError] = useState(false);
  
  const totalWidth = crop.size * cellSize + (crop.size - 1) * gap;
  const totalHeight = crop.size * cellSize + (crop.size - 1) * gap;
  
  const imageScale = crop.size === 1 ? 0.8 : 0.6;
  const imageWidth = totalWidth * imageScale;
  const imageHeight = totalHeight * imageScale;
  
  const style: React.CSSProperties = {
    position: "absolute",
    top: position[0] * (cellSize + gap),
    left: position[1] * (cellSize + gap),
    width: totalWidth,
    height: totalHeight,
    backgroundImage: `url(${getGroundImagePath(crop.ground)})`,
    backgroundSize: `${cellSize}px ${cellSize}px`,
    backgroundPosition: "top left",
    backgroundRepeat: "repeat",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    zIndex: 15,
    opacity: 0.7,
    border: isValid ? "2px solid #22c55e" : "2px solid #ef4444",
    boxShadow: isValid 
      ? "0 0 12px rgba(34, 197, 94, 0.5)" 
      : "0 0 12px rgba(239, 68, 68, 0.5)",
    pointerEvents: "none",
  };

  return (
    <div style={style}>
      {!imageError ? (
        <img
          src={getCropImagePath(crop.id)}
          alt={crop.name}
          style={{ width: imageWidth, height: imageHeight }}
          className="object-contain"
          onError={() => setImageError(true)}
          draggable={false}
        />
      ) : (
        <span className="text-white text-xs font-medium">
          {crop.name.slice(0, 4)}
        </span>
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
  onClear,
}) => {
  const { getCropDef, getMutationDef } = useGreenhouseData();
  const { unlockedCells } = useGridState();
  const {
    lockedPlacements,
    selectedCropForPlacement,
    addLockedPlacement,
    removeLockedPlacement,
    moveLockedPlacement,
    getLockedPlacementAt,
    isValidPlacement,
    isValidPlacementPosition,
    isPlacementMode,
  } = useLockedPlacements();
  const { toast } = useToast();
  
  const [showMutations, setShowMutations] = useState(true);
  
  // Interactive grid state
  const gridRef = useRef<HTMLDivElement>(null);
  const [hoveredPlacementId, setHoveredPlacementId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    placementId: string;
    startPosition: [number, number];
    currentPosition: [number, number];
  } | null>(null);
  
  // Drag-painting state for placing/removing multiple crops
  // Use refs for tracking to avoid stale closure issues during fast mouse movement
  const [paintState, setPaintState] = useState<{
    mode: "place" | "remove";
  } | null>(null);
  const paintDataRef = useRef<{
    lastCell: [number, number] | null;
    lastPlacedPosition: [number, number] | null;
    lastPlacedSize: number;
  }>({ lastCell: null, lastPlacedPosition: null, lastPlacedSize: 1 });
  
  // Track cursor position with offset for preview
  const [hoverInfo, setHoverInfo] = useState<{
    cell: [number, number];
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // Calculate grid dimensions
  const cellSize = 48; // Base cell size in pixels
  const gap = 2; // Gap between cells
  const gridWidth = GRID_SIZE * cellSize + (GRID_SIZE - 1) * gap;
  const gridHeight = GRID_SIZE * cellSize + (GRID_SIZE - 1) * gap;
  
  // Convert mouse position to grid cell with sub-cell position (0-1 within cell)
  const getGridCellWithOffset = useCallback((clientX: number, clientY: number): { cell: [number, number]; offsetX: number; offsetY: number } | null => {
    if (!gridRef.current) return null;
    
    const rect = gridRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const cellUnit = cellSize + gap;
    const col = Math.floor(x / cellUnit);
    const row = Math.floor(y / cellUnit);
    
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
      return null;
    }
    
    // Calculate offset within cell (0-1)
    const offsetX = (x - col * cellUnit) / cellSize;
    const offsetY = (y - row * cellUnit) / cellSize;
    
    return { cell: [row, col], offsetX: Math.min(1, Math.max(0, offsetX)), offsetY: Math.min(1, Math.max(0, offsetY)) };
  }, [cellSize, gap]);
  
  // Calculate placement position based on cursor position within cell
  // For 2x2: quadrant determines which corner the current cell becomes
  // For 3x3: center under cursor
  // For 1x1: just the cell
  const getPlacementPosition = useCallback((
    cursorCell: [number, number],
    offsetX: number,
    offsetY: number,
    size: number
  ): [number, number] => {
    if (size === 1) return cursorCell;
    
    let row: number, col: number;
    
    if (size === 2) {
      // For 2x2: quadrant-based placement
      if (offsetY < 0.5) {
        row = cursorCell[0] - 1;
      } else {
        row = cursorCell[0];
      }
      
      if (offsetX < 0.5) {
        col = cursorCell[1] - 1;
      } else {
        col = cursorCell[1];
      }
    } else {
      // For 3x3+: center under cursor
      const offset = Math.floor(size / 2);
      row = cursorCell[0] - offset;
      col = cursorCell[1] - offset;
    }
    
    // Clamp to valid grid bounds
    row = Math.max(0, Math.min(GRID_SIZE - size, row));
    col = Math.max(0, Math.min(GRID_SIZE - size, col));
    
    return [row, col];
  }, []);
  
  // Find nearest valid position for a placement (snaps to unlocked cells)
  const findNearestValidPosition = useCallback((
    targetPos: [number, number],
    size: number
  ): [number, number] | null => {
    // Check if target position is valid
    const validation = isValidPlacementPosition(targetPos, size);
    if (validation.valid) return targetPos;
    
    // Search in expanding squares for a valid position
    for (let radius = 1; radius <= Math.max(GRID_SIZE, GRID_SIZE); radius++) {
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue;
          
          const testRow = targetPos[0] + dr;
          const testCol = targetPos[1] + dc;
          
          if (testRow < 0 || testCol < 0 || testRow + size > GRID_SIZE || testCol + size > GRID_SIZE) continue;
          
          const testValidation = isValidPlacementPosition([testRow, testCol], size);
          if (testValidation.valid) {
            return [testRow, testCol];
          }
        }
      }
    }
    
    return null;
  }, [isValidPlacementPosition]);
  
  // Get the adjusted position for placement (position calculation + snap to valid)
  const getAdjustedPosition = useCallback((
    cursorCell: [number, number],
    offsetX: number,
    offsetY: number,
    size: number
  ): [number, number] | null => {
    const basePos = getPlacementPosition(cursorCell, offsetX, offsetY, size);
    return findNearestValidPosition(basePos, size);
  }, [getPlacementPosition, findNearestValidPosition]);
  
  // Place a crop at the given position with offset info
  const placeCropAtPosition = useCallback((
    cursorCell: [number, number],
    offsetX: number,
    offsetY: number
  ): [number, number] | null => {
    if (!selectedCropForPlacement) return null;
    
    const adjustedPos = getAdjustedPosition(cursorCell, offsetX, offsetY, selectedCropForPlacement.size);
    if (!adjustedPos) return null;
    
    const result = addLockedPlacement({
      crop: selectedCropForPlacement.id,
      position: adjustedPos,
      size: selectedCropForPlacement.size,
      ground: selectedCropForPlacement.ground,
    });
    
    if (!result.success) {
      toast({
        title: "Cannot place here",
        description: result.error,
        variant: "error",
        duration: 2000,
      });
      return null;
    }
    
    return adjustedPos;
  }, [selectedCropForPlacement, getAdjustedPosition, addLockedPlacement, toast]);
  
  // Remove any placement at the given cell
  const removeAtCell = useCallback((cell: [number, number]) => {
    const placement = getLockedPlacementAt(cell[0], cell[1]);
    if (placement) {
      removeLockedPlacement(placement.id);
    }
  }, [getLockedPlacementAt, removeLockedPlacement]);
  
  // Check if a new placement would overlap with the last placed position
  const wouldOverlapLastPlacement = useCallback((
    newPos: [number, number],
    size: number,
    lastPlaced: [number, number] | null,
    lastSize: number
  ): boolean => {
    if (!lastPlaced) return false;
    
    const newEndRow = newPos[0] + size;
    const newEndCol = newPos[1] + size;
    const lastEndRow = lastPlaced[0] + lastSize;
    const lastEndCol = lastPlaced[1] + lastSize;
    
    return !(newPos[0] >= lastEndRow || newEndRow <= lastPlaced[0] ||
             newPos[1] >= lastEndCol || newEndCol <= lastPlaced[1]);
  }, []);
  
  // Core painting logic - extracted to avoid duplication between React and document events
  const handlePaintAtCell = useCallback((
    cell: [number, number],
    offsetX: number,
    offsetY: number,
    mode: "place" | "remove"
  ) => {
    const { lastCell, lastPlacedPosition, lastPlacedSize } = paintDataRef.current;
    
    // Only act if we moved to a new cell
    if (lastCell && lastCell[0] === cell[0] && lastCell[1] === cell[1]) {
      return;
    }
    
    if (mode === "place" && selectedCropForPlacement) {
      const adjustedPos = getAdjustedPosition(cell, offsetX, offsetY, selectedCropForPlacement.size);
      
      if (adjustedPos && !wouldOverlapLastPlacement(adjustedPos, selectedCropForPlacement.size, lastPlacedPosition, lastPlacedSize)) {
        const placedPos = placeCropAtPosition(cell, offsetX, offsetY);
        if (placedPos) {
          paintDataRef.current = { lastCell: cell, lastPlacedPosition: placedPos, lastPlacedSize: selectedCropForPlacement.size };
        } else {
          paintDataRef.current = { ...paintDataRef.current, lastCell: cell };
        }
      } else {
        paintDataRef.current = { ...paintDataRef.current, lastCell: cell };
      }
    } else if (mode === "remove") {
      removeAtCell(cell);
      paintDataRef.current = { ...paintDataRef.current, lastCell: cell };
    }
  }, [selectedCropForPlacement, getAdjustedPosition, wouldOverlapLastPlacement, placeCropAtPosition, removeAtCell]);
  
  // Handle mouse move for preview, dragging, and painting
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const cellInfo = getGridCellWithOffset(e.clientX, e.clientY);
    
    if (dragState) {
      if (cellInfo) {
        // Get the placement being dragged to determine its size
        const placement = lockedPlacements.find(p => p.id === dragState.placementId);
        if (placement) {
          // Use the same positioning logic as placement for consistency
          const adjustedPos = getAdjustedPosition(cellInfo.cell, cellInfo.offsetX, cellInfo.offsetY, placement.size);
          if (adjustedPos) {
            setDragState(prev => prev ? { ...prev, currentPosition: adjustedPos } : null);
          }
        } else {
          // Fallback to cell position if placement not found
          setDragState(prev => prev ? { ...prev, currentPosition: cellInfo.cell } : null);
        }
      }
    } else if (paintState) {
      if (cellInfo) {
        handlePaintAtCell(cellInfo.cell, cellInfo.offsetX, cellInfo.offsetY, paintState.mode);
      }
    } else if (isPlacementMode) {
      setHoverInfo(cellInfo);
    }
  }, [getGridCellWithOffset, dragState, paintState, isPlacementMode, handlePaintAtCell, lockedPlacements, getAdjustedPosition]);
  
  // Handle mouse leave - don't clear state during paint mode
  const handleMouseLeave = useCallback(() => {
    if (!dragState && !paintState) {
      setHoverInfo(null);
    }
  }, [dragState, paintState]);
  
  // Handle mouse down to start placing or removing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (dragState) return;
    
    const cellInfo = getGridCellWithOffset(e.clientX, e.clientY);
    if (!cellInfo) return;
    
    const { cell, offsetX, offsetY } = cellInfo;
    
    // Left click in placement mode - start drag-placing
    if (e.button === 0 && isPlacementMode && selectedCropForPlacement) {
      e.preventDefault();
      const placedPos = placeCropAtPosition(cell, offsetX, offsetY);
      paintDataRef.current = { lastCell: cell, lastPlacedPosition: placedPos, lastPlacedSize: selectedCropForPlacement.size };
      setPaintState({ mode: "place" });
      setHoverInfo(null); // Hide preview during painting
    }
    // Right click - start drag-removing
    else if (e.button === 2) {
      e.preventDefault();
      removeAtCell(cell);
      setHoveredPlacementId(null); // Clear hover state when starting drag-remove
      paintDataRef.current = { lastCell: cell, lastPlacedPosition: null, lastPlacedSize: 1 };
      setPaintState({ mode: "remove" });
      setHoverInfo(null); // Hide preview during painting
    }
  }, [getGridCellWithOffset, dragState, isPlacementMode, selectedCropForPlacement, placeCropAtPosition, removeAtCell]);
  
  // Handle context menu (prevent default)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);
  
  // Handle mouse down on placement (start drag move)
  const handlePlacementMouseDown = useCallback((placementId: string, e: React.MouseEvent) => {
    // Right-click removes
    if (e.button === 2) {
      e.preventDefault();
      e.stopPropagation();
      removeLockedPlacement(placementId);
      setHoveredPlacementId(null); // Clear hover state when removing
      setHoverInfo(null); // Hide preview
      paintDataRef.current = { lastCell: null, lastPlacedPosition: null, lastPlacedSize: 1 };
      setPaintState({ mode: "remove" });
      return;
    }
    
    // Left-click starts drag move (only if not in placement mode)
    if (e.button === 0 && !isPlacementMode) {
      e.preventDefault();
      e.stopPropagation();
      
      const placement = lockedPlacements.find(p => p.id === placementId);
      if (placement) {
        setDragState({
          placementId,
          startPosition: placement.position,
          currentPosition: placement.position,
        });
      }
    }
  }, [lockedPlacements, removeLockedPlacement, isPlacementMode]);
  
  // Handle mouse up (end drag or paint)
  const handleMouseUp = useCallback(() => {
    if (dragState) {
      const { placementId, startPosition, currentPosition } = dragState;
      
      // Only move if position changed
      if (startPosition[0] !== currentPosition[0] || startPosition[1] !== currentPosition[1]) {
        const moveResult = moveLockedPlacement(placementId, currentPosition);
        
        if (!moveResult.success) {
          toast({
            title: "Cannot move here",
            description: moveResult.error,
            variant: "error",
            duration: 2000,
          });
        }
      }
      
      setDragState(null);
    }
    
    if (paintState) {
      setPaintState(null);
      setHoveredPlacementId(null); // Clear hover state when ending paint
      paintDataRef.current = { lastCell: null, lastPlacedPosition: null, lastPlacedSize: 1 };
    }
  }, [dragState, paintState, moveLockedPlacement, toast]);
  
  // Get clamped cell with offset for document events
  const getGridCellClampedWithOffset = useCallback((clientX: number, clientY: number): { cell: [number, number]; offsetX: number; offsetY: number } | null => {
    if (!gridRef.current) return null;
    
    const rect = gridRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const cellUnit = cellSize + gap;
    const col = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(x / cellUnit)));
    const row = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(y / cellUnit)));
    
    const offsetX = Math.min(1, Math.max(0, (x - col * cellUnit) / cellSize));
    const offsetY = Math.min(1, Math.max(0, (y - row * cellUnit) / cellSize));
    
    return { cell: [row, col], offsetX, offsetY };
  }, [cellSize, gap]);
  
  // Document-level event handlers for drag-painting outside grid
  useEffect(() => {
    if (!paintState && !dragState) return;
    
    const handleDocumentMouseMove = (e: MouseEvent) => {
      const cellInfo = getGridCellClampedWithOffset(e.clientX, e.clientY);
      if (!cellInfo) return;
      
      if (dragState) {
        // Get the placement being dragged to determine its size
        const placement = lockedPlacements.find(p => p.id === dragState.placementId);
        if (placement) {
          // Use the same positioning logic as placement for consistency
          const adjustedPos = getAdjustedPosition(cellInfo.cell, cellInfo.offsetX, cellInfo.offsetY, placement.size);
          if (adjustedPos) {
            setDragState(prev => prev ? { ...prev, currentPosition: adjustedPos } : null);
          }
        } else {
          // Fallback to cell position if placement not found
          setDragState(prev => prev ? { ...prev, currentPosition: cellInfo.cell } : null);
        }
      } else if (paintState) {
        handlePaintAtCell(cellInfo.cell, cellInfo.offsetX, cellInfo.offsetY, paintState.mode);
      }
    };
    
    const handleDocumentMouseUp = () => handleMouseUp();
    
    document.addEventListener("mousemove", handleDocumentMouseMove);
    document.addEventListener("mouseup", handleDocumentMouseUp);
    
    return () => {
      document.removeEventListener("mousemove", handleDocumentMouseMove);
      document.removeEventListener("mouseup", handleDocumentMouseUp);
    };
  }, [paintState, dragState, lockedPlacements, getGridCellClampedWithOffset, getAdjustedPosition, handlePaintAtCell, handleMouseUp]);
  
  // Calculate preview position using hoverInfo with offsets
  const previewPosition = hoverInfo && selectedCropForPlacement
    ? getAdjustedPosition(hoverInfo.cell, hoverInfo.offsetX, hoverInfo.offsetY, selectedCropForPlacement.size)
    : null;
  
  // Check if preview placement is valid
  const previewValidation = previewPosition && selectedCropForPlacement
    ? isValidPlacement(previewPosition, selectedCropForPlacement.size)
    : null;
  
  // Get drag preview validation
  const dragValidation = dragState
    ? (() => {
        const placement = lockedPlacements.find(p => p.id === dragState.placementId);
        if (!placement) return null;
        return isValidPlacement(dragState.currentPosition, placement.size, dragState.placementId);
      })()
    : null;
  
  // Build ground type map for locked placements
  const lockedGrounds = useMemo(() => {
    const grounds = new Map<string, string>();
    lockedPlacements.forEach((p) => {
      const cropDef = getCropDef(p.crop);
      const mutationDef = getMutationDef(p.crop);
      grounds.set(p.id, cropDef?.ground || mutationDef?.ground || p.ground || "farmland");
    });
    return grounds;
  }, [lockedPlacements, getCropDef, getMutationDef]);

  // Build ground type map for crops from solver result
  const cropGrounds = useMemo(() => {
    const grounds = new Map<string, string>();
    if (result) {
      (result.placements || []).forEach((p) => {
        const cropDef = getCropDef(p.crop);
        const mutationDef = getMutationDef(p.crop);
        grounds.set(p.crop, cropDef?.ground || mutationDef?.ground || "farmland");
      });
    }
    return grounds;
  }, [result, getCropDef, getMutationDef]);

  // Build ground type map for mutations from solver result
  const mutationGrounds = useMemo(() => {
    const grounds = new Map<string, string>();
    if (result) {
      (result.mutations || []).forEach((m) => {
        const mutationDef = getMutationDef(m.mutation);
        const cropDef = getCropDef(m.mutation);
        grounds.set(m.mutation, cropDef?.ground || mutationDef?.ground || "farmland");
      });
    }
    return grounds;
  }, [result, getMutationDef, getCropDef]);

  // Process placements into PlacementItems for rendering
  const { items: cropItems, occupiedCells } = useMemo(() => {
    if (!result) return { items: [], occupiedCells: new Set<string>() };
    return processPlacementsToItems(result.placements || [], getCropDef, getMutationDef);
  }, [result, getCropDef, getMutationDef]);

  // Process mutations into PlacementItems for rendering
  const mutationItems = useMemo(() => {
    if (!result || !result.mutations) return [];
    return processMutationsToItems(result.mutations, getMutationDef);
  }, [result, getMutationDef]);

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

        {/* Queue Position - small banner at top */}
        {queuePosition !== null && queuePosition !== undefined && (
          <div className="mb-4 bg-blue-500/20 border border-blue-500/30 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-slate-300">Position in queue:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-blue-400">#{queuePosition}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Empty grid visualization - Interactive for placing locked crops */}
        <div className="mb-4">
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
            Grid Layout
          </h4>
          <div className="w-full overflow-x-auto">
            <div
              ref={gridRef}
              className="relative mx-auto select-none"
              style={{
                width: gridWidth,
                height: gridHeight,
                minWidth: gridWidth,
                cursor: isPlacementMode ? "crosshair" : "default",
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onMouseDown={handleMouseDown}
              onContextMenu={handleContextMenu}
              onMouseUp={handleMouseUp}
            >
              {/* Background grid */}
              {Array.from({ length: GRID_SIZE }).map((_, rowIndex) =>
                Array.from({ length: GRID_SIZE }).map((_, colIndex) => {
                  const key = `${rowIndex},${colIndex}`;
                  const isUnlocked = unlockedCells.has(key);
                  
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
                      className={`rounded ${
                        isUnlocked
                          ? "bg-emerald-600/40 border border-emerald-500/30"
                          : "bg-slate-700/30 border border-slate-600/20"
                      }`}
                    />
                  );
                })
              )}
              
              {/* Locked placements */}
              {lockedPlacements.map((placement) => {
                const isDragging = dragState?.placementId === placement.id;
                const isHovered = hoveredPlacementId === placement.id && !isDragging && !isPlacementMode;
                const displayPlacement = isDragging
                  ? { ...placement, position: dragState.currentPosition }
                  : placement;
                
                return (
                  <LockedPlacementCell
                    key={placement.id}
                    placement={displayPlacement}
                    groundType={lockedGrounds.get(placement.id) || "farmland"}
                    cellSize={cellSize}
                    gap={gap}
                    isDragging={isDragging}
                    isHovered={isHovered}
                    onMouseDown={(e) => handlePlacementMouseDown(placement.id, e)}
                    onMouseEnter={() => setHoveredPlacementId(placement.id)}
                    onMouseLeave={() => setHoveredPlacementId(null)}
                  />
                );
              })}
              
              {/* Drag preview validation overlay */}
              {dragState && dragValidation && (
                <div
                  style={{
                    position: "absolute",
                    top: dragState.currentPosition[0] * (cellSize + gap),
                    left: dragState.currentPosition[1] * (cellSize + gap),
                    width: (() => {
                      const placement = lockedPlacements.find(p => p.id === dragState.placementId);
                      return placement ? placement.size * cellSize + (placement.size - 1) * gap : cellSize;
                    })(),
                    height: (() => {
                      const placement = lockedPlacements.find(p => p.id === dragState.placementId);
                      return placement ? placement.size * cellSize + (placement.size - 1) * gap : cellSize;
                    })(),
                    border: dragValidation.valid ? "2px dashed #22c55e" : "2px dashed #ef4444",
                    borderRadius: 4,
                    pointerEvents: "none",
                    zIndex: 25,
                  }}
                />
              )}
              
              {/* Placement preview */}
              {previewPosition && selectedCropForPlacement && !dragState && (
                <PlacementPreview
                  position={previewPosition}
                  crop={selectedCropForPlacement}
                  isValid={previewValidation?.valid ?? false}
                  cellSize={cellSize}
                  gap={gap}
                />
              )}
            </div>
          </div>
        </div>
        
        <div className="text-center py-4 text-slate-500 text-sm">
          {hoveredPlacementId && isPlacementMode ? (
              <span><span className="font-semibold text-emerald-400">Click to place crops</span>, <span className="font-semibold text-red-400">right-click to remove</span><br></br>press escape to stop placement</span>
          ) : hoveredPlacementId && !isPlacementMode ? (
            <span>Drag to move, <span className="font-semibold text-red-400">right-click to remove</span></span>
          ) : isPlacementMode && hoverInfo ? (
            <span><span className="font-semibold text-emerald-400">Click to place crops</span>, right-click to remove<br></br>press escape to stop placement</span>
          ) : isPlacementMode ? (
            "Click to place crops, right-click to remove\npress escape to stop placement"
          ) : (
            "Configure your targets and click \"Solve\" to find the optimal crop placement"
          )}
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
        <div className="flex items-center gap-2 ml-auto">
          {onClear && (
              <button
                  onClick={onClear}
                  className="px-2 py-1 text-xs bg-slate-600/50 hover:bg-slate-600/70 rounded text-slate-300 transition-colors flex items-center gap-1"
                  title="Clear results"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </button>
          )}
          {result.cache_hit && (
            <span className="text-xs text-slate-500">cached</span>
          )}
        </div>
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
            ref={gridRef}
            className="relative mx-auto select-none"
            style={{
              width: gridWidth,
              height: gridHeight,
              minWidth: gridWidth,
              cursor: isPlacementMode ? "crosshair" : "default",
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onContextMenu={handleContextMenu}
            onMouseUp={handleMouseUp}
          >
            {/* Background grid */}
            {Array.from({ length: GRID_SIZE }).map((_, rowIndex) =>
              Array.from({ length: GRID_SIZE }).map((_, colIndex) => {
                const key = `${rowIndex},${colIndex}`;
                const isOccupied = occupiedCells.has(key);
                const isUnlocked = unlockedCells.has(key);
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
                    className={`rounded ${
                      isUnlocked
                        ? "bg-emerald-600/40 border border-emerald-500/30"
                        : "bg-slate-700/30 border border-slate-600/20"
                    }`}
                  />
                );
              })
            )}

            {/* Merged crop cells */}
            {cropItems.map((item, index) => (
              <CropCell
                key={`${item.id}-${item.startRow}-${item.startCol}-${index}`}
                item={item}
                groundType={cropGrounds.get(item.id) || "farmland"}
                cellSize={cellSize}
                gap={gap}
              />
            ))}
            
            {/* Merged mutation cells overlay - rendered on top of crops */}
            {mutationItems.map((item, index) => (
              <MutationMergedCell
                key={`mutation-${item.id}-${item.startRow}-${item.startCol}-${index}`}
                item={item}
                groundType={mutationGrounds.get(item.id) || "farmland"}
                cellSize={cellSize}
                gap={gap}
                showImage={showMutations}
              />
            ))}
            
            {/* Locked placements (not from solver result) */}
            {lockedPlacements.map((placement) => {
              const isDragging = dragState?.placementId === placement.id;
              const isHovered = hoveredPlacementId === placement.id && !isDragging && !isPlacementMode;
              const displayPlacement = isDragging
                ? { ...placement, position: dragState.currentPosition }
                : placement;
              
              return (
                <LockedPlacementCell
                  key={placement.id}
                  placement={displayPlacement}
                  groundType={lockedGrounds.get(placement.id) || "farmland"}
                  cellSize={cellSize}
                  gap={gap}
                  isDragging={isDragging}
                  isHovered={isHovered}
                  onMouseDown={(e) => handlePlacementMouseDown(placement.id, e)}
                  onMouseEnter={() => setHoveredPlacementId(placement.id)}
                  onMouseLeave={() => setHoveredPlacementId(null)}
                />
              );
            })}
            
            {/* Drag preview validation overlay */}
            {dragState && dragValidation && (
              <div
                style={{
                  position: "absolute",
                  top: dragState.currentPosition[0] * (cellSize + gap),
                  left: dragState.currentPosition[1] * (cellSize + gap),
                  width: (() => {
                    const placement = lockedPlacements.find(p => p.id === dragState.placementId);
                    return placement ? placement.size * cellSize + (placement.size - 1) * gap : cellSize;
                  })(),
                  height: (() => {
                    const placement = lockedPlacements.find(p => p.id === dragState.placementId);
                    return placement ? placement.size * cellSize + (placement.size - 1) * gap : cellSize;
                  })(),
                  border: dragValidation.valid ? "2px dashed #22c55e" : "2px dashed #ef4444",
                  borderRadius: 4,
                  pointerEvents: "none",
                  zIndex: 25,
                }}
              />
            )}
            
            {/* Placement preview */}
            {previewPosition && selectedCropForPlacement && !dragState && (
              <PlacementPreview
                position={previewPosition}
                crop={selectedCropForPlacement}
                isValid={previewValidation?.valid ?? false}
                cellSize={cellSize}
                gap={gap}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Status message */}
      <div className="text-center py-2 text-slate-500 text-sm">
        {hoveredPlacementId && isPlacementMode ? (
          <span><span className="font-semibold text-emerald-400">Click to place crops</span>, <span className="font-semibold text-red-400">right-click to remove</span></span>
        ) : hoveredPlacementId && !isPlacementMode ? (
          <span>Drag to move, <span className="font-semibold text-red-400">right-click to remove</span></span>
        ) : isPlacementMode && hoverInfo ? (
          <span><span className="font-semibold text-emerald-400">Click to place crops</span>, right-click to remove</span>
        ) : isPlacementMode ? (
          "Click to place crops, right-click to remove"
        ) : (
          "Drag locked placements to move, right-click to remove"
        )}
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
            return Array.from(mutationMap.entries()).map(([mutationId, count]) => {
              const mutationDef = getMutationDef(mutationId);
              const displayName = mutationDef?.name || mutationId.replace(/_/g, " ");
              
              return (
                <div
                  key={mutationId}
                  className="flex items-center justify-between bg-slate-700/30 rounded-md px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={getCropImagePath(mutationId)}
                      alt={displayName}
                      className="w-5 h-5 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <span className="text-sm text-slate-200">
                      {displayName}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-emerald-400">
                    x{count}
                  </span>
                </div>
              );
            });
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
            return Array.from(placementMap.entries()).map(([cropId, count]) => {
              const cropDef = getCropDef(cropId);
              const mutationDef = getMutationDef(cropId);
              const displayName = cropDef?.name || mutationDef?.name || cropId.replace(/_/g, " ");
              
              return (
                <div
                  key={cropId}
                  className="flex items-center gap-2 bg-slate-700/30 rounded-md px-2 py-1"
                >
                  <img
                    src={getCropImagePath(cropId)}
                    alt={displayName}
                    className="w-5 h-5 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <span className="text-xs text-slate-300">
                    {displayName}
                  </span>
                  <span className="text-xs text-slate-500">x{count}</span>
                </div>
              );
            });
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
