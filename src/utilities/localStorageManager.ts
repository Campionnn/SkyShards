/**
 * Local Storage Manager for SkyShards
 * 
 * Provides a centralized utility for saving and loading application state to/from localStorage.
 * Handles grid configuration, priorities, designer state, locked placements, and mutation targets.
 */

import type { SelectedMutation } from "../types/greenhouse";
import type { LockedPlacement } from "../types/greenhouse";
import type { DesignerPlacement } from "../context/DesignerContext";

// Storage keys
const STORAGE_KEYS = {
  GRID_CONFIG: "skyshards-grid-config",
  PRIORITIES: "skyshards-priorities",
  DESIGNER_INPUTS: "skyshards-designer-inputs",
  DESIGNER_TARGETS: "skyshards-designer-targets",
  LOCKED_PLACEMENTS: "skyshards-locked-placements",
  MUTATION_TARGETS: "skyshards-mutation-targets",
} as const;

// Version for data migration (if we change schema in the future)
const STORAGE_VERSION = 1;

// ============================================================================
// Type Definitions
// ============================================================================

interface GridConfigData {
  version: number;
  unlockedCells: string[]; // Array of "row,col" strings
}

interface PrioritiesData {
  version: number;
  priorities: Record<string, number>;
}

interface DesignerInputsData {
  version: number;
  placements: DesignerPlacement[];
}

interface DesignerTargetsData {
  version: number;
  placements: DesignerPlacement[];
}

interface LockedPlacementsData {
  version: number;
  placements: LockedPlacement[];
}

interface MutationTargetsData {
  version: number;
  targets: SelectedMutation[];
}

// ============================================================================
// LocalStorageManager Class
// ============================================================================

