import React, { useEffect, useRef } from "react";
import { X, Droplets, Sparkles, AlertTriangle, Leaf, Package, Star } from "lucide-react";
import type { CropDefinition, MutationDefinition } from "../../types/greenhouse";
import { getCropImagePath, getGroundImagePath } from "../../types/greenhouse";

interface CropMutationInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  crop?: CropDefinition;
  mutation?: MutationDefinition;
}

// Format buff name for display
function formatBuffName(buff: string): string {
  return buff
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Format ground type name
function formatGroundType(ground: string): string {
  return ground
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Get rarity color
function getRarityColor(rarity: string): string {
  switch (rarity.toLowerCase()) {
    case "common":
      return "text-slate-300";
    case "uncommon":
      return "text-green-400";
    case "rare":
      return "text-blue-400";
    case "epic":
      return "text-purple-400";
    case "legendary":
      return "text-yellow-400";
    default:
      return "text-slate-300";
  }
}

function getRarityBgColor(rarity: string): string {
  switch (rarity.toLowerCase()) {
    case "common":
      return "bg-slate-500/20 border-slate-500/30";
    case "uncommon":
      return "bg-green-500/20 border-green-500/30";
    case "rare":
      return "bg-blue-500/20 border-blue-500/30";
    case "epic":
      return "bg-purple-500/20 border-purple-500/30";
    case "legendary":
      return "bg-yellow-500/20 border-yellow-500/30";
    default:
      return "bg-slate-500/20 border-slate-500/30";
  }
}

export const CropMutationInfoModal: React.FC<CropMutationInfoModalProps> = ({
  isOpen,
  onClose,
  crop,
  mutation,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Use mutation data if available, fall back to crop
  const isMutation = !!mutation;
  const id = mutation?.id || crop?.id || "";
  const name = mutation?.name || crop?.name || "";
  const size = mutation?.size || crop?.size || 1;
  const ground = mutation?.ground || crop?.ground || "farmland";
  const growthStages = mutation?.growth_stages ?? crop?.growth_stages ?? null;
  const positiveBuffs = mutation?.positive_buffs || crop?.positive_buffs || [];
  const negativeBuffs = mutation?.negative_buffs || crop?.negative_buffs || [];
  
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

  if (!isOpen || (!crop && !mutation)) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden"
              style={{
                backgroundImage: `url(${getGroundImagePath(ground)})`,
                backgroundSize: "cover",
              }}
            >
              <img
                src={getCropImagePath(id)}
                alt={name}
                className="w-9 h-9 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">{name}</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {size}x{size}
                </span>
                {isMutation && mutation && (
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${getRarityBgColor(mutation.rarity)} ${getRarityColor(mutation.rarity)}`}>
                    {mutation.rarity.charAt(0).toUpperCase() + mutation.rarity.slice(1)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          {/* Ground Type */}
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-medium text-slate-200">Ground Type</h3>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded border border-slate-600"
                style={{
                  backgroundImage: `url(${getGroundImagePath(ground)})`,
                  backgroundSize: "cover",
                }}
              />
              <span className="text-sm text-slate-300">{formatGroundType(ground)}</span>
            </div>
          </div>

          {/* Growth Stages */}
          {growthStages !== null && growthStages > 0 && (
            <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-medium text-slate-200">Growth Stages</h3>
              </div>
              <span className="text-sm text-slate-300">{growthStages} stages</span>
            </div>
          )}

          {/* Requirements (Mutations Only) */}
          {isMutation && mutation && mutation.requirements.length > 0 && (
            <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-medium text-slate-200">Requirements</h3>
              </div>
              <div className="space-y-2">
                {mutation.requirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <img
                      src={getCropImagePath(req.crop)}
                      alt={req.crop}
                      className="w-6 h-6 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <span className="text-sm text-slate-300">
                      {req.count}x {formatBuffName(req.crop)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Special Conditions (Mutations Only) */}
          {isMutation && mutation && mutation.special && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-medium text-amber-200">Special Condition</h3>
              </div>
              <p className="text-sm text-amber-300/90">{mutation.special}</p>
            </div>
          )}

          {/* Positive Buffs */}
          {positiveBuffs.length > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-medium text-emerald-200">Positive Buffs</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {positiveBuffs.map((buff, index) => (
                  <span
                    key={index}
                    className="text-xs px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded text-emerald-300"
                  >
                    {formatBuffName(buff)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Negative Buffs */}
          {negativeBuffs.length > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-medium text-rose-200">Negative Buffs</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {negativeBuffs.map((buff, index) => (
                  <span
                    key={index}
                    className="text-xs px-2 py-1 bg-rose-500/20 border border-rose-500/30 rounded text-rose-300"
                  >
                    {formatBuffName(buff)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Drops (Mutations Only) */}
          {isMutation && mutation && mutation.drops && Object.keys(mutation.drops).length > 0 && (
            <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-medium text-slate-200">Drops</h3>
              </div>
              <div className="space-y-1">
                {Object.entries(mutation.drops).map(([item, amount]) => (
                  <div key={item} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{formatBuffName(item)}</span>
                    <span className="text-sm text-slate-400">{amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
