import React from "react";
import { GRID_SIZE } from "../../constants";
import { useGridState } from "../../context";

interface GridPreviewProps {
  className?: string;
  onClick?: () => void;
}

export const GridPreview: React.FC<GridPreviewProps> = ({ className = "", onClick }) => {
  const { isCellUnlocked, unlockedCells } = useGridState();
  
  const rows = Array.from({ length: GRID_SIZE }, (_, i) => i);
  const cols = Array.from({ length: GRID_SIZE }, (_, i) => i);
  
  return (
    <div 
      className={`cursor-pointer group ${className}`}
      onClick={onClick}
      title="Click to edit grid"
    >
      <div className="flex flex-col gap-px p-2 bg-slate-800/40 border border-slate-600/30 rounded-lg group-hover:border-emerald-500/50 transition-colors duration-200">
        <div className="text-xs text-slate-400 mb-1 text-center group-hover:text-emerald-400 transition-colors">
          {unlockedCells.size} cells selected
        </div>
        <div className="w-full aspect-square flex flex-col gap-px">
          {rows.map(row => (
            <div key={row} className="flex gap-px flex-1">
              {cols.map(col => {
                const isUnlocked = isCellUnlocked(row, col);
                return (
                  <div
                    key={`${row}-${col}`}
                    className={`flex-1 rounded-sm ${
                      isUnlocked 
                        ? "bg-emerald-500" 
                        : "bg-slate-700/50"
                    }`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
