import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface GreenhouseModalProps {
  open: boolean;
  onClose: () => void;
}

const GREENHOUSE_URL = "https://greenhouse.skyshards.com";

export const GreenhouseModal: React.FC<GreenhouseModalProps> = ({ open, onClose }) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "unset";
      };
    }
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-md w-full overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">SkyShards - Greenhouse Release</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer" aria-label="Close">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          <div className="mb-4">
            <h3 className="text-base font-medium text-white mb-2">Check out SkyShards Greenhouse!</h3>
            <p className="text-slate-300">
              {/* User will fill in content here */}
              Visit greenhouse.skyshards.com for a greenhouse plot optimizer and designer with many features and helpful information about greenhouse and mutations!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors duration-200"
            >
              Close
            </button>
            <a
              href={GREENHOUSE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-md shadow focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-colors duration-200"
              onClick={onClose}
            >
              Visit Greenhouse
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
