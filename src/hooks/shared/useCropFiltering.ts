import { useState, useMemo, useCallback } from "react";
import { filterCrops } from "../../constants";
import type { CropDefinition, MutationDefinition, CropFilterCategory } from "../../types/greenhouse";

export interface UseCropFilteringOptions {
  crops: CropDefinition[];
  mutations: MutationDefinition[];
  initialFilter?: CropFilterCategory;
  initialSearchTerm?: string;
  additionalFilter?: (crop: CropDefinition) => boolean;
}

export interface UseCropFilteringReturn {
  // State
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filter: CropFilterCategory;
  setFilter: (value: CropFilterCategory) => void;
  
  // Results
  filteredCrops: CropDefinition[];
  
  // Utilities
  getMutationDef: (cropId: string) => MutationDefinition | undefined;
}

/**
 * Shared hook for crop filtering logic
 * Encapsulates search term and category filtering used across Calculator and Designer
 * 
 * @example
 * const { searchTerm, setSearchTerm, filter, setFilter, filteredCrops } = useCropFiltering({
 *   crops,
 *   mutations,
 *   additionalFilter: (crop) => crop.isMutation // Only show mutations
 * });
 */
export function useCropFiltering({
  crops,
  mutations,
  initialFilter = "all",
  initialSearchTerm = "",
  additionalFilter,
}: UseCropFilteringOptions): UseCropFilteringReturn {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [filter, setFilter] = useState<CropFilterCategory>(initialFilter);
  
  // Get mutation definition for a crop ID
  const getMutationDef = useCallback((cropId: string): MutationDefinition | undefined => {
    return mutations.find(m => m.id === cropId);
  }, [mutations]);
  
  // Apply filters
  const filteredCrops = useMemo(() => {
    let result = filterCrops(crops, filter, searchTerm, getMutationDef);
    
    // Apply additional custom filter if provided
    if (additionalFilter) {
      result = result.filter(additionalFilter);
    }
    
    return result;
  }, [crops, filter, searchTerm, getMutationDef, additionalFilter]);
  
  return {
    searchTerm,
    setSearchTerm,
    filter,
    setFilter,
    filteredCrops,
    getMutationDef,
  };
}
