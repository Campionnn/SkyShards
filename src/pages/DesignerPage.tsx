import React, { useState, useRef } from "react";
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
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-screen-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_420px] gap-6">
        <div className="space-y-4">
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
            <DesignerActions gridRef={gridRef} showTargets={showTargets} />
          </div>
          
          {/* Mutation Validator */}
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-200 mb-3">Mutation Status</h3>
            <MutationValidator />
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-200">Greenhouse Designer</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowTargets(!showTargets)}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 hover:text-slate-200"
                  title={showTargets ? "Hide target mutations" : "Show target mutations"}
                >
                  {showTargets ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide Targets</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Show Targets</span>
                    </>
                  )}
                </button>
                <div className="flex gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded" style={{ boxShadow: "0 0 6px rgba(0, 200, 255, 1), inset 0 0 4px rgba(0, 200, 255, 1)" }} />
                    Target
                  </span>
                </div>
              </div>
            </div>
            <DesignerGrid ref={gridRef} showTargets={showTargets} />
          </div>
        </div>
        
        <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4 h-[calc(100vh-180px)] min-h-[500px]">
          <CropSelectionPalette className="h-full" />
        </div>
      </div>
    </div>
  );
};
