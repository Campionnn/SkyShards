import React from "react";
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
  
  return (
    <div className={`inline-block ${className}`}>
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
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
