import React, { useState, useRef, useCallback, useEffect } from "react";
import { Lock } from "lucide-react";
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
  onMouseDown: (e: React.MouseEvent) => void;
}> = ({ placement, cellSize, gap, isSelected, isDragging, onMouseDown }) => {
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
    boxShadow: "0 0 8px rgba(234, 179, 8, 0.8), inset 0 0 8px rgba(234, 179, 8, 0.4)",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    zIndex: isDragging ? 20 : 10,
    cursor: isDragging ? "grabbing" : "grab",
    opacity: isDragging ? 0.8 : 1,
    transform: isSelected ? "scale(1.02)" : "scale(1)",
    transition: isDragging ? "none" : "transform 0.15s ease",
  };

  return (
    <div
      style={style}
      onMouseDown={onMouseDown}
      onContextMenu={(e) => e.preventDefault()}
      title={`${placement.crop} - Locked (drag to move, right-click to remove)`}
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
      
      {/* Lock badge */}
      <div className="absolute top-0.5 right-0.5 bg-yellow-500 rounded-bl-md p-0.5">
        <Lock className="w-3 h-3 text-slate-900" />
      </div>
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
    isValidPlacement,
    isPlacementMode,
  } = useLockedPlacements();
  const { toast } = useToast();
  
  const gridRef = useRef<HTMLDivElement>(null);
  const [hoverPosition, setHoverPosition] = useState<[number, number] | null>(null);
  const [dragState, setDragState] = useState<{
    placementId: string;
    startPosition: [number, number];
    currentPosition: [number, number];
  } | null>(null);
  
  const gridWidth = GRID_SIZE * cellSize + (GRID_SIZE - 1) * gap;
  const gridHeight = GRID_SIZE * cellSize + (GRID_SIZE - 1) * gap;
  
  // Convert mouse position to grid cell
  const getGridCell = useCallback((clientX: number, clientY: number): [number, number] | null => {
    if (!gridRef.current) return null;
    
    const rect = gridRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const col = Math.floor(x / (cellSize + gap));
    const row = Math.floor(y / (cellSize + gap));
    
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
      return null;
    }
    
    return [row, col];
  }, [cellSize, gap]);
  
  // Handle mouse move for preview and dragging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const cell = getGridCell(e.clientX, e.clientY);
    
    if (dragState) {
      if (cell) {
        setDragState(prev => prev ? { ...prev, currentPosition: cell } : null);
      }
    } else if (isPlacementMode) {
      setHoverPosition(cell);
    }
  }, [getGridCell, dragState, isPlacementMode]);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (!dragState) {
      setHoverPosition(null);
    }
  }, [dragState]);
  
  // Handle click to place crop
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (dragState || !isPlacementMode || !selectedCropForPlacement) return;
    
    const cell = getGridCell(e.clientX, e.clientY);
    if (!cell) return;
    
    const result = addLockedPlacement({
      crop: selectedCropForPlacement.id,
      position: cell,
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
    }
  }, [getGridCell, isPlacementMode, selectedCropForPlacement, addLockedPlacement, dragState, toast]);
  
  // Handle right-click to remove
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    const cell = getGridCell(e.clientX, e.clientY);
    if (!cell) return;
    
    const placement = getLockedPlacementAt(cell[0], cell[1]);
    if (placement) {
      removeLockedPlacement(placement.id);
    }
  }, [getGridCell, getLockedPlacementAt, removeLockedPlacement]);
  
  // Handle mouse down on placement (start drag)
  const handlePlacementMouseDown = useCallback((placementId: string, e: React.MouseEvent) => {
    // Right-click removes
    if (e.button === 2) {
      e.preventDefault();
      removeLockedPlacement(placementId);
      return;
    }
    
    // Left-click starts drag
    if (e.button === 0) {
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
  }, [lockedPlacements, removeLockedPlacement]);
  
  // Handle mouse up (end drag)
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
  }, [dragState, moveLockedPlacement, toast]);
  
  // Add document-level mouse up listener
  useEffect(() => {
    if (dragState) {
      const handleDocumentMouseUp = () => handleMouseUp();
      document.addEventListener("mouseup", handleDocumentMouseUp);
      return () => document.removeEventListener("mouseup", handleDocumentMouseUp);
    }
  }, [dragState, handleMouseUp]);
  
  // Check if preview placement is valid
  const previewValidation = hoverPosition && selectedCropForPlacement
    ? isValidPlacement(hoverPosition, selectedCropForPlacement.size)
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
      onClick={handleClick}
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
            onMouseDown={(e) => handlePlacementMouseDown(placement.id, e)}
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
      {hoverPosition && selectedCropForPlacement && !dragState && (
        <PlacementPreview
          position={hoverPosition}
          crop={selectedCropForPlacement}
          isValid={previewValidation?.valid ?? false}
          cellSize={cellSize}
          gap={gap}
        />
      )}
    </div>
  );
};
