import React, { useState, useRef, useCallback } from "react";
import { Trash2, Leaf, ImageOff } from "lucide-react";
import { calculateCropImageDimensions, getCellPixelPosition } from "../../utilities";
import { getCropImagePath, getGroundImagePath } from "../../types/greenhouse";
import type { LockedPlacement, SelectedCropForPlacement } from "../../types/greenhouse";

interface BaseCellStyleParams {
  position: [number, number];
  size: number;
  cellSize: number;
  gap: number;
  groundType: string;
}

function getBaseCellStyle(params: BaseCellStyleParams): React.CSSProperties {
  const { position, size, cellSize, gap, groundType } = params;
  const { totalWidth, totalHeight } = calculateCropImageDimensions(size, cellSize, gap);
  const pixelPos = getCellPixelPosition(position[0], position[1], cellSize, gap);
  
  return {
    position: "absolute",
    top: pixelPos.top,
    left: pixelPos.left,
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
  };
}

export interface LockedPlacementCellProps {
  placement: LockedPlacement;
  cellSize: number;
  gap: number;
  isDragging: boolean;
  isHovered: boolean;
  isPlacementMode?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick?: () => void;
  onCancelDrag?: () => void;
}

// Click detection threshold in pixels
const CLICK_THRESHOLD = 5;

