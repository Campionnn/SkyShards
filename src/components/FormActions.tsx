import React from "react";
import { Settings, Zap, RotateCcw } from "lucide-react";

interface FormActionsProps {
  onMaxStats: () => void;
  onReset: () => void;
}

export const FormActions: React.FC<FormActionsProps> = ({ onMaxStats, onReset }) => (
  <div className="flex items-center justify-between">
    <h3 className="text-base font-semibold text-white flex items-center gap-2">
      <Settings className="w-4 h-4 text-purple-400" />
      Settings
    </h3>
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={onMaxStats}
        className="px-2 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-medium rounded-md text-xs border border-amber-500/20 hover:border-amber-500/30 transition-colors duration-200 flex items-center space-x-1 cursor-pointer"
      >
        <Zap className="w-3 h-3" />
        <span>Max Stats</span>
      </button>
      <button
        type="button"
        onClick={onReset}
        className="px-2 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-md text-xs border border-red-500/20 hover:border-red-500/30 transition-colors duration-200 flex items-center space-x-1 cursor-pointer"
      >
        <RotateCcw className="w-3 h-3" />
        <span>Reset</span>
      </button>
    </div>
  </div>
);
