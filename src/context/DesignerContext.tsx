import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { MutationDefinition } from "../types/greenhouse";

// =============================================================================
// Types
// =============================================================================

export type DesignerMode = "inputs" | "targets";

export interface DesignerPlacement {
  id: string;
  cropId: string;
  cropName: string;
  size: number;
  position: [number, number];
  isMutation: boolean;
}

export interface SelectedCropForDesigner {
  id: string;
  name: string;
  size: number;
  isMutation: boolean;
}

interface DesignerContextType {
  // Mode
  mode: DesignerMode;
  setMode: (mode: DesignerMode) => void;
  
  // Placements
  inputPlacements: DesignerPlacement[];
  targetPlacements: DesignerPlacement[];
  
  // Actions
  addPlacement: (placement: Omit<DesignerPlacement, "id">) => { success: boolean; error?: string };
  removePlacement: (id: string) => void;
  movePlacement: (id: string, newPosition: [number, number]) => { success: boolean; error?: string };
  clearInputPlacements: () => void;
  clearTargetPlacements: () => void;
  clearAllPlacements: () => void;
  
  // Validation helpers
  isPositionOccupied: (position: [number, number], size: number, excludeId?: string) => boolean;
  isValidPlacement: (position: [number, number], size: number, excludeId?: string) => { valid: boolean; error?: string };
  isValidPlacementPosition: (position: [number, number], size: number) => { valid: boolean; error?: string };
  getPlacementAt: (row: number, col: number) => DesignerPlacement | undefined;
  
  // Selection for placement
  selectedCropForPlacement: SelectedCropForDesigner | null;
  setSelectedCropForPlacement: (crop: SelectedCropForDesigner | null) => void;
  isPlacementMode: boolean;
  
  // Load from calculator results
  loadFromSolverResult: (
    crops: Array<{ name: string; position: [number, number]; size: number }>,
    mutations: Array<{ name: string; position: [number, number]; size: number }>
  ) => void;
  
  // Get all placements for display
  allPlacements: DesignerPlacement[];
  
  // Mutation validation
  getPossibleMutations: (
    mutations: MutationDefinition[]
  ) => Array<{ mutation: MutationDefinition; positions: [number, number][] }>;
}

const DesignerContext = createContext<DesignerContextType | null>(null);

// =============================================================================
// Helpers
// =============================================================================

let placementIdCounter = 0;
function generatePlacementId(): string {
  return `designer-${Date.now()}-${++placementIdCounter}`;
}

// =============================================================================
// Provider
// =============================================================================

