import type { CropDefinition, MutationDefinition, CropFilterCategory } from "../types/greenhouse";

/**
 * Standard filter options for crop/mutation filtering
 * Used across Calculator and Designer
 */
export const CROP_FILTER_OPTIONS = [
  { value: "all" as CropFilterCategory, label: "All" },
  { value: "crops" as CropFilterCategory, label: "Crops" },
  { value: "mutations" as CropFilterCategory, label: "Mutations" },
  { value: "common" as CropFilterCategory, label: "Common" },
  { value: "uncommon" as CropFilterCategory, label: "Uncommon" },
  { value: "rare" as CropFilterCategory, label: "Rare" },
  { value: "epic" as CropFilterCategory, label: "Epic" },
  { value: "legendary" as CropFilterCategory, label: "Legendary" },
] as const;

/**
 * Filter crops by category (crops/mutations/rarity)
 */
export function filterCropsByCategory(
  crops: CropDefinition[],
  filter: CropFilterCategory,
  getMutationDef: (cropId: string) => MutationDefinition | undefined
): CropDefinition[] {
  switch (filter) {
    case "crops":
      return crops.filter(c => !c.isMutation);
    
    case "mutations":
      return crops.filter(c => c.isMutation);
    
    case "common":
    case "uncommon":
    case "rare":
    case "epic":
    case "legendary":
      return crops.filter(c => {
        if (!c.isMutation) return false;
        const mutation = getMutationDef(c.id);
        return mutation?.rarity.toLowerCase() === filter.toLowerCase();
      });
    
    case "all":
    default:
      return crops;
  }
}

/**
 * Filter crops by search term (case-insensitive name matching)
 */
export function filterCropsBySearch(
  crops: CropDefinition[],
  searchTerm: string
): CropDefinition[] {
  if (!searchTerm.trim()) {
    return crops;
  }
  
  const term = searchTerm.toLowerCase();
  return crops.filter(c => c.name.toLowerCase().includes(term));
}

/**
 * Apply both category and search filters to crops
 */
export function filterCrops(
  crops: CropDefinition[],
  filter: CropFilterCategory,
  searchTerm: string,
  getMutationDef: (cropId: string) => MutationDefinition | undefined
): CropDefinition[] {
  let filtered = filterCropsByCategory(crops, filter, getMutationDef);
  filtered = filterCropsBySearch(filtered, searchTerm);
  return filtered;
}
