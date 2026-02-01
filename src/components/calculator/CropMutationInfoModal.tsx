import React, { useEffect, useRef, useMemo } from "react";
import {
  X,
  AlertTriangle,
  Loader2,
  Box,
  ClockArrowUp, Flame, Target, PackageOpen, ClockArrowDown, WandSparkles
} from "lucide-react";
import { getGroundImagePath } from "../../types/greenhouse";
import { CropImage } from "../shared";
import { useInfoModal, getEffectDescription } from "../../context";
import { MutationRequirementGrid } from "../ui";
import type { CropDataJSON, MutationDataJSON } from "../../services/greenhouseDataService";

// =============================================================================
// Helper Functions
// =============================================================================

// Format buff/crop name for display
function formatName(name: string): string {
  return name
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

// =============================================================================
// Main Component
// =============================================================================

export const CropMutationInfoModal: React.FC = () => {
  const modalRef = useRef<HTMLDivElement>(null);
  const {
    isOpen,
    isLoading,
    error,
    cropData,
    mutationData,
    effectsMap,
    allData,
    closeInfo,
  } = useInfoModal();

  // Determine what we're displaying
  const isMutation = !!mutationData;
  const data = mutationData || cropData;

  // Build crop data map for requirement grid
  const cropDataMap = useMemo(() => {
    if (!allData) return {};
    const map: Record<string, CropDataJSON | MutationDataJSON> = {};
    
    // Add all crops
    for (const [id, crop] of Object.entries(allData.crops)) {
      map[id] = crop;
    }
    
    // Add all mutations (some requirements use mutations)
    for (const [id, mutation] of Object.entries(allData.mutations)) {
      map[id] = mutation;
    }
    
    return map;
  }, [allData]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeInfo();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, closeInfo]);

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
      closeInfo();
    }
  };

  if (!isOpen) return null;

  // Loading state
  if (isLoading) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <div
          ref={modalRef}
          className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg p-8"
        >
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <span className="text-slate-300">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <div
          ref={modalRef}
          className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-100">Error</h2>
            <button
              onClick={closeInfo}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-rose-400">{error || "Item not found"}</p>
        </div>
      </div>
    );
  }

  // Extract common fields
  const id = isMutation ? mutationData!.id : cropData!.id;
  const name = data.name;
  const size = data.size;
  const ground = data.ground;
  const growthStages = data.growth_stages;
  const positiveBuffs = data.positive_buffs;
  const negativeBuffs = data.negative_buffs;

  // Mutation-specific fields
  const rarity = isMutation ? mutationData!.rarity : null;
  const requirements = isMutation ? mutationData!.requirements : [];
  const special = isMutation ? mutationData!.special : null;
  const decay = isMutation ? mutationData!.decay : null;
  const drops = isMutation ? mutationData!.drops : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-h-[85vh] overflow-hidden flex flex-col ${
          isMutation && (requirements.length > 0 || (drops && Object.keys(drops).length > 0)) ? "max-w-3xl" : "max-w-lg"
        }`}
      >
        {/* Modal Header */}
        <div className="flex-shrink-0 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
              <CropImage
                cropId={id}
                cropName={name}
                size="sm"
                showFallback={false}
              />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${rarity ? getRarityColor(rarity) : "text-slate-100"}`}>
                {name}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {size}x{size}
                </span>
                {rarity && (
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${getRarityBgColor(rarity)} ${getRarityColor(rarity)}`}>
                    {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={closeInfo}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className={`p-6 overflow-y-auto ${isMutation && (requirements.length > 0 || (drops && Object.keys(drops).length > 0)) ? "flex gap-6" : ""}`}>
          {/* Left Column - General Info */}
          <div className={`space-y-4 ${isMutation && (requirements.length > 0 || (drops && Object.keys(drops).length > 0)) ? "flex-1 min-w-0" : ""}`}>
            {/* Ground Type */}
            <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Box className="w-4 h-4 text-emerald-400" />
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

            {/* Growth Stages & Decay (side by side for mutations) */}
            {(growthStages !== null || (decay !== null && decay > 0)) && (
              <div className="flex gap-4">
                {growthStages !== null && (
                  <div className="flex-1 bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ClockArrowUp className="w-4 h-4 text-blue-400" />
                      <h3 className="text-sm font-medium text-slate-200">Growth Stages</h3>
                    </div>
                    <span className="text-sm text-slate-300">{growthStages} stage{growthStages !== 1 ? "s" : ""}</span>
                  </div>
                )}
                {decay !== null && decay > 0 && (
                  <div className="flex-1 bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ClockArrowDown className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-medium text-slate-200">Decay</h3>
                    </div>
                    <span className="text-sm text-slate-300">{decay} harvest{decay !== 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>
            )}

            {/* Special Conditions (Mutations Only) */}
            {isMutation && special && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <WandSparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-medium text-amber-200">Special Condition</h3>
                </div>
                <p className="text-sm text-amber-300/90">{formatName(special)}</p>
              </div>
            )}

            {/* Positive Buffs with Descriptions */}
            {positiveBuffs.length > 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-medium text-emerald-200">Positive Effects</h3>
                </div>
                <div className="space-y-2">
                  {positiveBuffs.map((buff, index) => {
                    const description = getEffectDescription(buff, effectsMap);
                    return (
                      <div key={index} className="space-y-0.5">
                        <span className="text-sm font-medium text-emerald-300">
                          {formatName(buff)}
                        </span>
                        {description && (
                          <p className="text-xs text-emerald-300/70">{description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Negative Buffs with Descriptions */}
            {negativeBuffs.length > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-medium text-rose-200">Negative Effects</h3>
                </div>
                <div className="space-y-2">
                  {negativeBuffs.map((buff, index) => {
                    const description = getEffectDescription(buff, effectsMap);
                    return (
                      <div key={index} className="space-y-0.5">
                        <span className="text-sm font-medium text-rose-300">
                          {formatName(buff)}
                        </span>
                        {description && (
                          <p className="text-xs text-rose-300/70">{description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Requirements & Drops (Mutations Only) */}
          {isMutation && (requirements.length > 0 || (drops && Object.keys(drops).length > 0)) && (
            <div className="w-72 flex-shrink-0 space-y-4">
              {/* Requirements Section */}
              {requirements.length > 0 && (
                <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-yellow-400" />
                    <h3 className="text-sm font-medium text-slate-200">Requirements</h3>
                  </div>
                  
                  {/* Mini Grid Layout - Full Width */}
                  <div className="w-full mb-4">
                    <MutationRequirementGrid
                      mutationId={id}
                      cropDataMap={cropDataMap}
                    />
                  </div>
                  
                  {/* Text List */}
                  <div className="space-y-1.5 border-t border-slate-600/30 pt-3">
                    {requirements.map((req, index) => {
                      const reqData = cropDataMap[req.crop];
                      const reqRarity = reqData && "rarity" in reqData ? reqData.rarity : null;
                      const reqColor = reqRarity ? getRarityColor(reqRarity) : "text-slate-300";
                      
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <CropImage
                            cropId={req.crop}
                            cropName={req.crop}
                            size="xs"
                            showFallback={false}
                          />
                          <span className={`text-sm ${reqColor}`}>
                            {req.count}x {formatName(req.crop)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Drops Section */}
              {drops && Object.keys(drops).length > 0 && (
                <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PackageOpen className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-medium text-slate-200">Drops</h3>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(drops).map(([item, amount]) => (
                      <div key={item} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CropImage
                            cropId={item}
                            cropName={item}
                            size="xs"
                            showFallback={false}
                          />
                          <span className="text-sm text-slate-300">{formatName(item)}</span>
                        </div>
                        <span className="text-sm text-slate-400">{amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
