import React from "react";
import { InteractiveGrid } from "./InteractiveGrid";

interface GridPainterProps {
  className?: string;
  cellSize?: number;
  gap?: number;
}

/**
 * Grid component for placing and managing locked crop placements.
 * This is a thin wrapper around InteractiveGrid for backwards compatibility.
 */
export const GridPainter: React.FC<GridPainterProps> = ({
  className = "",
  cellSize = 48,
  gap = 2,
}) => {
  return (
    <InteractiveGrid
      className={className}
      cellSize={cellSize}
      gap={gap}
    />
  );
};
