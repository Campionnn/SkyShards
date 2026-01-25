import React from "react";
import { useGridState } from "../../context";

interface GridCellProps {
  row: number;
  col: number;
  isInteractive?: boolean;
  showCoordinates?: boolean;
  size?: "sm" | "md" | "lg";
}

export const GridCell: React.FC<GridCellProps> = ({
  row,
  col,
  isInteractive = true,
  showCoordinates = false,
  size = "md",
}) => {
  const { 
    isCellUnlocked, 
    isCellExpandable, 
    toggleCell, 
    unlockCell,
    getExpansionStep,
    expansionSteps,
  } = useGridState();
  
  const isUnlocked = isCellUnlocked(row, col);
  const isExpandable = isCellExpandable(row, col);
  const expansionStep = getExpansionStep(row, col);
  const hasExpansionOverlay = expansionSteps.length > 0;
  
  // size classes
  const sizeClasses = {
    sm: "w-6 h-6 text-[8px]",
    md: "w-10 h-10 text-xs",
    lg: "w-12 h-12 text-sm",
  };
  
  const handleClick = () => {
    if (!isInteractive) return;
    
    if (hasExpansionOverlay && expansionStep) {
      if (expansionStep.order === 1) {
        unlockCell(row, col);
      }
      return;
    }
    
    if (isUnlocked || isExpandable) {
      toggleCell(row, col);
    }
  };
  
  let cellClasses = `${sizeClasses[size]} border flex items-center justify-center transition-all duration-150 relative`;
  let cellStyle: React.CSSProperties = {};
  
  if (isUnlocked) {
    cellClasses += " bg-emerald-600 border-emerald-500 text-white";
    if (isInteractive) {
      cellClasses += " hover:bg-emerald-500 cursor-pointer";
    }
  } else if (expansionStep && hasExpansionOverlay) {
    const totalSteps = expansionSteps.length;
    const minLight = 45;
    const maxLight = 75;
    let lightness = maxLight;
    if (totalSteps > 1) {
      lightness = maxLight - ((expansionStep.order - 1) / (totalSteps - 1)) * (maxLight - minLight);
    }
    cellStyle.backgroundColor = `hsl(45, 100%, ${lightness}%)`;
    cellClasses += " border-yellow-500 text-slate-900 font-bold";
    if (isInteractive && expansionStep.order === 1) {
      cellClasses += " cursor-pointer hover:brightness-110";
    } else if (isInteractive) {
      cellClasses += " cursor-not-allowed";
    }
  } else if (isExpandable) {
    cellClasses += " bg-slate-700/50 border-slate-600 text-slate-400";
    if (isInteractive) {
      cellClasses += " hover:bg-slate-600/50 hover:border-emerald-500/50 cursor-pointer";
    }
  } else {
    cellClasses += " bg-slate-800/30 border-slate-700/50 text-slate-600";
    if (isInteractive) {
      cellClasses += " cursor-not-allowed";
    }
  }
  
  return (
    <div 
      className={cellClasses} 
      style={cellStyle}
      onClick={handleClick}
      title={expansionStep ? `Step ${expansionStep.order}: +${expansionStep.gloomgourd_gain} (total: ${expansionStep.gloomgourd_potential})` : undefined}
    >
      {expansionStep && hasExpansionOverlay ? (
        <>
          <span className="font-bold text-sm">{expansionStep.order}</span>
          <span className="absolute bottom-0.5 right-0.5 text-[8px] font-medium">
            +{expansionStep.gloomgourd_gain}
          </span>
        </>
      ) : showCoordinates ? (
        <span className="text-[8px] opacity-60">{row},{col}</span>
      ) : null}
    </div>
  );
};
