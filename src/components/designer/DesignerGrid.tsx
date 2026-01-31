import React, { useRef, useState, useMemo } from "react";
import { Trash2 } from "lucide-react";
import { useDesigner, useGreenhouseData } from "../../context";
import { useDesignerGridPlacement } from "../../hooks";
import { 
  getGridDimensions, 
  calculateCropImageDimensions,
  getCellPixelPosition,
} from "../../utilities";
import { GridBackground, DragValidationOverlay } from "../grid";
import { getCropImagePath, getGroundImagePath } from "../../types/greenhouse";
import type { DesignerPlacement } from "../../context";

interface DesignerGridProps {
  className?: string;
  cellSize?: number;
  gap?: number;
  showTargets?: boolean;
}

const StatusMessage: React.FC<{
  hoveredPlacementId: string | null;
  isPlacementMode: boolean;
  hoverInfo: { cell: [number, number] } | null;
}> = ({ hoveredPlacementId, isPlacementMode, hoverInfo }) => {
  const getMessage = () => {
    if (hoveredPlacementId && isPlacementMode) {
      return (
        <span>
          <span className="font-semibold text-emerald-400">Left-click to place</span>,{" "}
          <span className="font-semibold text-red-400">right-click to remove</span>,{" "}
          drag to move
        </span>
      );
    }
    if (hoveredPlacementId && !isPlacementMode) {
      return (
        <span>
          <span className="font-semibold text-emerald-400">Drag to move</span>,{" "}
          <span className="font-semibold text-red-400">right-click to remove</span>
        </span>
      );
    }
    if (isPlacementMode && hoverInfo) {
      return (
        <span>
          <span className="font-semibold text-emerald-400">Left-click to place</span>, right-click to remove, drag to move
        </span>
      );
    }
    if (isPlacementMode) {
      return "Left-click to place, right-click to remove, drag to move";
    }
    return "Select a crop from the palette to begin placing";
  };

  return (
    <div className="text-center py-2 text-slate-500 text-sm">
      {getMessage()}
    </div>
  );
};