export class LocalStorageManager {
  /**
   * Generic method to save data to localStorage
   */
  private static save<T>(key: string, data: T): boolean {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error(`Failed to save ${key} to localStorage:`, error);
      return false;
    }
  }

  /**
   * Generic method to load data from localStorage
   */
  private static load<T>(key: string): T | null {
    try {
      const serialized = localStorage.getItem(key);
      if (serialized === null) {
        return null;
      }
      return JSON.parse(serialized) as T;
    } catch (error) {
      console.error(`Failed to load ${key} from localStorage:`, error);
      return null;
    }
  }

  /**
   * Generic method to remove data from localStorage
   */
  private static remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove ${key} from localStorage:`, error);
    }
  }

  // ============================================================================
  // Grid Configuration
  // ============================================================================

  /**
   * Save grid configuration (unlocked cells)
   */
  static saveGridConfig(unlockedCells: Set<string>): boolean {
    const data: GridConfigData = {
      version: STORAGE_VERSION,
      unlockedCells: Array.from(unlockedCells),
    };
    return this.save(STORAGE_KEYS.GRID_CONFIG, data);
  }

  /**
   * Load grid configuration (unlocked cells)
   */
  static loadGridConfig(): Set<string> | null {
    const data = this.load<GridConfigData>(STORAGE_KEYS.GRID_CONFIG);
    if (!data) return null;

    // Validate version (for future migrations)
    if (data.version !== STORAGE_VERSION) {
      console.warn("Grid config version mismatch, ignoring saved data");
      return null;
    }

    return new Set(data.unlockedCells);
  }

  /**
   * Clear grid configuration
   */
  static clearGridConfig(): void {
    this.remove(STORAGE_KEYS.GRID_CONFIG);
  }

  // ============================================================================
  // Priorities
  // ============================================================================

  /**
   * Save crop priorities
   */
  static savePriorities(priorities: Record<string, number>): boolean {
    const data: PrioritiesData = {
      version: STORAGE_VERSION,
      priorities,
    };
    return this.save(STORAGE_KEYS.PRIORITIES, data);
  }

  /**
   * Load crop priorities
   */
  static loadPriorities(): Record<string, number> | null {
    const data = this.load<PrioritiesData>(STORAGE_KEYS.PRIORITIES);
    if (!data) return null;

    if (data.version !== STORAGE_VERSION) {
      console.warn("Priorities version mismatch, ignoring saved data");
      return null;
    }

    return data.priorities;
  }

  /**
   * Clear priorities
   */
  static clearPriorities(): void {
    this.remove(STORAGE_KEYS.PRIORITIES);
  }

  // ============================================================================
  // Designer - Input Placements
  // ============================================================================

  /**
   * Save designer input placements
   */
  static saveDesignerInputs(placements: DesignerPlacement[]): boolean {
    const data: DesignerInputsData = {
      version: STORAGE_VERSION,
      placements,
    };
    return this.save(STORAGE_KEYS.DESIGNER_INPUTS, data);
  }

  /**
   * Load designer input placements
   */
  static loadDesignerInputs(): DesignerPlacement[] | null {
    const data = this.load<DesignerInputsData>(STORAGE_KEYS.DESIGNER_INPUTS);
    if (!data) return null;

    if (data.version !== STORAGE_VERSION) {
      console.warn("Designer inputs version mismatch, ignoring saved data");
      return null;
    }

    return data.placements;
  }

  /**
   * Clear designer input placements
   */
  static clearDesignerInputs(): void {
    this.remove(STORAGE_KEYS.DESIGNER_INPUTS);
  }

  // ============================================================================
  // Designer - Target Placements
  // ============================================================================

  /**
   * Save designer target placements
   */
  static saveDesignerTargets(placements: DesignerPlacement[]): boolean {
    const data: DesignerTargetsData = {
      version: STORAGE_VERSION,
      placements,
    };
    return this.save(STORAGE_KEYS.DESIGNER_TARGETS, data);
  }

  /**
   * Load designer target placements
   */
  static loadDesignerTargets(): DesignerPlacement[] | null {
    const data = this.load<DesignerTargetsData>(STORAGE_KEYS.DESIGNER_TARGETS);
    if (!data) return null;

    if (data.version !== STORAGE_VERSION) {
      console.warn("Designer targets version mismatch, ignoring saved data");
      return null;
    }

    return data.placements;
  }

  /**
   * Clear designer target placements
   */
  static clearDesignerTargets(): void {
    this.remove(STORAGE_KEYS.DESIGNER_TARGETS);
  }

  /**
   * Clear all designer placements (both inputs and targets)
   */
  static clearAllDesignerPlacements(): void {
    this.clearDesignerInputs();
    this.clearDesignerTargets();
  }

  // ============================================================================
  // Locked Placements (Calculator)
  // ============================================================================

  /**
   * Save locked placements
   */
  static saveLockedPlacements(placements: LockedPlacement[]): boolean {
    const data: LockedPlacementsData = {
      version: STORAGE_VERSION,
      placements,
    };
    return this.save(STORAGE_KEYS.LOCKED_PLACEMENTS, data);
  }

  /**
   * Load locked placements
   */
  static loadLockedPlacements(): LockedPlacement[] | null {
    const data = this.load<LockedPlacementsData>(STORAGE_KEYS.LOCKED_PLACEMENTS);
    if (!data) return null;

    if (data.version !== STORAGE_VERSION) {
      console.warn("Locked placements version mismatch, ignoring saved data");
      return null;
    }

    return data.placements;
  }

  /**
   * Clear locked placements
   */
  static clearLockedPlacements(): void {
    this.remove(STORAGE_KEYS.LOCKED_PLACEMENTS);
  }

  // ============================================================================
  // Mutation Targets (Calculator)
  // ============================================================================

  /**
   * Save mutation targets
   */
  static saveMutationTargets(targets: SelectedMutation[]): boolean {
    const data: MutationTargetsData = {
      version: STORAGE_VERSION,
      targets,
    };
    return this.save(STORAGE_KEYS.MUTATION_TARGETS, data);
  }

  /**
   * Load mutation targets
   */
  static loadMutationTargets(): SelectedMutation[] | null {
    const data = this.load<MutationTargetsData>(STORAGE_KEYS.MUTATION_TARGETS);
    if (!data) return null;

    if (data.version !== STORAGE_VERSION) {
      console.warn("Mutation targets version mismatch, ignoring saved data");
      return null;
    }

    return data.targets;
  }

  /**
   * Clear mutation targets
   */
  static clearMutationTargets(): void {
    this.remove(STORAGE_KEYS.MUTATION_TARGETS);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Clear all saved data
   */
  static clearAll(): void {
    this.clearGridConfig();
    this.clearPriorities();
    this.clearDesignerInputs();
    this.clearDesignerTargets();
    this.clearLockedPlacements();
    this.clearMutationTargets();
  }

  /**
   * Check if localStorage is available
   */
  static isAvailable(): boolean {
    try {
      const test = "__localStorage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get storage usage information (approximate)
   */
  static getStorageInfo(): { used: number; keys: string[] } {
    let used = 0;
    const keys: string[] = [];

    try {
      for (const key of Object.values(STORAGE_KEYS)) {
        const item = localStorage.getItem(key);
        if (item) {
          used += item.length;
          keys.push(key);
        }
      }
    } catch (error) {
      console.error("Failed to get storage info:", error);
    }

    return { used, keys };
  }
}
