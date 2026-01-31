import React, { useRef } from "react";
import { useGridState, useLockedPlacements } from "../../context";
import { useGridPlacement } from "../../hooks";
import { getGridDimensions } from "../../utilities";
import {
  GridBackground,
  LockedPlacementCell,
  PlacementPreview,
  DragValidationOverlay,
} from "./index";

export interface InteractiveGridProps {
  className?: string;
  cellSize?: number;
  gap?: number;
  children?: React.ReactNode;
}

export const InteractiveGrid: React.FC<InteractiveGridProps> = ({
  className = "",
  cellSize = 48,
  gap = 2,
  children,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const { unlockedCells } = useGridState();
  const { lockedPlacements, selectedCropForPlacement, isPlacementMode } = useLockedPlacements();
  
  const { width: gridWidth, height: gridHeight } = getGridDimensions(cellSize, gap);
  
  const {
    hoveredPlacementId,
    setHoveredPlacementId,
    dragState,
    paintState,
    previewPosition,
    previewValidation,
    dragValidation,
    handleMouseMove,
    handleMouseLeave,
    handleMouseDown,
    handleMouseUp,
    handleContextMenu,
    handlePlacementMouseDown,
  } = useGridPlacement({ cellSize, gap, gridRef });
  
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
      <GridBackground cellSize={cellSize} gap={gap} unlockedCells={unlockedCells} />
      
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
            isDragging={isDragging}
            isHovered={isHovered}
            isPlacementMode={isPlacementMode}
            onMouseDown={(e) => handlePlacementMouseDown(placement.id, e)}
            onMouseEnter={() => setHoveredPlacementId(placement.id)}
            onMouseLeave={() => setHoveredPlacementId(null)}
          />
        );
      })}
      
      {/* Drag preview validation overlay */}
      {dragState && dragValidation && (
        <DragValidationOverlay
          position={dragState.currentPosition}
          size={lockedPlacements.find(p => p.id === dragState.placementId)?.size ?? 1}
          cellSize={cellSize}
          gap={gap}
          isValid={dragValidation.valid}
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
      
      {/* Additional content */}
      {children}
    </div>
  );
};
