import React from "react";
import { 
  CropSelectionPalette, 
  DesignerActions, 
  DesignerGrid,
  MutationValidator 
} from "../components";

export const DesignerPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6 max-w-screen-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_420px] gap-6">
        {/* Column 1 - Actions & Status */}
        <div className="space-y-4">
          {/* Designer Actions (mode toggle, save/load) */}
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
            <DesignerActions />
          </div>
          
          {/* Mutation Validator */}
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-200 mb-3">Mutation Status</h3>
            <MutationValidator />
          </div>
        </div>
        
        {/* Column 2 - Interactive Grid */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-200">Greenhouse Designer</h3>
              <div className="flex gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded" style={{ boxShadow: "0 0 6px rgba(0, 200, 255, 1), inset 0 0 4px rgba(0, 200, 255, 1)" }} />
                  Target
                </span>
              </div>
            </div>
            <DesignerGrid />
          </div>
        </div>
        
        {/* Column 3 - Crop Selection Palette */}
        <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4 h-[calc(100vh-180px)] min-h-[500px]">
          <CropSelectionPalette className="h-full" />
        </div>
      </div>
    </div>
  );
};
