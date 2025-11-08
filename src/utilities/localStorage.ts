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
const K_VALUES_STORAGE_KEY = "k_values";

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

export const saveKValues = (kValues: Map<string, number>): void => {
  try {
    const obj = Object.fromEntries(kValues);
    localStorage.setItem(K_VALUES_STORAGE_KEY, JSON.stringify(obj));
  } catch (error) {
    console.warn("Failed to save k values to localStorage:", error);
  }
};

export const loadKValues = (): Map<string, number> => {
  try {
    const stored = localStorage.getItem(K_VALUES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Map(Object.entries(parsed).map(([k, v]) => [k, Number(v)]));
    }
  } catch (error) {
    console.warn("Failed to load k values from localStorage:", error);
  }
  return new Map();
};

