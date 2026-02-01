import React, { useState, useRef, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { 
  CropSelectionPalette, 
  DesignerActions, 
  DesignerGrid,
  MutationValidator,
} from "../components";
import type { DesignerGridHandle } from "../components";

export const DesignerPage: React.FC = () => {
  const [showTargets, setShowTargets] = useState(true);
  const gridRef = useRef<DesignerGridHandle>(null);
  
  // Responsive grid sizing
  const [gridSize, setGridSize] = useState(() => {
    const width = window.innerWidth;
    if (width < 640) return { cellSize: 32, gap: 1 };
    if (width < 1024) return { cellSize: 40, gap: 2 };
    return { cellSize: 48, gap: 2 };
  });
  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) setGridSize({ cellSize: 32, gap: 1 });
      else if (width < 1024) setGridSize({ cellSize: 40, gap: 2 });
      else setGridSize({ cellSize: 48, gap: 2 });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-screen-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_420px] gap-4 lg:gap-6">
        <div className="space-y-4 order-2 lg:order-1">
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 sm:p-4">
            <DesignerActions gridRef={gridRef} showTargets={showTargets} />
          </div>
          
          {/* Mutation Validator */}
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 sm:p-4">
            <h3 className="text-sm font-medium text-slate-200 mb-3">Mutation Status</h3>
            <MutationValidator />
          </div>
        </div>
        
        <div className="flex flex-col items-center order-1 lg:order-2">
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 sm:p-4 w-full">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-2">
              <h3 className="text-sm font-medium text-slate-200">Greenhouse Designer</h3>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setShowTargets(!showTargets)}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 hover:text-slate-200"
                  title={showTargets ? "Hide target mutations" : "Show target mutations"}
                >
                  {showTargets ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Hide Targets</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Show Targets</span>
                    </>
                  )}
                </button>
                <div className="flex gap-2 sm:gap-4 text-xs text-slate-400">
                </div>
              </div>
            </div>
            <div className="w-full">
              <div className="overflow-x-auto">
                <div className="flex flex-col items-center min-w-full">
                  <DesignerGrid 
                    ref={gridRef} 
                    showTargets={showTargets}
                    cellSize={gridSize.cellSize}
                    gap={gridSize.gap}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 sm:p-4 h-[500px] lg:h-[calc(100vh-180px)] lg:min-h-[500px] order-3">
          <CropSelectionPalette className="h-full" />
        </div>
      </div>
    </div>
  );
};
