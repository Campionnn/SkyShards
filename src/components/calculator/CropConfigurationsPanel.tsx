import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Pencil, X, ChevronDown, Lock, Trash2, AlertTriangle } from "lucide-react";
import { useGreenhouseData, useLockedPlacements } from "../../context";
import { CropMutationInfoModal } from "./CropMutationInfoModal";
import { getRarityTextColor } from "../../utilities";
import type { CropDefinition, MutationDefinition, CropFilterCategory, SelectedCropForPlacement } from "../../types/greenhouse";
import { getCropImagePath } from "../../types/greenhouse";

interface CropConfigurationsPanelProps {
  className?: string;
}

// Filter options for the dropdown
const FILTER_OPTIONS: { value: CropFilterCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "crops", label: "Crops" },
  { value: "mutations", label: "Mutations" },
  { value: "common", label: "Common Mutations" },
  { value: "uncommon", label: "Uncommon Mutations" },
  { value: "rare", label: "Rare Mutations" },
  { value: "epic", label: "Epic Mutations" },
  { value: "legendary", label: "Legendary Mutations" },
];

// Item row for a single crop/mutation
const CropItemRow: React.FC<{
  crop: CropDefinition;
  mutation?: MutationDefinition;
  priority: number;
  isPlacementActive: boolean;
  onInfoClick: () => void;
  onEditClick: () => void;
  onPriorityChange: (value: number) => void;
}> = ({
  crop,
  mutation,
  priority,
  isPlacementActive,
  // onInfoClick,
  onEditClick,
  onPriorityChange,
}) => {
  const [imageError, setImageError] = useState(false);
  
  // Get the rarity color for the name
  const nameColorClass = mutation ? getRarityTextColor(mutation.rarity) : "text-white";
  
  return (
    <div
      className={`bg-slate-800/40 border rounded-lg h-16 px-3 transition-colors flex items-center gap-2 ${
        isPlacementActive
          ? "border-yellow-500/50 bg-yellow-500/10"
          : "border-slate-600/30 hover:border-slate-500/50"
      }`}
    >
      {/* Image */}
      <div className="w-12 h-12 flex-shrink-0 bg-slate-700/50 rounded flex items-center justify-center overflow-hidden">
        {!imageError ? (
          <img
            src={getCropImagePath(crop.id)}
            alt={crop.name}
            className="w-10 h-10 object-contain"
            onError={() => setImageError(true)}
            draggable={false}
          />
        ) : (
          <span className="text-xs text-slate-400">{crop.name.slice(0, 2)}</span>
        )}
      </div>
      
      {/* Name, Size, and Type */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={`text-sm font-medium truncate ${nameColorClass}`}>
          {crop.name}
        </span>
      </div>
      
      {/* Buttons with reduced spacing */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Info Button */}
        {/*<button*/}
        {/*  onClick={onInfoClick}*/}
        {/*  className="p-1.5 hover:bg-slate-700/50 rounded transition-colors text-slate-400 hover:text-blue-400"*/}
        {/*  title="View details"*/}
        {/*>*/}
        {/*  <Info className="w-4 h-4" />*/}
        {/*</button>*/}
        
        {/* Edit Button */}
        <button
          onClick={onEditClick}
          className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
            isPlacementActive
              ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
              : "hover:bg-slate-700/50 text-slate-400 hover:text-emerald-400"
          }`}
          title={isPlacementActive ? "Cancel placement" : "Place on grid"}
        >
          {isPlacementActive ? (
            <X className="w-4 h-4" />
          ) : (
            <Pencil className="w-4 h-4" />
          )}
        </button>
      </div>
      
      {/* Priority Input */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-xs text-slate-500">Priority:</span>
        <input
          type="number"
          min={0}
          max={100}
          value={priority}
          onChange={(e) => {
            const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
            onPriorityChange(val);
          }}
          className="w-14 px-2 py-1 bg-slate-700/50 border border-slate-600/30 rounded text-xs text-slate-200 focus:outline-none focus:border-blue-500/50 text-center"
          title="Higher priority = use less of this crop (0 = no preference, 100 = avoid)"
        />
      </div>
    </div>
  );
};

// Locked placement item in the list
const LockedPlacementItem: React.FC<{
  placement: { id: string; crop: string; position: [number, number]; size: number };
  cropName: string;
  onRemove: () => void;
}> = ({ placement, cropName, onRemove }) => {
  const [imageError, setImageError] = useState(false);
  
  return (
    <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md px-2 py-1">
      <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
        {!imageError ? (
          <img
            src={getCropImagePath(placement.crop)}
            alt={cropName}
            className="w-5 h-5 object-contain"
            onError={() => setImageError(true)}
            draggable={false}
          />
        ) : (
          <Lock className="w-4 h-4 text-yellow-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs text-slate-200 truncate">{cropName}</span>
        <span className="text-xs text-slate-500 ml-1">
          @ ({placement.position[0]}, {placement.position[1]})
        </span>
      </div>
      <button
        onClick={onRemove}
        className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors"
        title="Remove locked placement"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const CropConfigurationsPanel: React.FC<CropConfigurationsPanelProps> = ({
  className = "",
}) => {
  const { crops, getCropDef, getMutationDef } = useGreenhouseData();
  const {
    lockedPlacements,
    selectedCropForPlacement,
    setSelectedCropForPlacement,
    removeLockedPlacement,
    clearLockedPlacements,
    setPriority,
    getPriority,
    priorities,
  } = useLockedPlacements();
  
  const [filter, setFilter] = useState<CropFilterCategory>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [infoModal, setInfoModal] = useState<{
    crop?: CropDefinition;
    mutation?: MutationDefinition;
  } | null>(null);
  const [priorityWarningDismissed, setPriorityWarningDismissed] = useState(false);
  
  // Check if any priorities are set
  const hasPriorities = useMemo(() => {
    return Object.values(priorities).some((p) => p !== 0);
  }, [priorities]);
  
  // Listen for Escape key to cancel placement mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedCropForPlacement) {
        setSelectedCropForPlacement(null);
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedCropForPlacement, setSelectedCropForPlacement]);
  
  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Filter crops based on selected category
  const filteredCrops = useMemo(() => {
    if (filter === "all") return crops;
    
    if (filter === "crops") {
      return crops.filter(c => !c.isMutation);
    }
    
    if (filter === "mutations") {
      return crops.filter(c => c.isMutation);
    }
    
    // Rarity filters - only show mutations with matching rarity
    return crops.filter(c => {
      if (!c.isMutation) return false;
      const mutation = getMutationDef(c.id);
      return mutation?.rarity.toLowerCase() === filter.toLowerCase();
    });
  }, [crops, filter, getMutationDef]);
  
  // Handle info button click
  const handleInfoClick = useCallback((crop: CropDefinition) => {
    const mutation = crop.isMutation ? getMutationDef(crop.id) : undefined;
    setInfoModal({ crop, mutation });
  }, [getMutationDef]);
  
  // Handle edit button click (toggle placement mode)
  const handleEditClick = useCallback((crop: CropDefinition) => {
    if (selectedCropForPlacement?.id === crop.id) {
      // Toggle off
      setSelectedCropForPlacement(null);
    } else {
      // Select this crop for placement
      const selection: SelectedCropForPlacement = {
        id: crop.id,
        name: crop.name,
        size: crop.size,
        ground: crop.ground,
      };
      setSelectedCropForPlacement(selection);
    }
  }, [selectedCropForPlacement, setSelectedCropForPlacement]);
  
  // Get display name for locked placement
  const getLockedPlacementName = useCallback((cropId: string): string => {
    const def = getCropDef(cropId);
    if (def) return def.name;
    const mutDef = getMutationDef(cropId);
    if (mutDef) return mutDef.name;
    return cropId;
  }, [getCropDef, getMutationDef]);
  
  // Get current filter label
  const currentFilterLabel = FILTER_OPTIONS.find(opt => opt.value === filter)?.label || "All";
  
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Main Panel - Crop Configurations */}
      <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-200">Crop Configurations</h3>
        </div>
        
        {/* Filter Dropdown - Styled like MutationAutocomplete */}
        <div className="relative mb-3" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/30 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 hover:bg-slate-700/70 transition-colors flex items-center justify-between"
          >
            <span>{currentFilterLabel}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isFilterOpen ? "rotate-180" : ""}`} />
          </button>
          
          {isFilterOpen && (
            <ul className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600/50 rounded-md shadow-xl max-h-60 overflow-y-auto">
              {FILTER_OPTIONS.map((option) => (
                <li
                  key={option.value}
                  onClick={() => {
                    setFilter(option.value);
                    setIsFilterOpen(false);
                  }}
                  className={`px-3 py-2 cursor-pointer transition-colors ${
                    filter === option.value
                      ? "bg-emerald-600/30 text-slate-100"
                      : "text-slate-300 hover:bg-slate-700/50"
                  }`}
                >
                  {option.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Priority Warning - dismissible, once per session */}
        {hasPriorities && !priorityWarningDismissed && (
          <div className="flex items-start gap-2 p-2 mb-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300/90 flex-1">
              Setting priorities reduces solver cache efficiency and may increase solve times.
            </p>
            <button
              onClick={() => setPriorityWarningDismissed(true)}
              className="p-0.5 hover:bg-amber-500/20 rounded text-amber-400/70 hover:text-amber-400 transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        
        {/* Crops List - Constrained height */}
        <div className="overflow-y-auto space-y-2 max-h-[400px]">
          {filteredCrops.length === 0 ? (
            <div className="text-center py-4 text-sm text-slate-500">
              No items match the filter
            </div>
          ) : (
            filteredCrops.map((crop) => {
              const mutation = crop.isMutation ? getMutationDef(crop.id) : undefined;
              const isActive = selectedCropForPlacement?.id === crop.id;
              const priority = getPriority(crop.id);
              
              return (
                <CropItemRow
                  key={crop.id}
                  crop={crop}
                  mutation={mutation}
                  priority={priority}
                  isPlacementActive={isActive}
                  onInfoClick={() => handleInfoClick(crop)}
                  onEditClick={() => handleEditClick(crop)}
                  onPriorityChange={(val) => setPriority(crop.id, val)}
                />
              );
            })
          )}
        </div>
      </div>
      
      {/* Locked Placements Summary - Separate panel below */}
      {lockedPlacements.length > 0 && (
        <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-slate-200">
                Locked Placements ({lockedPlacements.length})
              </span>
            </div>
            <button
              onClick={clearLockedPlacements}
              className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors"
              title="Clear all locked placements"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {lockedPlacements.map((placement) => (
              <LockedPlacementItem
                key={placement.id}
                placement={placement}
                cropName={getLockedPlacementName(placement.crop)}
                onRemove={() => removeLockedPlacement(placement.id)}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Info Modal */}
      <CropMutationInfoModal
        isOpen={!!infoModal}
        onClose={() => setInfoModal(null)}
        crop={infoModal?.crop}
        mutation={infoModal?.mutation}
      />
    </div>
  );
};