interface DesignerPlacementCellProps {
  placement: DesignerPlacement;
  cellSize: number;
  gap: number;
  isDragging: boolean;
  isHovered: boolean;
  isPlacementMode: boolean;
  isInput: boolean;
  groundType: string;
  validationInfo?: { isValid: boolean; missingRequirements: Array<{ crop: string; needed: number; have: number }> };
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const DesignerPlacementCell: React.FC<DesignerPlacementCellProps> = ({
  placement,
  cellSize,
  gap,
  isDragging,
  isHovered,
  isPlacementMode,
  isInput,
  groundType,
  validationInfo,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
}) => {
  const [imageError, setImageError] = useState(false);
  
  const { totalWidth, totalHeight, imageWidth, imageHeight } = calculateCropImageDimensions(placement.size, cellSize, gap);
  const { top, left } = getCellPixelPosition(placement.position[0], placement.position[1], cellSize, gap);
  
  // Determine if this is an invalid target
  const isInvalidTarget = !isInput && validationInfo && !validationInfo.isValid;
  
  // Glow colors: no glow for inputs, blue glow for valid targets, red border for invalid targets
  const baseGlow = isInput
    ? undefined
    : isInvalidTarget
      ? undefined // No glow for invalid, we use border instead
      : "0 0 8px rgba(0, 200, 255, 1), inset 0 0 8px rgba(0, 200, 255, 1)";
  const hoverGlow = "0 0 8px rgba(239, 68, 68, 0.8), inset 0 0 8px rgba(239, 68, 68, 0.4)";
  
  const style: React.CSSProperties = {
    position: "absolute",
    top,
    left,
    width: totalWidth,
    height: totalHeight,
    backgroundImage: `url(${getGroundImagePath(groundType)})`,
    backgroundSize: `${cellSize}px ${cellSize}px`,
    backgroundPosition: "top left",
    backgroundRepeat: "repeat",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible", // Allow tooltip to overflow
    boxShadow: isHovered ? hoverGlow : baseGlow,
    border: isInvalidTarget ? "2px solid #ef4444" : undefined, // Red border for invalid
    zIndex: isDragging ? 20 : (isHovered && isInvalidTarget ? 30 : 10), // Higher z-index when showing tooltip
    cursor: isDragging ? "grabbing" : (isPlacementMode ? "crosshair" : "grab"),
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
      title={`${placement.cropName} - Drag to move, right-click to remove`}
    >
      {!imageError ? (
        <img
          src={getCropImagePath(placement.cropId)}
          alt={placement.cropName}
          style={{ 
            width: imageWidth, 
            height: imageHeight,
            imageRendering: "pixelated",
          }}
          className="object-contain pointer-events-none"
          onError={() => setImageError(true)}
          draggable={false}
        />
      ) : (
        <span className={`text-xs font-medium ${isInput ? "text-yellow-300" : "text-purple-300"}`}>
          {placement.cropName.slice(0, 4)}
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

interface DesignerPlacementPreviewProps {
  position: [number, number];
  cropId: string;
  cropName: string;
  size: number;
  groundType: string;
  isValid: boolean;
  cellSize: number;
  gap: number;
}

const DesignerPlacementPreview: React.FC<DesignerPlacementPreviewProps> = ({
  position,
  cropId,
  cropName,
  size,
  groundType,
  isValid,
  cellSize,
  gap,
}) => {
  const [imageError, setImageError] = useState(false);
  
  const { totalWidth, totalHeight, imageWidth, imageHeight } = calculateCropImageDimensions(size, cellSize, gap);
  const { top, left } = getCellPixelPosition(position[0], position[1], cellSize, gap);
  
  const style: React.CSSProperties = {
    position: "absolute",
    top,
    left,
    width: totalWidth,
    height: totalHeight,
    backgroundImage: `url(${getGroundImagePath(groundType)})`,
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
          src={getCropImagePath(cropId)}
          alt={cropName}
          style={{ 
            width: imageWidth, 
            height: imageHeight,
            imageRendering: "pixelated",
          }}
          className="object-contain"
          onError={() => setImageError(true)}
          draggable={false}
        />
      ) : (
        <span className="text-white text-xs font-medium">
          {cropName.slice(0, 4)}
        </span>
      )}
    </div>
  );
};

export const DesignerGrid: React.FC<DesignerGridProps> = ({
  className = "",
  cellSize = 48,
  gap = 2,
  showTargets = true,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const { getCropDef, mutations } = useGreenhouseData();
  const {
    inputPlacements,
    targetPlacements,
    allPlacements,
    selectedCropForPlacement,
    isPlacementMode,
    getTargetValidation,
    setHoveredTargetId,
  } = useDesigner();
  
  // Designer always uses a full 10x10 grid with all cells "unlocked"
  const allCellsUnlocked = useMemo(() => {
    const cells = new Set<string>();
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        cells.add(`${r},${c}`);
      }
    }
    return cells;
  }, []);
  
  const { width: gridWidth, height: gridHeight } = getGridDimensions(cellSize, gap);
  
  const {
    hoveredPlacementId,
    setHoveredPlacementId,
    dragState,
    paintState,
    hoverInfo,
    previewPosition,
    previewValidation,
    dragValidation,
    handleMouseMove,
    handleMouseLeave,
    handleMouseDown,
    handleMouseUp,
    handleContextMenu,
    handlePlacementMouseDown,
  } = useDesignerGridPlacement({ cellSize, gap, gridRef });
  
  // Get ground type for a crop
  const getGroundType = (cropId: string): string => {
    const cropDef = getCropDef(cropId);
    return cropDef?.ground || "farmland";
  };
  
  return (
    <>
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
      <GridBackground cellSize={cellSize} gap={gap} unlockedCells={allCellsUnlocked} variant="gray" />
      
      {/* Input placements */}
      {inputPlacements.map((placement) => {
        const isDragging = dragState?.placementId === placement.id;
        const isHovered = hoveredPlacementId === placement.id && !isDragging && !isPlacementMode;
        
        const displayPlacement = isDragging
          ? { ...placement, position: dragState.currentPosition }
          : placement;
        
        return (
          <DesignerPlacementCell
            key={placement.id}
            placement={displayPlacement}
            cellSize={cellSize}
            gap={gap}
            isDragging={isDragging}
            isHovered={isHovered}
            isPlacementMode={isPlacementMode}
            isInput={true}
            groundType={getGroundType(placement.cropId)}
            onMouseDown={(e) => handlePlacementMouseDown(placement.id, e)}
            onMouseEnter={() => setHoveredPlacementId(placement.id)}
            onMouseLeave={() => setHoveredPlacementId(null)}
          />
        );
      })}
      
      {/* Target placements */}
      {showTargets && targetPlacements.map((placement) => {
        const isDragging = dragState?.placementId === placement.id;
        const isHovered = hoveredPlacementId === placement.id && !isDragging && !isPlacementMode;
        
        const displayPlacement = isDragging
          ? { ...placement, position: dragState.currentPosition }
          : placement;
        
        // Get validation info for this target
        const validationInfo = getTargetValidation(placement.id, mutations);
        
        return (
          <DesignerPlacementCell
            key={placement.id}
            placement={displayPlacement}
            cellSize={cellSize}
            gap={gap}
            isDragging={isDragging}
            isHovered={isHovered}
            isPlacementMode={isPlacementMode}
            isInput={false}
            groundType={getGroundType(placement.cropId)}
            validationInfo={validationInfo}
            onMouseDown={(e) => handlePlacementMouseDown(placement.id, e)}
            onMouseEnter={() => {
              setHoveredPlacementId(placement.id);
              setHoveredTargetId(placement.id);
            }}
            onMouseLeave={() => {
              setHoveredPlacementId(null);
              setHoveredTargetId(null);
            }}
          />
        );
      })}
      
      {/* Drag preview validation overlay */}
      {dragState && dragValidation && (
        <DragValidationOverlay
          position={dragState.currentPosition}
          size={allPlacements.find(p => p.id === dragState.placementId)?.size ?? 1}
          cellSize={cellSize}
          gap={gap}
          isValid={dragValidation.valid}
        />
      )}
      
      {/* Placement preview (when not dragging) */}
      {previewPosition && selectedCropForPlacement && !dragState && !paintState && (
        <DesignerPlacementPreview
          position={previewPosition}
          cropId={selectedCropForPlacement.id}
          cropName={selectedCropForPlacement.name}
          size={selectedCropForPlacement.size}
          groundType={getGroundType(selectedCropForPlacement.id)}
          isValid={previewValidation?.valid ?? false}
          cellSize={cellSize}
          gap={gap}
        />
      )}
      </div>
      
      <StatusMessage
        hoveredPlacementId={hoveredPlacementId}
        isPlacementMode={isPlacementMode}
        hoverInfo={hoverInfo}
      />
    </>
  );
};
