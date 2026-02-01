import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import { GRID_SIZE, getDefaultUnlockedCells, getExpandableCells } from "../constants";
import type { ExpansionStep } from "../types/greenhouse";
import { LocalStorageManager } from "../utilities";

interface GridStateContextType {
  // grid state
  unlockedCells: Set<string>;
  expandableCells: Set<string>;
  
  // Actions
  toggleCell: (row: number, col: number) => void;
  unlockCell: (row: number, col: number) => void;
  lockCell: (row: number, col: number) => void;
  selectAll: () => void;
  resetToDefault: () => void;
  
  // Helpers
  isCellUnlocked: (row: number, col: number) => boolean;
  isCellExpandable: (row: number, col: number) => boolean;
  getUnlockedCellsArray: () => [number, number][];
  getLockedCellsArray: () => [number, number][];
  
  // Expansion overlay
  expansionSteps: ExpansionStep[];
  setExpansionSteps: (steps: ExpansionStep[]) => void;
  clearExpansionSteps: () => void;
  getExpansionStep: (row: number, col: number) => ExpansionStep | undefined;
}

const GridStateContext = createContext<GridStateContextType | null>(null);

export const GridStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unlockedCells, setUnlockedCells] = useState<Set<string>>(() => {
    // Try to load from localStorage first
    const saved = LocalStorageManager.loadGridConfig();
    if (saved && saved.size > 0) {
      return saved;
    }
    // Fall back to default
    return getDefaultUnlockedCells();
  });
  const [expansionSteps, setExpansionStepsState] = useState<ExpansionStep[]>([]);
  const isInitialMount = useRef(true);
  
  // Save to localStorage whenever unlockedCells changes (but not on initial mount with defaults)
  useEffect(() => {
    if (isInitialMount.current) {
      // Check if we loaded from localStorage
      const saved = LocalStorageManager.loadGridConfig();
      if (saved && saved.size > 0) {
        // We loaded from localStorage, so future changes should save
        isInitialMount.current = false;
      } else {
        // We're using defaults, don't save yet
        isInitialMount.current = false;
        return;
      }
    }
    LocalStorageManager.saveGridConfig(unlockedCells);
  }, [unlockedCells]);
  
  // Compute expandable cells whenever unlocked cells change
  const expandableCells = useMemo(() => getExpandableCells(unlockedCells), [unlockedCells]);
  
  const isCellUnlocked = useCallback((row: number, col: number): boolean => {
    return unlockedCells.has(`${row},${col}`);
  }, [unlockedCells]);
  
  const isCellExpandable = useCallback((row: number, col: number): boolean => {
    return expandableCells.has(`${row},${col}`);
  }, [expandableCells]);
  
  const toggleCell = useCallback((row: number, col: number) => {
    const key = `${row},${col}`;
    setUnlockedCells(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        // Allow unlocking any cell without adjacency restriction
        next.add(key);
      }
      return next;
    });
    // Clear expansion overlay when grid changes
    setExpansionStepsState([]);
  }, []);
  
  const unlockCell = useCallback((row: number, col: number) => {
    const key = `${row},${col}`;
    setUnlockedCells(prev => {
      if (prev.has(key)) return prev;
      // Allow unlocking any cell without adjacency restriction
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    // Update expansion steps - remove the first step if it matches this cell
    setExpansionStepsState(prev => {
      if (prev.length > 0 && prev[0].cell[0] === row && prev[0].cell[1] === col) {
        return prev.slice(1).map((step, i) => ({ ...step, order: i + 1 }));
      }
      return [];
    });
  }, []);
  
  const lockCell = useCallback((row: number, col: number) => {
    const key = `${row},${col}`;
    setUnlockedCells(prev => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setExpansionStepsState([]);
  }, []);
  
  const selectAll = useCallback(() => {
    const allCells = new Set<string>();
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        allCells.add(`${r},${c}`);
      }
    }
    setUnlockedCells(allCells);
    setExpansionStepsState([]);
  }, []);
  
  const resetToDefault = useCallback(() => {
    setUnlockedCells(getDefaultUnlockedCells());
    setExpansionStepsState([]);
  }, []);
  
  const getUnlockedCellsArray = useCallback((): [number, number][] => {
    return Array.from(unlockedCells).map(key => {
      const [row, col] = key.split(",").map(Number);
      return [row, col] as [number, number];
    });
  }, [unlockedCells]);
  
  const getLockedCellsArray = useCallback((): [number, number][] => {
    const locked: [number, number][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!unlockedCells.has(`${r},${c}`)) {
          locked.push([r, c]);
        }
      }
    }
    return locked;
  }, [unlockedCells]);
  
  const setExpansionSteps = useCallback((steps: ExpansionStep[]) => {
    setExpansionStepsState(steps);
  }, []);
  
  const clearExpansionSteps = useCallback(() => {
    setExpansionStepsState([]);
  }, []);
  
  const getExpansionStep = useCallback((row: number, col: number): ExpansionStep | undefined => {
    return expansionSteps.find(step => step.cell[0] === row && step.cell[1] === col);
  }, [expansionSteps]);
  
  const value: GridStateContextType = {
    unlockedCells,
    expandableCells,
    toggleCell,
    unlockCell,
    lockCell,
    selectAll,
    resetToDefault,
    isCellUnlocked,
    isCellExpandable,
    getUnlockedCellsArray,
    getLockedCellsArray,
    expansionSteps,
    setExpansionSteps,
    clearExpansionSteps,
    getExpansionStep,
  };
  
  return (
    <GridStateContext.Provider value={value}>
      {children}
    </GridStateContext.Provider>
  );
};

export const useGridState = (): GridStateContextType => {
  const context = useContext(GridStateContext);
  if (!context) {
    throw new Error("useGridState must be used within a GridStateProvider");
  }
  return context;
};
