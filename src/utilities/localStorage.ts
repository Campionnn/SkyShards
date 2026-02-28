import type { CalculationFormData } from "../schemas";

const STORAGE_KEY = "calculator_data";
const SAVE_ENABLED_KEY = "calculator_save_enabled";

const EXCLUDED_FIELDS = ['shard', 'quantity'] as const;

const filterFormDataForSave = (data: CalculationFormData): Partial<CalculationFormData> => {
  const result: Partial<CalculationFormData> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (!EXCLUDED_FIELDS.includes(key as typeof EXCLUDED_FIELDS[number])) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  
  return result;
};

export const saveFormData = (data: CalculationFormData): void => {
  try {
    const filteredData = filterFormDataForSave(data);
    const serializedData = JSON.stringify(filteredData);
    localStorage.setItem(STORAGE_KEY, serializedData);
  } catch (error) {
    console.warn("Failed to save form data to localStorage:", error);
  }
};

export const getSaveEnabled = (): boolean => {
  try {
    const saved = localStorage.getItem(SAVE_ENABLED_KEY);
    // Default to true (enabled) if no value is saved
    return saved === null ? true : saved === "true";
  } catch (error) {
    console.warn("Failed to load save enabled state from localStorage:", error);
    return true;
  }
};

export const setSaveEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(SAVE_ENABLED_KEY, enabled ? "true" : "false");
  } catch (error) {
    console.warn("Failed to set save enabled state in localStorage:", error);
  }
};

export const isFirstVisit = (): boolean => {
  try {
    // If the save enabled key is not set, it's the first visit
    return localStorage.getItem(SAVE_ENABLED_KEY) === null;
  } catch {
    return true;
  }
};

export const loadFormData = (): CalculationFormData | null => {
  try {
    const serializedData = localStorage.getItem(STORAGE_KEY);
    if (serializedData) {
      return JSON.parse(serializedData);
    }
    return null;
  } catch (error) {
    console.warn("Failed to load form data from localStorage:", error);
    return null;
  }
};

export const clearFormData = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear form data from localStorage:", error);
  }
};

const INVENTORY_STORAGE_KEY = "inventory";
export const saveInventory = (inventory: Map<string, number>): void => {
  try {
    const obj = Object.fromEntries(inventory);
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(obj));
  } catch (error) {
    console.warn("Failed to save inventory to localStorage:", error);
  }
};

export const loadInventory = (): Map<string, number> => {
  try {
    const stored = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Map(Object.entries(parsed).map(([k, v]) => [k, Number(v)]));
    }
  } catch (error) {
    console.warn("Failed to load inventory from localStorage:", error);
  }
  return new Map();
};

// Owned attributes storage
const OWNED_ATTRIBUTES_STORAGE_KEY = "owned_attributes";

export const saveOwnedAttributes = (attributes: Map<string, number>): void => {
  try {
    const obj = Object.fromEntries(attributes);
    localStorage.setItem(OWNED_ATTRIBUTES_STORAGE_KEY, JSON.stringify(obj));
  } catch (error) {
    console.warn("Failed to save owned attributes to localStorage:", error);
  }
};

export const loadOwnedAttributes = (): Map<string, number> => {
  try {
    const stored = localStorage.getItem(OWNED_ATTRIBUTES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Map(Object.entries(parsed).map(([k, v]) => [k, Number(v)]));
    }
  } catch (error) {
    console.warn("Failed to load owned attributes from localStorage:", error);
  }
  return new Map();
};

export const clearOwnedAttributes = (): void => {
  try {
    localStorage.removeItem(OWNED_ATTRIBUTES_STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear owned attributes from localStorage:", error);
  }
};

// Hypixel profile metadata
const HYPIXEL_PROFILE_META_KEY = "hypixel_profile_meta";

export interface HypixelProfileMeta {
  username: string;
  profileName: string;
  lastImportTime: number;
}

export const saveHypixelProfileMeta = (meta: HypixelProfileMeta): void => {
  try {
    localStorage.setItem(HYPIXEL_PROFILE_META_KEY, JSON.stringify(meta));
  } catch (error) {
    console.warn("Failed to save Hypixel profile meta to localStorage:", error);
  }
};

export const loadHypixelProfileMeta = (): HypixelProfileMeta | null => {
  try {
    const stored = localStorage.getItem(HYPIXEL_PROFILE_META_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn("Failed to load Hypixel profile meta from localStorage:", error);
  }
  return null;
};

export const clearHypixelProfileMeta = (): void => {
  try {
    localStorage.removeItem(HYPIXEL_PROFILE_META_KEY);
  } catch (error) {
    console.warn("Failed to clear Hypixel profile meta from localStorage:", error);
  }
};