export const LockedPlacementCell: React.FC<LockedPlacementCellProps> = ({
  placement,
  cellSize,
  gap,
  isDragging,
  isHovered,
  isPlacementMode = false,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onCancelDrag,
}) => {
  const [imageError, setImageError] = useState(false);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef(false);
  
  const { imageWidth, imageHeight } = calculateCropImageDimensions(placement.size, cellSize, gap);
  
  // Check if this crop needs a white glow (dark crops on farmland blend in)
  const needsGlow = (placement.crop === "choconut" || placement.crop === "chocoberry" || placement.crop === "dead_plant") && placement.ground === "farmland";
  
  const baseStyle = getBaseCellStyle({
    position: placement.position,
    size: placement.size,
    cellSize,
    gap,
    groundType: placement.ground,
  });
  
  const style: React.CSSProperties = {
    ...baseStyle,
    boxShadow: isHovered 
      ? "0 0 8px rgba(239, 68, 68, 0.8), inset 0 0 8px rgba(239, 68, 68, 0.4)"
      : "0 0 8px rgba(234, 179, 8, 0.8), inset 0 0 8px rgba(234, 179, 8, 0.4)",
    zIndex: isDragging ? 20 : 10,
    cursor: isDragging ? "grabbing" : (isPlacementMode ? "crosshair" : "grab"),
    opacity: isDragging ? 0.8 : 1,
    transform: isDragging ? undefined : "scale(1)",
    transition: isDragging ? "none" : "transform 0.15s ease, box-shadow 0.15s ease",
  };
  
  const imageStyle: React.CSSProperties = {
    width: imageWidth,
    height: imageHeight,
    filter: needsGlow ? "drop-shadow(0 0 5px rgba(255, 255, 255, 0.7))" : undefined,
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Store the initial position for click detection
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    hasDraggedRef.current = false;
    
    // Call the original mousedown handler for drag
    onMouseDown(e);
  }, [onMouseDown]);

  const handleMouseMove = useCallback(() => {
    // If we're tracking a potential click and mouse moved significantly, mark as dragged
    if (mouseDownPosRef.current && !hasDraggedRef.current) {
      hasDraggedRef.current = true;
    }
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // Check if this was a click (not a drag)
    if (mouseDownPosRef.current && onClick) {
      const dx = Math.abs(e.clientX - mouseDownPosRef.current.x);
      const dy = Math.abs(e.clientY - mouseDownPosRef.current.y);
      
      // If mouse moved less than threshold, treat as click
      if (dx < CLICK_THRESHOLD && dy < CLICK_THRESHOLD) {
        e.stopPropagation();
        // Cancel any pending drag state before opening modal
        onCancelDrag?.();
        onClick();
      }
    }
    
    mouseDownPosRef.current = null;
    hasDraggedRef.current = false;
  }, [onClick, onCancelDrag]);

  return (
    <div
      style={style}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onContextMenu={(e) => e.preventDefault()}
      title={`${placement.crop} - Click for info, drag to move, right-click to remove`}
    >
      {!imageError ? (
        <img
          src={getCropImagePath(placement.crop)}
          alt={placement.crop}
          style={imageStyle}
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

export interface PlacementPreviewProps {
  position: [number, number];
  crop: SelectedCropForPlacement;
  isValid: boolean;
  cellSize: number;
  gap: number;
}

export const PlacementPreview: React.FC<PlacementPreviewProps> = ({
  position,
  crop,
  isValid,
  cellSize,
  gap,
}) => {
  const [imageError, setImageError] = useState(false);
  
  const { imageWidth, imageHeight } = calculateCropImageDimensions(crop.size, cellSize, gap);
  
  // Check if this crop needs a white glow (dark crops on farmland blend in)
  const needsGlow = (crop.id === "choconut" || crop.id === "chocoberry" || crop.id === "dead_plant") && crop.ground === "farmland";
  
  const baseStyle = getBaseCellStyle({
    position,
    size: crop.size,
    cellSize,
    gap,
    groundType: crop.ground,
  });
  
  const style: React.CSSProperties = {
    ...baseStyle,
    zIndex: 15,
    opacity: 0.7,
    border: isValid ? "2px solid #22c55e" : "2px solid #ef4444",
    boxShadow: isValid 
      ? "0 0 12px rgba(34, 197, 94, 0.5)" 
      : "0 0 12px rgba(239, 68, 68, 0.5)",
    pointerEvents: "none",
  };
  
  const imageStyle: React.CSSProperties = {
    width: imageWidth,
    height: imageHeight,
    filter: needsGlow ? "drop-shadow(0 0 5px rgba(255, 255, 255, 0.7))" : undefined,
  };

  return (
    <div style={style}>
      {!imageError ? (
        <img
          src={getCropImagePath(crop.id)}
          alt={crop.name}
          style={imageStyle}
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

export interface CropCellProps {
  id: string;
  name: string;
  position: [number, number];
  size: number;
  groundType: string;
  cellSize: number;
  gap: number;
  isLocked?: boolean;
  onClick?: () => void;
}

export const CropCell: React.FC<CropCellProps> = ({
  id,
  name,
  position,
  size,
  groundType,
  cellSize,
  gap,
  isLocked = false,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);
  
  const { imageWidth, imageHeight } = calculateCropImageDimensions(size, cellSize, gap);
  
  // Check if this crop needs a white glow (dark crops on farmland blend in)
  const needsGlow = (id === "choconut" || id === "chocoberry" || id === "dead_plant") && groundType === "farmland";
  
  const baseStyle = getBaseCellStyle({
    position,
    size,
    cellSize,
    gap,
    groundType,
  });
  
  const style: React.CSSProperties = {
    ...baseStyle,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "transparent",
    boxShadow: isLocked
      ? "0 0 8px rgba(234, 179, 8, 0.8), inset 0 0 8px rgba(234, 179, 8, 0.4)" 
      : undefined,
    cursor: onClick ? "pointer" : undefined,
  };
  
  const imageStyle: React.CSSProperties = {
    width: imageWidth,
    height: imageHeight,
    filter: needsGlow ? "drop-shadow(0 0 5px rgba(255, 255, 255, 0.7))" : undefined,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
    }
  };

  return (
    <div
      style={style}
      title={`${name} (${position[0]}, ${position[1]})${size > 1 ? ` - ${size}x${size}` : ""}${isLocked ? " (Locked)" : ""} - Click for info`}
      className={`transition-transform hover:z-10 ${onClick ? "hover:brightness-110" : ""}`}
      onClick={handleClick}
    >
      {!imageError ? (
        <img
          src={getCropImagePath(id)}
          alt={name}
          style={imageStyle}
          className="object-contain pointer-events-none"
          onError={() => setImageError(true)}
          draggable={false}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-white/60">
          <ImageOff className="w-4 h-4" />
          <span className="text-[8px] mt-0.5 truncate max-w-full px-1">
            {name}
          </span>
        </div>
      )}
    </div>
  );
};

export interface MutationCellProps {
  id: string;
  name: string;
  position: [number, number];
  size: number;
  groundType: string;
  cellSize: number;
  gap: number;
  showImage: boolean;
  onClick?: () => void;
}

export const MutationCell: React.FC<MutationCellProps> = ({
  id,
  name,
  position,
  size,
  groundType,
  cellSize,
  gap,
  showImage,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);
  
  const { imageWidth, imageHeight } = calculateCropImageDimensions(size, cellSize, gap);
  
  // Check if this mutation needs a white glow (dark crops on farmland blend in)
  const needsGlow = (id === "choconut" || id === "chocoberry" || id === "dead_plant") && groundType === "farmland";
  
  const baseStyle = getBaseCellStyle({
    position,
    size,
    cellSize,
    gap,
    groundType,
  });
  
  const style: React.CSSProperties = {
    ...baseStyle,
    boxShadow: showImage ? "0 0 8px rgba(0, 200, 255, 1), inset 0 0 8px rgba(0, 200, 255, 1)" : "",
    zIndex: 5, // Above crops
    cursor: onClick ? "pointer" : undefined,
  };
  
  const imageStyle: React.CSSProperties = {
    width: imageWidth,
    height: imageHeight,
    filter: needsGlow ? "drop-shadow(0 0 5px rgba(255, 255, 255, 0.7))" : undefined,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
    }
  };

  return (
    <div
      style={style}
      title={`${name} (${position[0]}, ${position[1]})${size > 1 ? ` - ${size}x${size}` : ""} - Click for info`}
      className={`transition-transform hover:z-10 ${onClick ? "hover:brightness-110" : ""}`}
      onClick={handleClick}
    >
      {showImage && !imageError ? (
        <img
          src={getCropImagePath(id)}
          alt={name}
          style={imageStyle}
          className="object-contain pointer-events-none"
          onError={() => setImageError(true)}
          draggable={false}
        />
      ) : showImage && imageError ? (
        <div className="flex flex-col items-center justify-center text-purple-300/50">
          <Leaf className="w-5 h-5" />
          <span className="text-[7px] truncate max-w-full px-0.5">
            {name}
          </span>
        </div>
      ) : null}
    </div>
  );
};
