import { Menu } from "lucide-react";
import type { WorkerProgress } from "../../services/workerCalculationService";

/** Progress bar shown while a calculation runs. */
export const CalculationProgress = ({ progress }: { progress: WorkerProgress | null }) => {
  const percent = Math.round((progress?.progress || 0) * 100);

  return (
    <div className="bg-purple-500/10 border border-purple-500/20 rounded-md p-3">
      <div className="flex items-center justify-between">
        <div className="text-white text-sm font-medium">{progress?.message || "Calculating..."}</div>
        {typeof progress?.progress === "number" && <div className="text-purple-300 text-xs">{percent}%</div>}
      </div>
      <div className="mt-2 h-2 bg-white/10 rounded">
        <div className="h-2 bg-purple-400 rounded" style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
    </div>
  );
};

/** Placeholder before anything has been calculated. */
export const CalculatorEmptyState = () => (
  <div className="text-center py-10 bg-white/5 border border-white/10 rounded-md">
    <div className="max-w-md mx-auto space-y-3">
      <div className="w-12 h-12 bg-purple-500/20 border border-purple-500/20 rounded-md flex items-center justify-center mx-auto">
        <Menu className="w-6 h-6 text-purple-400" />
      </div>
      <h3 className="text-lg font-medium text-white">Ready to Calculate</h3>
      <h5 className="text-sm font-medium text-white">
        If this is your first time using SkyShards, check out the{" "}
        <a href="/guide" className="underline text-purple-300 hover:text-purple-200">
          guide!
        </a>
      </h5>
      <p className="text-slate-400 text-sm mt-1">Configure your settings and select a shard to see optimal fusion paths</p>
    </div>
  </div>
);
