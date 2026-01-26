import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { LockedPlacement, SelectedCropForPlacement, LockDefinition } from "../types/greenhouse";
import { useGridState } from "./GridStateContext";
import { useToast } from "../components/ui/toastContext";

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
}

const LockedPlacementsContext = createContext<LockedPlacementsContextType | null>(null);

// Generate unique ID for placements
let placementIdCounter = 0;
function generatePlacementId(): string {
  return `placement-${Date.now()}-${++placementIdCounter}`;
}

export const LockedPlacementsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { unlockedCells } = useGridState();
  const { toast } = useToast();
  const [lockedPlacements, setLockedPlacements] = useState<LockedPlacement[]>([]);
  const [selectedCropForPlacement, setSelectedCropForPlacement] = useState<SelectedCropForPlacement | null>(null);
  const [priorities, setPriorities] = useState<Record<string, number>>({});
  
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
    const [row, col] = position;
    
    for (const placement of lockedPlacements) {
      if (excludeId && placement.id === excludeId) continue;
      
      const [pRow, pCol] = placement.position;
      const pSize = placement.size;
      
      // Check for overlap between the two squares
      const noOverlap = 
        row + size <= pRow ||      // New placement is above
        pRow + pSize <= row ||     // New placement is below
        col + size <= pCol ||      // New placement is to the left
        pCol + pSize <= col;       // New placement is to the right
      
      if (!noOverlap) return true;
    }
    
    return false;
  }, [lockedPlacements]);
  
  // Validate if a placement is valid
  const isValidPlacement = useCallback((
    position: [number, number],
    size: number,
    excludeId?: string
  ): { valid: boolean; error?: string } => {
    const [row, col] = position;
    
    // Check all cells for this placement are within grid bounds
    if (row < 0 || col < 0 || row + size > 10 || col + size > 10) {
      return { valid: false, error: "Placement would be outside the grid" };
    }
    
    // Check all cells for this placement are unlocked
    for (let dr = 0; dr < size; dr++) {
      for (let dc = 0; dc < size; dc++) {
        const cellKey = `${row + dr},${col + dc}`;
        if (!unlockedCells.has(cellKey)) {
          return { valid: false, error: "Placement requires unlocked cells" };
        }
      }
    }
    
    // Check no overlap with existing placements
    if (isPositionOccupied(position, size, excludeId)) {
      return { valid: false, error: "Position is occupied by another locked placement" };
    }
    
    return { valid: true };
  }, [unlockedCells, isPositionOccupied]);
  
  // Add a new locked placement
  const addLockedPlacement = useCallback((
    placement: Omit<LockedPlacement, "id">
  ): { success: boolean; error?: string } => {
    const validation = isValidPlacement(placement.position, placement.size);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    const newPlacement: LockedPlacement = {
      ...placement,
      id: generatePlacementId(),
    };
    
    setLockedPlacements(prev => [...prev, newPlacement]);
    return { success: true };
  }, [isValidPlacement]);
  
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
    for (const placement of lockedPlacements) {
      const [pRow, pCol] = placement.position;
      const pSize = placement.size;
      
      if (
        row >= pRow && row < pRow + pSize &&
        col >= pCol && col < pCol + pSize
      ) {
        return placement;
      }
    }
    return undefined;
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
      if (priority === 0) {
        // Remove from priorities if 0 (default)
        const { [cropId]: _removed, ...rest } = prev;
        void _removed; // Suppress unused variable warning
        return rest;
      }
      return { ...prev, [cropId]: priority };
    });
  }, []);
  
  const getPriority = useCallback((cropId: string): number => {
    return priorities[cropId] || 0;
  }, [priorities]);
  
  const value: LockedPlacementsContextType = {
    lockedPlacements,
    addLockedPlacement,
    removeLockedPlacement,
    moveLockedPlacement,
    clearLockedPlacements,
    isPositionOccupied,
    isValidPlacement,
    getLockedPlacementAt,
    getLocksForAPI,
    selectedCropForPlacement,
    setSelectedCropForPlacement,
    isPlacementMode: selectedCropForPlacement !== null,
    priorities,
    setPriority,
    getPriority,
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
