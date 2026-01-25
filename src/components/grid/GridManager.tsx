import React, { useState, useRef, useCallback, useEffect } from "react";
import { GRID_SIZE } from "../../constants";
import { GridCell } from "./GridCell";

interface GridManagerProps {
  isInteractive?: boolean;
  showCoordinates?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const GridManager: React.FC<GridManagerProps> = ({
  isInteractive = true,
  showCoordinates = false,
  size = "md",
  className = "",
}) => {
  const rows = Array.from({ length: GRID_SIZE }, (_, i) => i);
  const cols = Array.from({ length: GRID_SIZE }, (_, i) => i);
  
  // Drag painting state
  const [isDragging, setIsDragging] = useState(false);
  const paintModeRef = useRef<'lock' | 'unlock' | null>(null);
  const hasDraggedRef = useRef(false);
  
  const handleMouseDown = useCallback(() => {
    if (!isInteractive) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
  }, [isInteractive]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    paintModeRef.current = null;
    hasDraggedRef.current = false;
  }, []);
  
  const handleMouseMove = useCallback(() => {
    if (isDragging) {
      hasDraggedRef.current = true;
    }
  }, [isDragging]);
  
  // Add document-level mouse up listener to handle painting outside grid
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseUp]);
  
  return (
    <div 
      className={`inline-block select-none ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
    >
      <div className="flex flex-col gap-0.5">
        {rows.map(row => (
          <div key={row} className="flex gap-0.5">
            {cols.map(col => (
              <GridCell
                key={`${row}-${col}`}
                row={row}
                col={col}
                isInteractive={isInteractive}
                showCoordinates={showCoordinates}
                size={size}
                isDragging={isDragging}
                paintModeRef={paintModeRef}
                hasDraggedRef={hasDraggedRef}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
