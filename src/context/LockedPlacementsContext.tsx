import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { LockedPlacement, SelectedCropForPlacement, LockDefinition } from "../types/greenhouse";
import { useGridState } from "./GridStateContext";
import { useToast } from "../components/ui/toastContext";
import {
  isPositionOccupiedByPlacements,
  findOverlappingPlacements,
  getPlacementAtCell,
  validateGridBounds,
  validateAllowedCells,
  generatePlacementId,
  LocalStorageManager,
} from "../utilities";

interface LockedPlacementsContextType {
  // Locked placements state
  lockedPlacements: LockedPlacement[];
  
  // Actions
  addLockedPlacement: (placement: Omit<LockedPlacement, "id">) => { success: boolean; error?: string };
  removeLockedPlacement: (id: string) => void;
  moveLockedPlacement: (id: string, newPosition: [number, number]) => { success: boolean; error?: string };
  clearLockedPlacements: () => void;
  
  // Validation helpers
  isPositionOccupied: (position: [number, number], size: number, excludeId?: string) => boolean;
  isValidPlacement: (position: [number, number], size: number, excludeId?: string) => { valid: boolean; error?: string };
  isValidPlacementPosition: (position: [number, number], size: number) => { valid: boolean; error?: string };
  getLockedPlacementAt: (row: number, col: number) => LockedPlacement | undefined;
  
  // Convert to API format
  getLocksForAPI: () => LockDefinition[];
  
  // Placement mode state
  selectedCropForPlacement: SelectedCropForPlacement | null;
  setSelectedCropForPlacement: (crop: SelectedCropForPlacement | null) => void;
  isPlacementMode: boolean;
  
  // Priority state
  priorities: Record<string, number>;
  setPriority: (cropId: string, priority: number) => void;
  getPriority: (cropId: string) => number;
  isLoadingPriorities: boolean;
  defaultPriorities: Record<string, number>;
}

const LockedPlacementsContext = createContext<LockedPlacementsContextType | null>(null);

