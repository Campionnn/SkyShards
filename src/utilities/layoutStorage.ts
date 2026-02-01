import type { SavedLayout } from "../types/layout";

const STORAGE_KEY = "skyshards-designer-designs";

/**
 * Generate a unique ID for a layout
 */
function generateLayoutId(): string {
  return `layout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Check if data is in the correct format
 */
function isValidFormat(data: any): data is SavedLayout[] {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return true; // Empty array is valid
  
  const firstItem = data[0];
  // Check for required fields
  return (
    'id' in firstItem &&
    'name' in firstItem &&
    'savedAt' in firstItem &&
    'modifiedAt' in firstItem &&
    'inputs' in firstItem &&
    'targets' in firstItem
  );
}

/**
 * Save layouts to localStorage
 */
export function saveLayouts(layouts: SavedLayout[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
}

/**
 * Load layouts from localStorage
 */
export function loadLayouts(): SavedLayout[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    if (!isValidFormat(parsed)) {
      console.warn('[Layout Storage] Data not in expected format');
      return [];
    }
    
    return parsed;
  } catch (error) {
    console.error('[Layout Storage] Error loading layouts:', error);
    return [];
  }
}

/**
 * Get a single layout by ID
 */
export function getLayoutById(id: string): SavedLayout | null {
  const layouts = loadLayouts();
  return layouts.find(l => l.id === id) || null;
}

/**
 * Delete a layout by ID
 */
export function deleteLayout(id: string): boolean {
  try {
    const layouts = loadLayouts();
    const filtered = layouts.filter(l => l.id !== id);
    
    if (filtered.length === layouts.length) {
      return false; // Nothing was deleted
    }
    
    saveLayouts(filtered);
    return true;
  } catch (error) {
    console.error('[Layout Storage] Error deleting layout:', error);
    return false;
  }
}

/**
 * Check if a layout name already exists
 */
export function layoutNameExists(name: string, excludeId?: string): boolean {
  const layouts = loadLayouts();
  return layouts.some(l => l.name === name && l.id !== excludeId);
}

/**
 * Generate unique layout ID (exported for external use)
 */
export { generateLayoutId };
