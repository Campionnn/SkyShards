import React, { useEffect, useRef } from "react";
import { Grid3x3, Calculator, Palette } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FirstTimeVisitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigureGrid: () => void;
}

export const FirstTimeVisitorModal: React.FC<FirstTimeVisitorModalProps> = ({
  isOpen,
  onClose,
  onConfigureGrid,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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

  const handleConfigureGrid = () => {
    onConfigureGrid();
    onClose();
  };

  const handleGoToCalculator = () => {
    onClose();
  };

  const handleGoToDesigner = () => {
    navigate("/designer");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl"
      >
        {/* Modal Header */}
        <div className="border-b border-slate-700 px-6 py-5">
          <h2 className="text-2xl font-semibold text-slate-100 text-center">
            SkyShards Greenhouse Calculator!
          </h2>
          <p className="text-sm text-slate-400 mt-2 text-center">
            Choose how you'd like to get started
          </p>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Configure Grid Option */}
            <button
              onClick={handleConfigureGrid}
              className="group relative bg-slate-800/50 hover:bg-slate-800 border border-slate-600/50 hover:border-emerald-500/50 rounded-lg p-6 transition-all duration-200 cursor-pointer text-left"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                  <Grid3x3 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-200 mb-1">
                    Configure Grid
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Set up your unlocked greenhouse cells first
                  </p>
                </div>
              </div>
            </button>

            {/* Calculator Option */}
            <button
              onClick={handleGoToCalculator}
              className="group relative bg-slate-800/50 hover:bg-slate-800 border border-slate-600/50 hover:border-blue-500/50 rounded-lg p-6 transition-all duration-200 cursor-pointer text-left"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                  <Calculator className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-200 mb-1">
                    Calculator
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Calculate optimal greenhouse layouts
                  </p>
                </div>
              </div>
            </button>

            {/* Designer Option */}
            <button
              onClick={handleGoToDesigner}
              className="group relative bg-slate-800/50 hover:bg-slate-800 border border-slate-600/50 hover:border-purple-500/50 rounded-lg p-6 transition-all duration-200 cursor-pointer text-left"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                  <Palette className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-200 mb-1">
                    Designer
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Design custom greenhouse layouts
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
