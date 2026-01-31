import React from "react";
import { GRID_SIZE } from "../../constants";
import { getCellPixelPosition } from "../../utilities";

export interface GridBackgroundProps {
  cellSize: number;
  gap: number;
  unlockedCells: Set<string>;
  variant?: "green" | "gray";
}

export const GridBackground: React.FC<GridBackgroundProps> = ({
  cellSize,
  gap,
  unlockedCells,
  variant = "green",
}) => {
  const unlockedColor = variant === "gray"
    ? "bg-slate-600/40 border border-slate-500/30"
    : "bg-emerald-600/40 border border-emerald-500/30";
  
  return (
    <>
      {Array.from({ length: GRID_SIZE }).map((_, rowIndex) =>
        Array.from({ length: GRID_SIZE }).map((_, colIndex) => {
          const key = `${rowIndex},${colIndex}`;
          const isUnlocked = unlockedCells.has(key);
          const { top, left } = getCellPixelPosition(rowIndex, colIndex, cellSize, gap);
          
          return (
            <div
              key={key}
              style={{
                position: "absolute",
                top,
                left,
                width: cellSize,
                height: cellSize,
              }}
              className={`rounded ${
                isUnlocked
                  ? unlockedColor
                  : "bg-slate-700/30 border border-slate-600/20"
              }`}
            />
          );
        })
      )}
    </>
  );
};
