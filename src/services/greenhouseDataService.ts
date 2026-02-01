// =============================================================================
// Greenhouse Data Service
// =============================================================================
// Loads and provides access to the greenhouse data.json file which contains
// all crop, mutation, and effect definitions with full descriptions.

// =============================================================================
// Types for the data.json structure
// =============================================================================

export interface EffectDefinition {
  name: string;
  description: string;
}

export interface CropDataJSON {
  name: string;
  size: number;
  ground: string;
  growth_stages: number | null;
  positive_buffs: string[];
  negative_buffs: string[];
}

export interface MutationRequirementJSON {
  crop: string;
  count: number;
}

export interface MutationDataJSON {
  name: string;
  size: number;
  ground: string;
  requirements: MutationRequirementJSON[];
  special?: string;
  rarity: string;
  growth_stages: number | null;
  decay: number;
  positive_buffs: string[];
  negative_buffs: string[];
  drops: Record<string, number>;
  harvest_info?: string;
  growing_info?: string;
}

export interface GreenhouseDataJSON {
  crops: Record<string, CropDataJSON>;
  mutations: Record<string, MutationDataJSON>;
  effects: Record<string, EffectDefinition>;
}

// =============================================================================
// Cached Data
// =============================================================================

let cachedData: GreenhouseDataJSON | null = null;
let loadPromise: Promise<GreenhouseDataJSON> | null = null;

// =============================================================================
// Data Loading Functions
// =============================================================================

/**
 * Load the greenhouse data from the JSON file.
 * Results are cached after the first load.
 */
export async function loadGreenhouseData(): Promise<GreenhouseDataJSON> {
  // Return cached data if available
  if (cachedData) {
    return cachedData;
  }

  // Return existing promise if already loading
  if (loadPromise) {
    return loadPromise;
  }

  // Start loading
  loadPromise = fetch("/greenhouse/data.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load greenhouse data: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data: GreenhouseDataJSON) => {
      cachedData = data;
      return data;
    })
    .catch((error) => {
      loadPromise = null; // Reset promise on error to allow retry
      throw error;
    });

  return loadPromise;
}

/**
 * Get crop data by ID from the cached data.
 * Returns undefined if data is not loaded or crop doesn't exist.
 */
export function getCropData(cropId: string): (CropDataJSON & { id: string }) | undefined {
  if (!cachedData) return undefined;
  
  const crop = cachedData.crops[cropId];
  if (!crop) return undefined;
  
  return { ...crop, id: cropId };
}

/**
 * Get mutation data by ID from the cached data.
 * Returns undefined if data is not loaded or mutation doesn't exist.
 */
export function getMutationData(mutationId: string): (MutationDataJSON & { id: string }) | undefined {
  if (!cachedData) return undefined;
  
  const mutation = cachedData.mutations[mutationId];
  if (!mutation) return undefined;
  
  return { ...mutation, id: mutationId };
}

/**
 * Get effect definition by ID from the cached data.
 * Returns undefined if data is not loaded or effect doesn't exist.
 */
export function getEffectData(effectId: string): EffectDefinition | undefined {
  if (!cachedData) return undefined;
  return cachedData.effects[effectId];
}

/**
 * Get all crops from the cached data.
 */
export function getAllCrops(): (CropDataJSON & { id: string })[] {
  if (!cachedData) return [];
  
  return Object.entries(cachedData.crops).map(([id, crop]) => ({
    ...crop,
    id,
  }));
}

/**
 * Get all mutations from the cached data.
 */
export function getAllMutations(): (MutationDataJSON & { id: string })[] {
  if (!cachedData) return [];
  
  return Object.entries(cachedData.mutations).map(([id, mutation]) => ({
    ...mutation,
    id,
  }));
}

/**
 * Get all effects from the cached data.
 */
export function getAllEffects(): (EffectDefinition & { id: string })[] {
  if (!cachedData) return [];
  
  return Object.entries(cachedData.effects).map(([id, effect]) => ({
    ...effect,
    id,
  }));
}

/**
 * Check if data is loaded.
 */
export function isDataLoaded(): boolean {
  return cachedData !== null;
}

/**
 * Get the raw cached data (for advanced use cases).
 */
export function getRawData(): GreenhouseDataJSON | null {
  return cachedData;
}

/**
 * Look up an item by ID - checks both crops and mutations.
 * Returns the item with a type indicator.
 */
export function getItemData(itemId: string): 
  | { type: "crop"; data: CropDataJSON & { id: string } }
  | { type: "mutation"; data: MutationDataJSON & { id: string } }
  | undefined {
  const crop = getCropData(itemId);
  if (crop) {
    return { type: "crop", data: crop };
  }
  
  const mutation = getMutationData(itemId);
  if (mutation) {
    return { type: "mutation", data: mutation };
  }
  
  return undefined;
}
