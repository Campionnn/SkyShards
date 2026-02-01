import React, { useEffect, useRef } from "react";
import { X, RotateCcw, CheckSquare } from "lucide-react";
import { useGridState } from "../../context";
import { GridManager } from "./GridManager";
import { ExpansionOptimizer } from "./ExpansionOptimizer";

interface GridManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GridManagerModal: React.FC<GridManagerModalProps> = ({ isOpen, onClose }) => {
  const { unlockedCells, selectAll, resetToDefault } = useGridState();
  const modalRef = useRef<HTMLDivElement>(null);

  const unlockedCount = unlockedCells.size;
  const totalCells = 100;

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] my-auto overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-100">Grid Manager</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
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
                    <span>Click cells to unlock or lock them, or click and drag to paint multiple cells at once</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-400">2.</span>
                    <span>Use the Expansion Optimizer to find the best order to unlock remaining cells by maximum possible Gloomgourd spawns</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-400">3.</span>
                    <span>Close this popup to return to the Calculator and solve for optimal crop placement</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
