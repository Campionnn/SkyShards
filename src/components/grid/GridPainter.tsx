import React, { useState, useRef, useCallback, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { GRID_SIZE } from "../../constants";
import { useGridState, useLockedPlacements } from "../../context";
import { useToast } from "../ui/toastContext";
import type { LockedPlacement, SelectedCropForPlacement } from "../../types/greenhouse";
import { getCropImagePath, getGroundImagePath } from "../../types/greenhouse";

interface GridPainterProps {
  className?: string;
  cellSize?: number;
  gap?: number;
}

// Component for rendering a locked placement on the grid
const LockedPlacementCell: React.FC<{
  placement: LockedPlacement;
  cellSize: number;
  gap: number;
  isSelected: boolean;
  isDragging: boolean;
  isHovered: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}> = ({ placement, cellSize, gap, isSelected, isDragging, isHovered, onMouseDown, onMouseEnter, onMouseLeave }) => {
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
    backgroundImage: `url(${getGroundImagePath(placement.ground)})`,
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
    transform: isSelected ? "scale(1.02)" : "scale(1)",
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
      {/* Crop image */}
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

export const GridPainter: React.FC<GridPainterProps> = ({
  className = "",
  cellSize = 48,
  gap = 2,
}) => {
  const { unlockedCells } = useGridState();
  const {
    lockedPlacements,
    selectedCropForPlacement,
    addLockedPlacement,
    removeLockedPlacement,
    moveLockedPlacement,
    getLockedPlacementAt,
    isValidPlacementPosition,
    isValidPlacement,
    isPlacementMode,
  } = useLockedPlacements();
  const { toast } = useToast();
  
  const gridRef = useRef<HTMLDivElement>(null);
  const [hoveredPlacementId, setHoveredPlacementId] = useState<string | null>(null);
  
  // Drag state for moving existing placements
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
      // If cursor is in top-left of cell, cell becomes bottom-right of 2x2
      // If cursor is in bottom-right of cell, cell becomes top-left of 2x2
      if (offsetY < 0.5) {
        // Top half - cell becomes bottom row of 2x2
        row = cursorCell[0] - 1;
      } else {
        // Bottom half - cell becomes top row of 2x2
        row = cursorCell[0];
      }
      
      if (offsetX < 0.5) {
        // Left half - cell becomes right column of 2x2
        col = cursorCell[1] - 1;
      } else {
        // Right half - cell becomes left column of 2x2
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
          if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue; // Only check perimeter
          
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
    
    // Check if the two placement areas overlap
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
  
  // Handle mouse leave - don't clear state, allow re-entry
  const handleMouseLeave = useCallback(() => {
    if (!dragState && !paintState) {
      setHoverInfo(null);
    }
  }, [dragState, paintState]);
  
  // Handle mouse down to start placing or removing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Ignore if dragging an existing placement
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
        const result = moveLockedPlacement(placementId, currentPosition);
        
        if (!result.success) {
          toast({
            title: "Cannot move here",
            description: result.error,
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
  
  // Get clamped cell with offset for document events (uses center of cell for offset)
  const getGridCellClampedWithOffset = useCallback((clientX: number, clientY: number): { cell: [number, number]; offsetX: number; offsetY: number } | null => {
    if (!gridRef.current) return null;
    
    const rect = gridRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const cellUnit = cellSize + gap;
    const col = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(x / cellUnit)));
    const row = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(y / cellUnit)));
    
    // Calculate offset within cell (clamped)
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
    ? isValidPlacementPosition(previewPosition, selectedCropForPlacement.size)
    : null;
  
  // Get drag preview validation
  const dragValidation = dragState
    ? (() => {
        const placement = lockedPlacements.find(p => p.id === dragState.placementId);
        if (!placement) return null;
        return isValidPlacement(dragState.currentPosition, placement.size, dragState.placementId);
      })()
    : null;
  
  return (
    <div
      ref={gridRef}
      className={`relative select-none ${className}`}
      style={{
        width: gridWidth,
        height: gridHeight,
        cursor: isPlacementMode ? "crosshair" : "default",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      onMouseUp={handleMouseUp}
    >
      {/* Background grid cells */}
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
        
        // If dragging, show at drag position
        const displayPlacement = isDragging
          ? { ...placement, position: dragState.currentPosition }
          : placement;
        
        return (
          <LockedPlacementCell
            key={placement.id}
            placement={displayPlacement}
            cellSize={cellSize}
            gap={gap}
            isSelected={isDragging}
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
      
      {/* Placement preview (when not dragging) */}
      {previewPosition && selectedCropForPlacement && !dragState && !paintState && (
        <PlacementPreview
          position={previewPosition}
          crop={selectedCropForPlacement}
          isValid={previewValidation?.valid ?? false}
          cellSize={cellSize}
          gap={gap}
        />
      )}
    </div>
  );
};
