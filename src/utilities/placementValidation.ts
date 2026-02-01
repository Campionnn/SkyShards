import { GRID_SIZE } from "../constants";

/**
 * Base placement interface that all placement types must implement
 * Used for generic validation functions
 */
export interface BasePlacement {
  id: string;
  position: [number, number];
  size: number;
}

/**
 * Result of a validation check
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Generate a unique ID for a placement
 */
export function generatePlacementId(prefix: string = "placement"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if two placements overlap
 */
export function doPlacementsOverlapByPlacement<T extends BasePlacement>(
  placementA: T,
  placementB: T
): boolean {
  const [aRow, aCol] = placementA.position;
  const [bRow, bCol] = placementB.position;
  const aSize = placementA.size;
  const bSize = placementB.size;
  
  // Check for overlap between the two squares
  const noOverlap = 
    aRow + aSize <= bRow ||      // A is above B
    bRow + bSize <= aRow ||      // A is below B
    aCol + aSize <= bCol ||      // A is to the left of B
    bCol + bSize <= aCol;        // A is to the right of B
  
  return !noOverlap;
}

/**
 * Check if a position with given size overlaps with any placement in the list
 * @param position - The position to check
 * @param size - The size of the placement
 * @param placements - List of existing placements
 * @param excludeId - Optional ID to exclude from the check (for moving)
 * @returns true if position is occupied
 */
export function isPositionOccupiedByPlacements<T extends BasePlacement>(
  position: [number, number],
  size: number,
  placements: T[],
  excludeId?: string
): boolean {
  const [row, col] = position;
  
  for (const placement of placements) {
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
}

/**
 * Find all placements that overlap with a given position and size
 * @param position - The position to check
 * @param size - The size of the placement
 * @param placements - List of existing placements
 * @param excludeId - Optional ID to exclude from the check
 * @returns Array of overlapping placements
 */
export function findOverlappingPlacements<T extends BasePlacement>(
  position: [number, number],
  size: number,
  placements: T[],
  excludeId?: string
): T[] {
  const [row, col] = position;
  const overlapping: T[] = [];
  
  for (const placement of placements) {
    if (excludeId && placement.id === excludeId) continue;
    
    const [pRow, pCol] = placement.position;
    const pSize = placement.size;
    
    // Check for overlap between the two squares
    const noOverlap = 
      row + size <= pRow ||      // New placement is above
      pRow + pSize <= row ||     // New placement is below
      col + size <= pCol ||      // New placement is to the left
      pCol + pSize <= col;       // New placement is to the right
    
    if (!noOverlap) {
      overlapping.push(placement);
    }
  }
  
  return overlapping;
}

/**
 * Get the placement at a specific cell position
 * @param row - Row index
 * @param col - Column index
 * @param placements - List of placements to search
 * @returns The placement at the cell, or undefined
 */
export function getPlacementAtCell<T extends BasePlacement>(
  row: number,
  col: number,
  placements: T[]
): T | undefined {
  for (const placement of placements) {
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
}

/**
 * Validate that a position is within grid bounds
 * @param position - The position to validate
 * @param size - The size of the placement
 * @param gridSize - The grid size (default: GRID_SIZE from constants)
 * @returns Validation result
 */
export function validateGridBounds(
  position: [number, number],
  size: number,
  gridSize: number = GRID_SIZE
): ValidationResult {
  const [row, col] = position;
  
  // Check all cells for this placement are within grid bounds
  if (row < 0 || col < 0 || row + size > gridSize || col + size > gridSize) {
    return { valid: false, error: "Placement would be outside the grid" };
  }
  
  return { valid: true };
}

/**
 * Validate that all cells of a placement are in the allowed cells set
 * @param position - The position to validate
 * @param size - The size of the placement
 * @param allowedCells - Set of allowed cell keys (e.g., "row,col")
 * @returns Validation result
 */
export function validateAllowedCells(
  position: [number, number],
  size: number,
  allowedCells: Set<string>
): ValidationResult {
  const [row, col] = position;
  
  // Check all cells for this placement are in the allowed set
  for (let dr = 0; dr < size; dr++) {
    for (let dc = 0; dc < size; dc++) {
      const cellKey = `${row + dr},${col + dc}`;
      if (!allowedCells.has(cellKey)) {
        return { valid: false, error: "Placement requires unlocked cells" };
      }
    }
  }
  
  return { valid: true };
}

/**
 * Validate that a position doesn't overlap with existing placements
 * @param position - The position to validate
 * @param size - The size of the placement
 * @param placements - List of existing placements
 * @param excludeId - Optional ID to exclude from the check (for moving)
 * @returns Validation result
 */
export function validateNoOverlap<T extends BasePlacement>(
  position: [number, number],
  size: number,
  placements: T[],
  excludeId?: string
): ValidationResult {
  if (isPositionOccupiedByPlacements(position, size, placements, excludeId)) {
    return { valid: false, error: "Position is occupied by another placement" };
  }
  
  return { valid: true };
}
