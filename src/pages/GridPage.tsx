import React from "react";
import { Grid3X3, RotateCcw, CheckSquare } from "lucide-react";
import { useGridState } from "../context";
import { GridManager, ExpansionOptimizer } from "../components/grid";

export const GridPage: React.FC = () => {
  const { unlockedCells, selectAll, resetToDefault } = useGridState();

  const unlockedCount = unlockedCells.size;
  const totalCells = 100;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Grid3X3 className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Grid Manager</h1>
        </div>
        <p className="text-slate-400 text-sm">
          Configure your greenhouse grid by clicking cells to unlock or lock them.
          Cells can only be unlocked if they are adjacent to an already unlocked cell.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grid Section */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
            {/* Grid Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300">
                  <span className="font-medium text-emerald-400">{unlockedCount}</span>
                  <span className="text-slate-500"> / {totalCells} cells unlocked</span>
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={resetToDefault}
                  className="px-3 py-1.5 bg-slate-600/50 hover:bg-slate-600/70 text-slate-300 font-medium rounded-md text-sm border border-slate-500/30 hover:border-slate-500/50 transition-colors duration-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={selectAll}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-medium rounded-md text-sm border border-emerald-500/20 hover:border-emerald-500/30 transition-colors duration-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Select All</span>
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="flex justify-center">
              <GridManager size="md" isInteractive={true} />
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-emerald-500/50 border border-emerald-400/50" />
                <span>Unlocked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-400/30 border-dashed" />
                <span>Expandable</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-slate-700/50 border border-slate-600/30" />
                <span>Locked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-yellow-500/30 border border-yellow-400/50 flex items-center justify-center text-[8px] font-bold text-yellow-300">1</div>
                <span>Expansion Step</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <ExpansionOptimizer />

          {/* Help Card */}
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-200 mb-2">How it works</h3>
            <ul className="text-xs text-slate-400 space-y-2">
              <li className="flex gap-2">
                <span className="text-emerald-400">1.</span>
                <span>Click cells to unlock or lock them</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400">2.</span>
                <span>You can only unlock cells adjacent to already unlocked cells</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400">3.</span>
                <span>Use the Expansion Optimizer to find the best order to unlock remaining cells by maximum possible Gloomgourd spawns</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400">4.</span>
                <span>Go to Calculator tab to solve for optimal crop placement</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
