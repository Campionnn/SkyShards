import type { CalculationFormData } from "../schemas";

const STORAGE_KEY = "calculator_data";
const SAVE_ENABLED_KEY = "calculator_save_enabled";

const EXCLUDED_FIELDS = ['shard', 'quantity'] as const;

const filterFormDataForSave = (data: CalculationFormData): Partial<CalculationFormData> => {
  const result: Partial<CalculationFormData> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (!EXCLUDED_FIELDS.includes(key as any)) {
      (result as any)[key] = value;
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
    return saved === "true";
  } catch (error) {
    console.warn("Failed to load save enabled state from localStorage:", error);
    return false;
  }
};

export const setSaveEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(SAVE_ENABLED_KEY, enabled.toString());
  } catch (error) {
    console.warn("Failed to save enabled state to localStorage:", error);
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