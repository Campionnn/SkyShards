import React, { useState } from "react";
import { CropSearchInput } from "./CropSearchInput";
import { CropFilterDropdown, type FilterOption } from "./CropFilterDropdown";
import { CROP_FILTER_OPTIONS } from "../../constants";
import type { CropFilterCategory } from "../../types/greenhouse";

export interface SearchFilterHeaderProps {
  // Search
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  
  // Filter
  filter: CropFilterCategory;
  onFilterChange: (value: CropFilterCategory) => void;
  filterOptions?: FilterOption[];
  
  // Styling
  className?: string;
  searchClassName?: string;
  filterClassName?: string;
}

/**
 * Unified search and filter header component
 * Used in both Calculator (CropConfigurationsPanel) and Designer (CropSelectionPalette)
 * 
 * Manages its own dropdown open/close state internally
 */
export const SearchFilterHeader: React.FC<SearchFilterHeaderProps> = ({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search...",
  filter,
  onFilterChange,
  filterOptions = [...CROP_FILTER_OPTIONS],
  className = "",
  searchClassName = "",
  filterClassName = "",
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  return (
    <div className={`flex gap-2 ${className}`}>
      {/* Search Input */}
      <CropSearchInput
        value={searchTerm}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        className={`flex-1 ${searchClassName}`}
      />
      
      {/* Filter Dropdown */}
      <CropFilterDropdown
        value={filter}
        onChange={onFilterChange}
        options={filterOptions}
        isOpen={isFilterOpen}
        onToggle={() => setIsFilterOpen(!isFilterOpen)}
        onClose={() => setIsFilterOpen(false)}
        className={filterClassName}
      />
    </div>
  );
};