export const DesignerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<DesignerMode>("inputs");
  const [inputPlacements, setInputPlacements] = useState<DesignerPlacement[]>([]);
  const [targetPlacements, setTargetPlacements] = useState<DesignerPlacement[]>([]);
  const [selectedCropForPlacement, setSelectedCropForPlacement] = useState<SelectedCropForDesigner | null>(null);
  
  // Get the current placements based on mode
  const currentPlacements = mode === "inputs" ? inputPlacements : targetPlacements;
  const setCurrentPlacements = mode === "inputs" ? setInputPlacements : setTargetPlacements;
  
  // All placements combined (for overlap checking and display)
  const allPlacements = useMemo(() => {
    return [...inputPlacements, ...targetPlacements];
  }, [inputPlacements, targetPlacements]);
  
  // Check if position is occupied by any placement (inputs or targets)
  const isPositionOccupied = useCallback((
    position: [number, number],
    size: number,
    excludeId?: string
  ): boolean => {
    const [row, col] = position;
    
    for (const placement of allPlacements) {
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
  }, [allPlacements]);
  
  // Validate position (bounds only - designer treats all cells as unlocked)
  const isValidPlacementPosition = useCallback((
    position: [number, number],
    size: number
  ): { valid: boolean; error?: string } => {
    const [row, col] = position;
    
    // Check all cells for this placement are within grid bounds (10x10 grid)
    if (row < 0 || col < 0 || row + size > 10 || col + size > 10) {
      return { valid: false, error: "Placement would be outside the grid" };
    }
    
    return { valid: true };
  }, []);
  
  // Validate placement (includes overlap check)
  const isValidPlacement = useCallback((
    position: [number, number],
    size: number,
    excludeId?: string
  ): { valid: boolean; error?: string } => {
    const positionValidation = isValidPlacementPosition(position, size);
    if (!positionValidation.valid) {
      return positionValidation;
    }
    
    if (isPositionOccupied(position, size, excludeId)) {
      return { valid: false, error: "Position is occupied by another placement" };
    }
    
    return { valid: true };
  }, [isValidPlacementPosition, isPositionOccupied]);
  
  // Find overlapping placements in current mode's list
  const getOverlappingPlacements = useCallback((
    position: [number, number],
    size: number,
    excludeId?: string
  ): DesignerPlacement[] => {
    const [row, col] = position;
    const overlapping: DesignerPlacement[] = [];
    
    for (const placement of currentPlacements) {
      if (excludeId && placement.id === excludeId) continue;
      
      const [pRow, pCol] = placement.position;
      const pSize = placement.size;
      
      const noOverlap = 
        row + size <= pRow ||
        pRow + pSize <= row ||
        col + size <= pCol ||
        pCol + pSize <= col;
      
      if (!noOverlap) {
        overlapping.push(placement);
      }
    }
    
    return overlapping;
  }, [currentPlacements]);
  
  // Add placement to current mode's list
  const addPlacement = useCallback((
    placement: Omit<DesignerPlacement, "id">
  ): { success: boolean; error?: string } => {
    const validation = isValidPlacementPosition(placement.position, placement.size);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    const newPlacement: DesignerPlacement = {
      ...placement,
      id: generatePlacementId(),
    };
    
    // Remove any overlapping placements in the current mode's list
    const overlapping = getOverlappingPlacements(placement.position, placement.size);
    const overlappingIds = new Set(overlapping.map(p => p.id));
    
    setCurrentPlacements(prev => [
      ...prev.filter(p => !overlappingIds.has(p.id)),
      newPlacement,
    ]);
    
    return { success: true };
  }, [isValidPlacementPosition, getOverlappingPlacements, setCurrentPlacements]);
  
  // Remove placement from either list
  const removePlacement = useCallback((id: string) => {
    setInputPlacements(prev => prev.filter(p => p.id !== id));
    setTargetPlacements(prev => prev.filter(p => p.id !== id));
  }, []);
  
  // Move placement
  const movePlacement = useCallback((
    id: string,
    newPosition: [number, number]
  ): { success: boolean; error?: string } => {
    const placement = allPlacements.find(p => p.id === id);
    if (!placement) {
      return { success: false, error: "Placement not found" };
    }
    
    const validation = isValidPlacement(newPosition, placement.size, id);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Update in the correct list
    const isInput = inputPlacements.some(p => p.id === id);
    if (isInput) {
      setInputPlacements(prev =>
        prev.map(p => p.id === id ? { ...p, position: newPosition } : p)
      );
    } else {
      setTargetPlacements(prev =>
        prev.map(p => p.id === id ? { ...p, position: newPosition } : p)
      );
    }
    
    return { success: true };
  }, [allPlacements, inputPlacements, isValidPlacement]);
  
  // Clear functions
  const clearInputPlacements = useCallback(() => {
    setInputPlacements([]);
  }, []);
  
  const clearTargetPlacements = useCallback(() => {
    setTargetPlacements([]);
  }, []);
  
  const clearAllPlacements = useCallback(() => {
    setInputPlacements([]);
    setTargetPlacements([]);
  }, []);
  
  // Get placement at position
  const getPlacementAt = useCallback((
    row: number,
    col: number
  ): DesignerPlacement | undefined => {
    for (const placement of allPlacements) {
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
  }, [allPlacements]);
  
  // Load from solver result
  const loadFromSolverResult = useCallback((
    crops: Array<{ name: string; position: [number, number]; size: number }>,
    mutations: Array<{ name: string; position: [number, number]; size: number }>
  ) => {
    // Convert crops to input placements
    const newInputs: DesignerPlacement[] = crops.map(crop => ({
      id: generatePlacementId(),
      cropId: crop.name,
      cropName: crop.name,
      size: crop.size,
      position: crop.position,
      isMutation: false,
    }));
    
    // Convert mutations to target placements
    const newTargets: DesignerPlacement[] = mutations.map(mutation => ({
      id: generatePlacementId(),
      cropId: mutation.name,
      cropName: mutation.name,
      size: mutation.size,
      position: mutation.position,
      isMutation: true,
    }));
    
    setInputPlacements(newInputs);
    setTargetPlacements(newTargets);
  }, []);
  
  // Get possible mutations based on current input placements
  const getPossibleMutations = useCallback((
    mutations: MutationDefinition[]
  ): Array<{ mutation: MutationDefinition; positions: [number, number][] }> => {
    const results: Array<{ mutation: MutationDefinition; positions: [number, number][] }> = [];
    
    // Build a map of what crops are at each cell
    const cropAtCell = new Map<string, string>();
    for (const placement of inputPlacements) {
      const [row, col] = placement.position;
      for (let dr = 0; dr < placement.size; dr++) {
        for (let dc = 0; dc < placement.size; dc++) {
          cropAtCell.set(`${row + dr},${col + dc}`, placement.cropId);
        }
      }
    }
    
    // For each mutation, check if requirements can be satisfied
    for (const mutation of mutations) {
      const validPositions: [number, number][] = [];
      
      // Try each possible position for the mutation
      for (let row = 0; row <= 10 - mutation.size; row++) {
        for (let col = 0; col <= 10 - mutation.size; col++) {
          // Check if position is valid (unlocked cells)
          const posValid = isValidPlacementPosition([row, col], mutation.size);
          if (!posValid.valid) continue;
          
          // Count adjacent cells by crop type
          const adjacentCropCounts = new Map<string, Set<string>>();
          
          // Get all adjacent cells (cells touching the mutation area)
          for (let dr = 0; dr < mutation.size; dr++) {
            for (let dc = 0; dc < mutation.size; dc++) {
              const cellRow = row + dr;
              const cellCol = col + dc;
              
              // Check all 8 directions (including diagonals)
              const neighbors = [
                [cellRow - 1, cellCol],     // North
                [cellRow + 1, cellCol],     // South
                [cellRow, cellCol - 1],     // West
                [cellRow, cellCol + 1],     // East
                [cellRow - 1, cellCol - 1], // Northwest
                [cellRow - 1, cellCol + 1], // Northeast
                [cellRow + 1, cellCol - 1], // Southwest
                [cellRow + 1, cellCol + 1], // Southeast
              ];
              
              for (const [nr, nc] of neighbors) {
                // Skip if inside the mutation area
                if (nr >= row && nr < row + mutation.size && 
                    nc >= col && nc < col + mutation.size) continue;
                
                const crop = cropAtCell.get(`${nr},${nc}`);
                if (crop) {
                  if (!adjacentCropCounts.has(crop)) {
                    adjacentCropCounts.set(crop, new Set());
                  }
                  // Track unique cell positions for this crop type
                  adjacentCropCounts.get(crop)!.add(`${nr},${nc}`);
                }
              }
            }
          }
          
          // Check if all requirements are satisfied (both crop type AND count)
          const requirementsMet = mutation.requirements.every(req => {
            const cellsOfThisCrop = adjacentCropCounts.get(req.crop);
            return cellsOfThisCrop && cellsOfThisCrop.size >= req.count;
          });
          
          if (requirementsMet) {
            validPositions.push([row, col]);
          }
        }
      }
      
      if (validPositions.length > 0) {
        results.push({ mutation, positions: validPositions });
      }
    }
    
    return results;
  }, [inputPlacements, isValidPlacementPosition]);
  
  const value: DesignerContextType = {
    mode,
    setMode,
    inputPlacements,
    targetPlacements,
    addPlacement,
    removePlacement,
    movePlacement,
    clearInputPlacements,
    clearTargetPlacements,
    clearAllPlacements,
    isPositionOccupied,
    isValidPlacement,
    isValidPlacementPosition,
    getPlacementAt,
    selectedCropForPlacement,
    setSelectedCropForPlacement,
    isPlacementMode: selectedCropForPlacement !== null,
    loadFromSolverResult,
    allPlacements,
    getPossibleMutations,
  };
  
  return (
    <DesignerContext.Provider value={value}>
      {children}
    </DesignerContext.Provider>
  );
};

// =============================================================================
// Hook
// =============================================================================

export const useDesigner = (): DesignerContextType => {
  const context = useContext(DesignerContext);
  if (!context) {
    throw new Error("useDesigner must be used within a DesignerProvider");
  }
  return context;
};
