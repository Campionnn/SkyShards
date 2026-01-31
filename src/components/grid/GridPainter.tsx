import React from "react";
import { InteractiveGrid } from "./InteractiveGrid";

interface GridPainterProps {
  className?: string;
  cellSize?: number;
  gap?: number;
}

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
