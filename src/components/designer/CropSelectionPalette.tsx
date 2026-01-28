import React, { useState, useMemo, useCallback } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { useGreenhouseData, useDesigner } from "../../context";
import { getRarityTextColor, getRarityBorderColor } from "../../utilities";
import type { CropDefinition, MutationDefinition, CropFilterCategory } from "../../types/greenhouse";
import { getCropImagePath } from "../../types/greenhouse";

interface CropSelectionPaletteProps {
  className?: string;
}

// Filter options for the dropdown
const FILTER_OPTIONS: { value: CropFilterCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "crops", label: "Crops/Miscellaneous" },
  { value: "mutations", label: "Mutations" },
  { value: "common", label: "Common" },
  { value: "uncommon", label: "Uncommon" },
  { value: "rare", label: "Rare" },
  { value: "epic", label: "Epic" },
  { value: "legendary", label: "Legendary" },
];

// Helper to get color for filter option
const getFilterColor = (value: CropFilterCategory): string => {
  switch (value) {
    case "common": return "text-white";
    case "uncommon": return "text-green-400";
    case "rare": return "text-blue-400";
    case "epic": return "text-purple-400";
    case "legendary": return "text-yellow-400";
    default: return "text-slate-300";
  }
};

// Single crop/mutation tile in the palette grid
const PaletteTile: React.FC<{
  crop: CropDefinition;
  mutation?: MutationDefinition;
  isSelected: boolean;
  onClick: () => void;
}> = ({ crop, mutation, isSelected, onClick }) => {
  const [imageError, setImageError] = useState(false);
  
  const rarityBorder = mutation ? getRarityBorderColor(mutation.rarity) : "border-slate-600/50";
  const rarityText = mutation ? getRarityTextColor(mutation.rarity) : "text-white";
  
  return (
    <button
      onClick={onClick}
      className={`
        relative aspect-square rounded-lg border-2 transition-all duration-150 cursor-pointer
        flex flex-col items-center justify-center p-1 gap-0.5
        hover:scale-105 hover:z-10
        ${isSelected 
          ? "ring-2 ring-yellow-400 border-yellow-400 bg-yellow-500/20" 
          : `${rarityBorder} bg-slate-800/60 hover:bg-slate-700/60`
        }
      `}
      title={`${crop.name} (${crop.size}x${crop.size})`}
    >
      {/* Crop Image */}
      <div className="w-12 h-12 flex items-center justify-center">
        {!imageError ? (
          <img
            src={getCropImagePath(crop.id)}
            alt={crop.name}
            className="w-full h-full object-contain"
            onError={() => setImageError(true)}
            draggable={false}
          />
        ) : (
          <span className="text-xs text-slate-400">{crop.name.slice(0, 2)}</span>
        )}
      </div>
      
      {/* Crop Name (truncated) */}
      <span className={`text-[10px] leading-tight truncate w-full text-center ${rarityText}`}>
        {crop.name}
      </span>
      
      {/* Size indicator */}
      <span className="absolute top-0.5 right-0.5 text-[9px] text-slate-400 bg-slate-900/80 px-1 rounded">
        {crop.size}x{crop.size}
      </span>
    </button>
  );
};

export const CropSelectionPalette: React.FC<CropSelectionPaletteProps> = ({ className = "" }) => {
  const { crops, mutations } = useGreenhouseData();
  const { selectedCropForPlacement, setSelectedCropForPlacement, mode } = useDesigner();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<CropFilterCategory>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Get mutation definition for a crop ID (if it's a mutation)
  const getMutationDef = useCallback((cropId: string): MutationDefinition | undefined => {
    return mutations.find(m => m.id === cropId);
  }, [mutations]);
  
  // Filter and search crops
  const filteredItems = useMemo(() => {
    let items = crops;
    
    // When placing targets, only show mutations
    if (mode === "targets") {
      items = items.filter(c => c.isMutation);
    }
    
    // Apply category filter
    switch (filter) {
      case "crops":
        items = items.filter(c => !c.isMutation);
        break;
      case "mutations":
        items = items.filter(c => c.isMutation);
        break;
      case "common":
      case "uncommon":
      case "rare":
      case "epic":
      case "legendary":
        items = items.filter(c => {
          const mut = getMutationDef(c.id);
          return mut && mut.rarity === filter;
        });
        break;
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      items = items.filter(c => c.name.toLowerCase().includes(term));
    }
    
    // No sorting - preserve data.json order
    return items;
  }, [crops, mode, filter, searchTerm, getMutationDef]);
  
  // Handle tile click
  const handleTileClick = useCallback((crop: CropDefinition) => {
    if (selectedCropForPlacement?.id === crop.id) {
      // Deselect if already selected
      setSelectedCropForPlacement(null);
    } else {
      // Select for placement
      setSelectedCropForPlacement({
        id: crop.id,
        name: crop.name,
        size: crop.size,
        isMutation: crop.isMutation ?? false,
      });
    }
  }, [selectedCropForPlacement, setSelectedCropForPlacement]);
  
  // Get current filter label
  const currentFilterLabel = FILTER_OPTIONS.find(o => o.value === filter)?.label || "All";
  
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-300">
          {mode === "inputs" ? "Select Input Crops" : "Select Target Mutations"}
        </h3>
        {selectedCropForPlacement && (
          <button
            onClick={() => setSelectedCropForPlacement(null)}
            className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Cancel
          </button>
        )}
      </div>
      
      {/* Search and Filter Row */}
      <div className="flex gap-2 mb-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800/60 border border-slate-600/50 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        {/* Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/60 border border-slate-600/50 rounded-lg text-sm text-slate-300 hover:border-slate-500/50"
          >
            {currentFilterLabel}
            <ChevronDown className={`w-4 h-4 transition-transform ${isFilterOpen ? "rotate-180" : ""}`} />
          </button>
          
          {isFilterOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsFilterOpen(false)} 
              />
              <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-600/50 rounded-lg shadow-xl z-20 py-1 min-w-[140px]">
                {FILTER_OPTIONS.map((option, index) => (
                  <React.Fragment key={option.value}>
                    {/* Separator after "Mutations" (index 2) */}
                    {index === 3 && (
                      <div className="border-t border-slate-600/50 my-1" />
                    )}
                    <button
                      onClick={() => {
                        setFilter(option.value);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-700/50 ${
                        filter === option.value ? "text-emerald-400" : getFilterColor(option.value)
                      }`}
                    >
                      {option.label}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Palette Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-5 gap-1.5">
          {filteredItems.map((crop, index) => {
            // Check if we should show a rarity separator before this item
            const prevMutation = index > 0 ? getMutationDef(filteredItems[index - 1].id) : null;
            const currMutation = getMutationDef(crop.id);
            const showSeparator = prevMutation && currMutation && 
                                  prevMutation.rarity !== currMutation.rarity;
            
            return (
              <React.Fragment key={crop.id}>
                {showSeparator && (
                  <div className="col-span-5 border-t border-slate-600/50 my-1" />
                )}
                <PaletteTile
                  crop={crop}
                  mutation={currMutation}
                  isSelected={selectedCropForPlacement?.id === crop.id}
                  onClick={() => handleTileClick(crop)}
                />
              </React.Fragment>
            );
          })}
        </div>
        
        {filteredItems.length === 0 && (
          <div className="text-center text-slate-400 py-8 text-sm">
            No items found
          </div>
        )}
      </div>
      
      {/* Count */}
      <div className="mt-2 text-xs text-slate-500 text-center">
        {filteredItems.length} items
      </div>
    </div>
  );
};
