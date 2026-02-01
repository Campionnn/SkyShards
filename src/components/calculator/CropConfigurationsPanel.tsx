import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Brush, X, ChevronDown, Lock, Trash2, AlertTriangle, Info, ChevronUp } from "lucide-react";
import { useGreenhouseData, useLockedPlacements, useInfoModal } from "../../context";
import { getRarityTextColor } from "../../utilities";
import { CropImage, SearchFilterHeader } from "../shared";
import { useCropFiltering } from "../../hooks/shared/useCropFiltering";
import type { CropDefinition, MutationDefinition, SelectedCropForPlacement } from "../../types/greenhouse";

interface CropConfigurationsPanelProps {
  className?: string;
}

// Item row for a single crop/mutation
const CropItemRow: React.FC<{
  crop: CropDefinition;
  mutation?: MutationDefinition;
  priority: number;
  isPlacementActive: boolean;
  onInfoClick: () => void;
  onEditClick: () => void;
  onPriorityChange: (value: number) => void;
  onRowClick?: () => void;
}> = ({
  crop,
  mutation,
  priority,
  isPlacementActive,
  onInfoClick,
  onEditClick,
  onPriorityChange,
  onRowClick,
}) => {
  const [inputValue, setInputValue] = useState<string>("");
  
  // Get the rarity color for the name
  const nameColorClass = mutation ? getRarityTextColor(mutation.rarity) : "text-white";
  
  const handlePriorityChange = (value: string) => {
    setInputValue(value);
    if (value === "") {
      onPriorityChange(0);
      return;
    }
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      onPriorityChange(numValue);
    }
  };
  
  const handlePriorityBlur = () => {
    setInputValue("");
  };
  
  const incrementPriority = () => {
    const newValue = Math.min(100, priority + 1);
    onPriorityChange(newValue);
  };
  
  const decrementPriority = () => {
    const newValue = Math.max(0, priority - 1);
    onPriorityChange(newValue);
  };
  
  return (
    <div
      onClick={onRowClick}
      className={`bg-slate-800/40 border rounded-lg h-14 px-3 transition-colors flex items-center gap-2 ${
        isPlacementActive
          ? "border-yellow-500/50 bg-yellow-500/10"
          : "border-slate-600/30 hover:border-slate-500/50"
      } ${onRowClick && mutation ? "cursor-pointer" : ""}`}
    >
      {/* Image */}
      <CropImage
        cropId={crop.id}
        cropName={crop.name}
        size="sm"
        className="w-10 h-10 flex-shrink-0 bg-slate-700/50 rounded overflow-hidden"
        imageClassName="w-8 h-8"
        fallbackClassName="text-xs text-slate-400"
      />
      
      {/* Name, Size, and Type */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={`text-sm font-medium truncate ${nameColorClass}`}>
          {crop.name}
        </span>
      </div>
      
      {/* Buttons - Larger touch targets */}
      <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Info Button */}
        <button
          onClick={onInfoClick}
          className="p-2.5 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-blue-400"
          title="View details"
        >
          <Info className="w-5 h-5" />
        </button>
        
        {/* Edit Button */}
        <button
          onClick={onEditClick}
          className={`p-2.5 rounded-lg transition-colors flex items-center gap-1 ${
            isPlacementActive
              ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
              : "hover:bg-slate-700/50 text-slate-400 hover:text-emerald-400"
          }`}
          title={isPlacementActive ? "Cancel placement" : "Place on grid"}
        >
          {isPlacementActive ? (
            <X className="w-5 h-5" />
          ) : (
            <Brush className="w-5 h-5" />
          )}
        </button>
      </div>
      
      {/* Priority Input - Stacked */}
      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-0.5">
          <span 
            className="text-[10px] text-slate-500 leading-none"
            title="Higher priority = use less of this crop (0 = no preference, 100 = avoid)"
          >
            Priority
          </span>
          <input
            type="number"
            min={0}
            max={100}
            value={inputValue !== "" ? inputValue : ""}
            placeholder={priority.toString()}
            onChange={(e) => handlePriorityChange(e.target.value)}
            onBlur={handlePriorityBlur}
            className="w-12 px-1 py-0.5 bg-slate-700/50 border border-slate-600/30 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 text-center"
          />
        </div>
        <div className="flex flex-col">
          <button
            onClick={incrementPriority}
            className="p-0.5 hover:bg-slate-600/50 rounded-t text-slate-400 hover:text-slate-200 transition-colors"
            title="Increase priority"
          >
            <ChevronUp className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={decrementPriority}
            className="p-0.5 hover:bg-slate-600/50 rounded-b text-slate-400 hover:text-slate-200 transition-colors"
            title="Decrease priority"
          >
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
        </div>
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
  return (
    <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md px-2 py-1">
      <CropImage
        cropId={placement.crop}
        cropName={cropName}
        size="xs"
        className="w-6 h-6 flex-shrink-0"
        imageClassName="w-5 h-5"
        fallbackText=""
        showFallback={false}
      />
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
  const { crops, getCropDef, getMutationDef, addMutation } = useGreenhouseData();
  const {
    lockedPlacements,
    selectedCropForPlacement,
    setSelectedCropForPlacement,
    removeLockedPlacement,
    clearLockedPlacements,
    setPriority,
    getPriority,
    priorities,
    defaultPriorities,
  } = useLockedPlacements();
  
  const { openInfo } = useInfoModal();
  const [priorityWarningDismissed, setPriorityWarningDismissed] = useState(false);
  
  // Use shared filtering hook
  const { searchTerm, setSearchTerm, filter, setFilter, filteredCrops } = useCropFiltering({
    crops,
    mutations: [], // Not needed since we use getMutationDef from context
  });
  
  // Check if any priorities differ from defaults
  const hasPriorities = useMemo(() => {
    return Object.keys(priorities).some((cropId) => {
      const currentPriority = priorities[cropId] || 0;
      const defaultPriority = defaultPriorities[cropId] || 0;
      return currentPriority !== defaultPriority;
    });
  }, [priorities, defaultPriorities]);
  
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
  
  // Handle info button click
  const handleInfoClick = useCallback((crop: CropDefinition) => {
    openInfo(crop.id);
  }, [openInfo]);
  
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
  
  // Handle clicking on a mutation row to add it to targets
  const handleMutationRowClick = useCallback((crop: CropDefinition) => {
    if (crop.isMutation) {
      addMutation(crop.id, crop.name);
    }
  }, [addMutation]);
  
  return (
    <div className={`flex flex-col h-full gap-4 ${className}`}>
      {/* Main Panel - Crop Configurations */}
      <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4 flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <h3 className="text-sm font-medium text-slate-200">Crop Configurations</h3>
          <button
            onClick={() => {
              Object.keys(priorities).forEach((cropId) => {
                setPriority(cropId, defaultPriorities[cropId] || 0);
              });
            }}
            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            title="Reset all priorities to defaults"
          >
            Reset Priorities
          </button>
        </div>
        
        {/* Search and Filter Row */}
        <SearchFilterHeader
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filter={filter}
          onFilterChange={setFilter}
          className="mb-3 flex-shrink-0"
        />
        
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
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 scrollbar-dark">
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
                  onRowClick={crop.isMutation ? () => handleMutationRowClick(crop) : undefined}
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
          <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-dark">
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
    </div>
  );
};
