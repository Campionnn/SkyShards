import React from "react";
import { Loader2, Clock } from "lucide-react";
import type { JobProgress } from "../../types/greenhouse";

interface SolverProgressProps {
  progress: JobProgress | null;
  queuePosition: number | null;
}

export const SolverProgress: React.FC<SolverProgressProps> = ({
  progress,
  queuePosition,
}) => {
  // Queued state
  if (queuePosition !== null) {
    return (
      <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-medium text-slate-200">Queued</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-6">
          <div className="text-3xl font-bold text-blue-400 mb-2">
            #{queuePosition}
          </div>
          <span className="text-sm text-slate-400">Position in queue</span>
          <p className="text-xs text-slate-500 mt-2">
            Your job will start when previous jobs complete
          </p>
        </div>
      </div>
    );
  }

  // Running state with progress
  if (progress) {
    const hasPercentage = progress.percentage !== null && progress.percentage > 0;
    const elapsedTime = Math.round(progress.elapsed_seconds);
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    const timeString = minutes > 0 
      ? `${minutes}m ${seconds}s` 
      : `${seconds}s`;

    return (
      <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
          <h3 className="text-sm font-medium text-slate-200">Solving...</h3>
          <span className="text-xs text-slate-500 ml-auto">{timeString}</span>
        </div>

        {/* Phase */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">{progress.phase}</span>
            {hasPercentage && (
              <span className="text-xs text-emerald-400">
                {Math.round(progress.percentage!)}%
              </span>
            )}
          </div>
          {hasPercentage && (
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          )}
        </div>

        {/* current activity */}
        {progress.current_activity && (
          <p className="text-xs text-slate-400">
            {progress.current_activity}
          </p>
        )}
      </div>
    );
  }

  // default loading state
  return (
    <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
        <h3 className="text-sm font-medium text-slate-200">Starting...</h3>
      </div>
      <div className="flex flex-col items-center justify-center py-6">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3" />
        <span className="text-sm text-slate-400">Submitting job...</span>
      </div>
    </div>
  );
};
