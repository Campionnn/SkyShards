import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ClipboardCopy } from "lucide-react";

interface CopyTreeModalProps {
  open: boolean;
  onClose: () => void;
  onCopySkyOcean: () => void;
  onCopyNoFrills: () => void;
  onCopySkyHanni: () => void;
  materialsOnly?: boolean;
}

export const CopyTreeModal: React.FC<CopyTreeModalProps> = ({ open, onClose, onCopySkyOcean, onCopyNoFrills, onCopySkyHanni, materialsOnly = false }) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "unset";
      };
    }
  }, [open]);

  if (!open) return null;

  const handleCopySkyOcean = () => {
    onCopySkyOcean();
    onClose();
  };

  const handleCopyNoFrills = () => {
    onCopyNoFrills();
    onClose();
  };

  const handleCopySkyHanni = () => {
    onCopySkyHanni();
    onClose();
  };

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
              <ClipboardCopy className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">{materialsOnly ? "Copy Materials" : "Copy Fusion Tree"}</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer" aria-label="Close">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          <div className="mb-4">
            <p className="text-slate-300">
              {materialsOnly
                ? "Copy your materials list to paste into a mod for tracking."
                : "Choose the format you want to copy. You can paste it into the respective mod or share with others."}
            </p>
            <div className="text-xs text-slate-400">JSONs are Gzipped + base64 encoded strings</div>
          </div>

          <div className="space-y-3">
            {!materialsOnly && (
              <>
                <button
                    type="button"
                    onClick={handleCopySkyOcean}
                    className="w-full p-3 rounded-lg border text-left transition-all duration-200 bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50 hover:border-slate-500 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">SkyOcean format</div>
                      <div className="text-xs text-blue-400 hover:underline">
                        <a
                            href="https://modrinth.com/mod/skyocean"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                        >
                          Download SkyOcean
                        </a>
                      </div>
                    </div>
                    <span className="px-1 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md">Shard Tracker + Fusion Helper</span>
                  </div>
                </button>

                <button
                    type="button"
                    onClick={handleCopyNoFrills}
                    className="w-full p-3 rounded-lg border text-left transition-all duration-200 bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50 hover:border-slate-500 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">NoFrills format</div>
                      <div className="text-xs text-blue-400 hover:underline">
                        <a
                          href="https://modrinth.com/mod/nofrills"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          Download NoFrills
                        </a>
                      </div>
                    </div>
                    <span className="px-1 py-0.5 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md">Shard Tracker</span>
                  </div>
                </button>
              </>
            )}

            <button
                type="button"
                onClick={handleCopySkyHanni}
                className="w-full p-3 rounded-lg border text-left transition-all duration-200 bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50 hover:border-slate-500 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">SkyHanni format</div>
                  <div className="text-xs text-blue-400 hover:underline">
                    <a
                      href="https://modrinth.com/mod/skyhanni"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      Download SkyHanni
                    </a>
                  </div>
                </div>
                <span className="px-1 py-0.5 text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-md">Shard Tracker (Only Direct)</span>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center justify-end gap-3 text-sm">
            <button onClick={onClose} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md cursor-pointer">Close</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