export const LockedPlacementsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { unlockedCells } = useGridState();
  const { toast } = useToast();
  const [lockedPlacements, setLockedPlacements] = useState<LockedPlacement[]>(() => {
    // Try to load from localStorage
    const saved = LocalStorageManager.loadLockedPlacements();
    return saved || [];
  });
  const [selectedCropForPlacement, setSelectedCropForPlacement] = useState<SelectedCropForPlacement | null>(null);
  const [priorities, setPriorities] = useState<Record<string, number>>(() => {
    // Try to load from localStorage
    const saved = LocalStorageManager.loadPriorities();
    return saved || {};
  });
  const [isLoadingPriorities, setIsLoadingPriorities] = useState(true);
  const [defaultPriorities, setDefaultPriorities] = useState<Record<string, number>>({});
  
  // Load default priorities on mount
  useEffect(() => {
    const loadDefaultPriorities = async () => {
      try {
        const response = await fetch("/greenhouse/default_priorities.json");
        if (!response.ok) {
          throw new Error(`Failed to load default priorities: ${response.statusText}`);
        }
        const defaultPrioritiesData = await response.json();
        setDefaultPriorities(defaultPrioritiesData);
      } catch (err) {
        console.error("Error loading default priorities:", err);
        toast({
          title: "Warning",
          description: "Failed to load default crop priorities. Using empty priorities.",
          variant: "warning",
          duration: 5000,
        });
      } finally {
        setIsLoadingPriorities(false);
      }
    };
    
    loadDefaultPriorities();
  }, [toast]);
  
  // Save locked placements to localStorage when they change
  useEffect(() => {
    LocalStorageManager.saveLockedPlacements(lockedPlacements);
  }, [lockedPlacements]);
  
  // Save priorities to localStorage when they change
  useEffect(() => {
    // Only save if we have loaded defaults (to avoid saving empty object on init)
    if (!isLoadingPriorities) {
      // Only save if there are custom priorities, otherwise clear storage
      if (Object.keys(priorities).length > 0) {
        LocalStorageManager.savePriorities(priorities);
      } else {
        LocalStorageManager.clearPriorities();
      }
    }
  }, [priorities, isLoadingPriorities]);
  
  // Track previous unlockedCells to detect changes
  const prevUnlockedCellsRef = useRef<Set<string>>(unlockedCells);
  
  // Validate locked placements when grid changes
  useEffect(() => {
    // Only validate if unlockedCells actually changed
    if (prevUnlockedCellsRef.current === unlockedCells) {
      return;
    }
    prevUnlockedCellsRef.current = unlockedCells;
    
    // Check if any locked placements are now invalid
    const invalidPlacements: LockedPlacement[] = [];
    
    for (const placement of lockedPlacements) {
      const [row, col] = placement.position;
      const size = placement.size;
      
      // Check if all cells for this placement are still unlocked
      let isValid = true;
      for (let dr = 0; dr < size; dr++) {
        for (let dc = 0; dc < size; dc++) {
          const cellKey = `${row + dr},${col + dc}`;
          if (!unlockedCells.has(cellKey)) {
            isValid = false;
            break;
          }
        }
        if (!isValid) break;
      }
      
      if (!isValid) {
        invalidPlacements.push(placement);
      }
    }
    
    // Remove invalid placements and show toast
    if (invalidPlacements.length > 0) {
      setLockedPlacements(prev => 
        prev.filter(p => !invalidPlacements.some(inv => inv.id === p.id))
      );
      
      // Show toast notification
      if (invalidPlacements.length === 1) {
        toast({
          title: "Locked placement removed",
          description: `The locked placement for "${invalidPlacements[0].crop}" was removed because the grid cells were locked.`,
          variant: "warning",
          duration: 5000,
        });
      } else {
        toast({
          title: "Locked placements removed",
          description: `${invalidPlacements.length} locked placements were removed because the grid cells were locked.`,
          variant: "warning",
          duration: 5000,
        });
      }
    }
  }, [unlockedCells, lockedPlacements, toast]);
  
  // Check if any cell of a placement at position with size overlaps with existing placements
  const isPositionOccupied = useCallback((
    position: [number, number],
    size: number,
    excludeId?: string
  ): boolean => {
    return isPositionOccupiedByPlacements(position, size, lockedPlacements, excludeId);
  }, [lockedPlacements]);
  
  // Validate if a placement position is valid (checks bounds and unlocked cells only)
  const isValidPlacementPosition = useCallback((
    position: [number, number],
    size: number
  ): { valid: boolean; error?: string } => {
    // Check bounds first
    const boundsValidation = validateGridBounds(position, size);
    if (!boundsValidation.valid) {
      return boundsValidation;
    }
    
    // Check all cells are unlocked
    return validateAllowedCells(position, size, unlockedCells);
  }, [unlockedCells]);
  
  // Validate if a placement is valid (includes overlap check for moving existing placements)
  const isValidPlacement = useCallback((
    position: [number, number],
    size: number,
    excludeId?: string
  ): { valid: boolean; error?: string } => {
    const positionValidation = isValidPlacementPosition(position, size);
    if (!positionValidation.valid) {
      return positionValidation;
    }
    
    // Check no overlap with existing placements (used for drag-moving)
    if (isPositionOccupied(position, size, excludeId)) {
      return { valid: false, error: "Position is occupied by another locked placement" };
    }
    
    return { valid: true };
  }, [isValidPlacementPosition, isPositionOccupied]);
  
  // Find all placements that overlap with a given position and size
  const getOverlappingPlacements = useCallback((
    position: [number, number],
    size: number,
    excludeId?: string
  ): LockedPlacement[] => {
    return findOverlappingPlacements(position, size, lockedPlacements, excludeId);
  }, [lockedPlacements]);
  
  // Add a new locked placement (overrides any overlapping placements)
  const addLockedPlacement = useCallback((
    placement: Omit<LockedPlacement, "id">
  ): { success: boolean; error?: string } => {
    // Only validate position (bounds and unlocked cells), not overlap
    const validation = isValidPlacementPosition(placement.position, placement.size);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    const newPlacement: LockedPlacement = {
      ...placement,
      id: generatePlacementId("placement"),
    };
    
    // Remove any overlapping placements and add the new one
    const overlapping = getOverlappingPlacements(placement.position, placement.size);
    const overlappingIds = new Set(overlapping.map(p => p.id));
    
    setLockedPlacements(prev => [
      ...prev.filter(p => !overlappingIds.has(p.id)),
      newPlacement,
    ]);
    
    return { success: true };
  }, [isValidPlacementPosition, getOverlappingPlacements]);
  
  // Remove a locked placement by ID
  const removeLockedPlacement = useCallback((id: string) => {
    setLockedPlacements(prev => prev.filter(p => p.id !== id));
  }, []);
  
  // Move a locked placement to a new position
  const moveLockedPlacement = useCallback((
    id: string,
    newPosition: [number, number]
  ): { success: boolean; error?: string } => {
    const placement = lockedPlacements.find(p => p.id === id);
    if (!placement) {
      return { success: false, error: "Placement not found" };
    }
    
    const validation = isValidPlacement(newPosition, placement.size, id);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    setLockedPlacements(prev =>
      prev.map(p =>
        p.id === id ? { ...p, position: newPosition } : p
      )
    );
    return { success: true };
  }, [lockedPlacements, isValidPlacement]);
  
  // Clear all locked placements
  const clearLockedPlacements = useCallback(() => {
    setLockedPlacements([]);
  }, []);
  
  // Get the locked placement at a specific cell (if any)
  const getLockedPlacementAt = useCallback((
    row: number,
    col: number
  ): LockedPlacement | undefined => {
    return getPlacementAtCell(row, col, lockedPlacements);
  }, [lockedPlacements]);
  
  // Convert locked placements to API format
  const getLocksForAPI = useCallback((): LockDefinition[] => {
    return lockedPlacements.map(p => ({
      name: p.crop,
      size: p.size,
      position: p.position,
    }));
  }, [lockedPlacements]);
  
  // Priority management
  const setPriority = useCallback((cropId: string, priority: number) => {
    setPriorities(prev => {
      const defaultValue = defaultPriorities[cropId] || 0;
      
      if (priority === defaultValue) {
        // Remove from priorities if it matches the default
        const { [cropId]: _removed, ...rest } = prev;
        void _removed; // Suppress unused variable warning
        return rest;
      }
      return { ...prev, [cropId]: priority };
    });
  }, [defaultPriorities]);
  
  const getPriority = useCallback((cropId: string): number => {
    // Return custom priority if set, otherwise return default priority, otherwise 0
    if (cropId in priorities) {
      return priorities[cropId];
    }
    return defaultPriorities[cropId] || 0;
  }, [priorities, defaultPriorities]);
  
  const value: LockedPlacementsContextType = {
    lockedPlacements,
    addLockedPlacement,
    removeLockedPlacement,
    moveLockedPlacement,
    clearLockedPlacements,
    isPositionOccupied,
    isValidPlacement,
    isValidPlacementPosition,
    getLockedPlacementAt,
    getLocksForAPI,
    selectedCropForPlacement,
    setSelectedCropForPlacement,
    isPlacementMode: selectedCropForPlacement !== null,
    priorities,
    setPriority,
    getPriority,
    isLoadingPriorities,
    defaultPriorities,
  };
  
  return (
    <LockedPlacementsContext.Provider value={value}>
      {children}
    </LockedPlacementsContext.Provider>
  );
};

export const useLockedPlacements = (): LockedPlacementsContextType => {
  const context = useContext(LockedPlacementsContext);
  if (!context) {
    throw new Error("useLockedPlacements must be used within a LockedPlacementsProvider");
  }
  return context;
};
