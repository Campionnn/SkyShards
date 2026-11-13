import { useState } from "react";
import { Modal, ToggleSwitch } from "../ui";
import { X, ClipboardCopy } from "lucide-react";
import type { TreeExportOptions } from "../../types/types";
import { loadTreeExportOptions, saveTreeExportOptions } from "../../utilities";

interface CopyTreeModalProps {
  open: boolean;
  onClose: () => void;
  /** Leave out to hide the SkyOcean option (its tree format has no way to express inventory shards). */
  onCopySkyOcean?: () => void;
  onCopyNoFrills: (options: TreeExportOptions) => void;
  onCopySkyHanni: (options: TreeExportOptions) => void;
  materialsOnly?: boolean;
  /** Inventory results: offer the "count shards you already own" switch. */
  inventoryMode?: boolean;
}

export const CopyTreeModal = ({
  open,
  onClose,
  onCopySkyOcean,
  onCopyNoFrills,
  onCopySkyHanni,
  materialsOnly = false,
  inventoryMode = false,
}: CopyTreeModalProps) => {
  const [options, setOptions] = useState<TreeExportOptions>(loadTreeExportOptions);

  if (!open) return null;

  const setOption = (key: keyof TreeExportOptions, value: boolean) => {
    const next = { ...options, [key]: value };
    setOptions(next);
    saveTreeExportOptions(next);
  };

  // Options that don't apply here are passed as off, so they can't change the output unseen.
  const effectiveOptions: TreeExportOptions = {
    countOwned: inventoryMode && options.countOwned,
    includeFused: !materialsOnly && options.includeFused,
  };

  const handleCopySkyOcean = () => {
    onCopySkyOcean?.();
    onClose();
  };

  const handleCopyNoFrills = () => {
    onCopyNoFrills(effectiveOptions);
    onClose();
  };

  const handleCopySkyHanni = () => {
    onCopySkyHanni(effectiveOptions);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="copy-tree-title"
      panelClassName="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-md w-full overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCopy className="w-5 h-5 text-blue-400" />
            <h2 id="copy-tree-title" className="text-lg font-semibold text-white">
              {materialsOnly ? "Copy Materials" : "Copy Fusion Tree"}
            </h2>
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

        {(inventoryMode || !materialsOnly) && (
          <div className="mb-4 p-3 rounded-lg border border-slate-700 bg-slate-800/30 space-y-1">
            {inventoryMode && (
              <ToggleSwitch
                label="Count shards you already own"
                checked={options.countOwned}
                onChange={(value) => setOption("countOwned", value)}
                accent="purple"
                tooltip="On: amounts include the shards from your inventory, so a mod that counts what you own shows owned / total. Off: only what you still need to get."
              />
            )}
            {!materialsOnly && (
              <ToggleSwitch
                label="Include fused shards (SkyHanni)"
                checked={options.includeFused}
                onChange={(value) => setOption("includeFused", value)}
                accent="blue"
                tooltip="Also list the shards you fuse, including the target, so the tracker shows when you have fused enough. NoFrills always lists them."
              />
            )}
          </div>
        )}

        <div className="space-y-3">
          {!materialsOnly && onCopySkyOcean && (
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
                <span className="px-1 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md">
                  Shard Tracker + Fusion Helper
                </span>
              </div>
            </button>
          )}

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
              <span className="px-1 py-0.5 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md">
                {materialsOnly ? "Shard Tracker (Only Direct)" : "Shard Tracker"}
              </span>
            </div>
          </button>

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
          <button onClick={onClose} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
