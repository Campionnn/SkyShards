import React from "react";
import { useNavigate } from "react-router-dom";
import { GRID_SIZE } from "../../constants";
import { useGridState } from "../../context";

interface GridPreviewProps {
  className?: string;
}

export const GridPreview: React.FC<GridPreviewProps> = ({ className = "" }) => {
  const navigate = useNavigate();
  const { isCellUnlocked, unlockedCells } = useGridState();
  
  const rows = Array.from({ length: GRID_SIZE }, (_, i) => i);
  const cols = Array.from({ length: GRID_SIZE }, (_, i) => i);
  
  const handleClick = () => {
    navigate("/");
  };
  
  return (
    <div 
      className={`inline-block cursor-pointer group ${className}`}
      onClick={handleClick}
      title="Click to edit grid"
    >
      <div className="flex flex-col gap-px p-2 bg-slate-800/40 border border-slate-600/30 rounded-lg group-hover:border-emerald-500/50 transition-colors duration-200">
        <div className="text-xs text-slate-400 mb-1 text-center group-hover:text-emerald-400 transition-colors">
          {unlockedCells.size} cells selected
        </div>
        {rows.map(row => (
          <div key={row} className="flex gap-px">
            {cols.map(col => {
              const isUnlocked = isCellUnlocked(row, col);
              return (
                <div
                  key={`${row}-${col}`}
                  className={`w-2 h-2 rounded-sm ${
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
  );
};
