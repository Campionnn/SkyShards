import React, { useCallback } from "react";
import { X } from "lucide-react";
import { useGreenhouseData, useDesigner } from "../../context";
import { getRarityTextColor, getRarityBorderColor } from "../../utilities";
import { CropImage, SearchFilterHeader } from "../shared";
import { useCropFiltering } from "../../hooks/shared/useCropFiltering";
import type { CropDefinition, MutationDefinition } from "../../types/greenhouse";

interface CropSelectionPaletteProps {
  className?: string;
}

// Single crop/mutation tile in the palette grid
const PaletteTile: React.FC<{
  crop: CropDefinition;
  mutation?: MutationDefinition;
  isSelected: boolean;
  onClick: () => void;
}> = ({ crop, mutation, isSelected, onClick }) => {
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
      <CropImage
        cropId={crop.id}
        cropName={crop.name}
        size="sm"
        className="w-12 h-12"
        fallbackClassName="text-xs text-slate-400"
      />
      
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
  
  // Use shared filtering hook with mode-based additional filter
  const additionalFilter = mode === "targets" ? (crop: CropDefinition) => crop.isMutation ?? false : undefined;
  const { searchTerm, setSearchTerm, filter, setFilter, filteredCrops, getMutationDef } = useCropFiltering({
    crops,
    mutations,
    additionalFilter,
  });
  
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
      <SearchFilterHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filter={filter}
        onFilterChange={setFilter}
        className="mb-3"
      />
      
      {/* Palette Grid */}
      <div className="flex-1 overflow-y-auto overflow-x-visible">
        <div className="grid grid-cols-5 gap-1.5 p-1">
          {filteredCrops.map((crop, index) => {
            // Check if we should show a rarity separator before this item
            const prevMutation = index > 0 ? getMutationDef(filteredCrops[index - 1].id) : null;
            const currMutation = getMutationDef(crop.id);
            const showRaritySeparator = prevMutation && currMutation && 
                                  prevMutation.rarity !== currMutation.rarity;
            
            // Check if we should show a crop/mutation divider
            const prevItem = index > 0 ? filteredCrops[index - 1] : null;
            const showCropMutationDivider = prevItem && !prevItem.isMutation && crop.isMutation;
            
            return (
              <React.Fragment key={crop.id}>
                {showCropMutationDivider && (
                  <div className="col-span-5 border-t border-slate-600/50 my-2">
                  </div>
                )}
                {showRaritySeparator && (
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
        
        {filteredCrops.length === 0 && (
          <div className="text-center text-slate-400 py-8 text-sm">
            No items found
          </div>
        )}
      </div>
      
      {/* Count */}
      <div className="mt-2 text-xs text-slate-500 text-center">
        {filteredCrops.length} items
      </div>
    </div>
  );
};

