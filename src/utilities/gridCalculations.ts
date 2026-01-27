// Grid calculation utilities for placement positioning and validation

import { GRID_SIZE } from "../constants";

/**
 * Result from converting mouse position to grid cell with sub-cell offset
 */
export interface CellWithOffset {
  cell: [number, number];
  offsetX: number; // 0-1 within cell (left to right)
  offsetY: number; // 0-1 within cell (top to bottom)
}

/**
 * Convert mouse position to grid cell with sub-cell position (0-1 within cell)
 * Returns null if the position is outside the grid bounds
 */
export function getGridCellWithOffset(
  clientX: number,
  clientY: number,
  gridRect: DOMRect,
  cellSize: number,
  gap: number
): CellWithOffset | null {
  const x = clientX - gridRect.left;
  const y = clientY - gridRect.top;
  
  const cellUnit = cellSize + gap;
  const col = Math.floor(x / cellUnit);
  const row = Math.floor(y / cellUnit);
  
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    return null;
  }
  
  // Calculate offset within cell (0-1)
  const offsetX = (x - col * cellUnit) / cellSize;
  const offsetY = (y - row * cellUnit) / cellSize;
  
  return {
    cell: [row, col],
    offsetX: Math.min(1, Math.max(0, offsetX)),
    offsetY: Math.min(1, Math.max(0, offsetY)),
  };
}

/**
 * Convert mouse position to grid cell with clamping (for document-level events)
 * Always returns a valid cell by clamping to grid bounds
 */
export function getGridCellClampedWithOffset(
  clientX: number,
  clientY: number,
  gridRect: DOMRect,
  cellSize: number,
  gap: number
): CellWithOffset | null {
  const x = clientX - gridRect.left;
  const y = clientY - gridRect.top;
  
  const cellUnit = cellSize + gap;
  const col = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(x / cellUnit)));
  const row = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(y / cellUnit)));
  
  // Calculate offset within cell (clamped)
  const offsetX = Math.min(1, Math.max(0, (x - col * cellUnit) / cellSize));
  const offsetY = Math.min(1, Math.max(0, (y - row * cellUnit) / cellSize));
  
  return { cell: [row, col], offsetX, offsetY };
}

/**
 * Calculate placement position based on cursor position within cell
 * - For 1x1: just the cell
 * - For 2x2: quadrant determines which corner the current cell becomes
 * - For 3x3+: center under cursor
 */
export function getPlacementPosition(
  cursorCell: [number, number],
  offsetX: number,
  offsetY: number,
  size: number
): [number, number] {
  if (size === 1) return cursorCell;
  
  let row: number, col: number;
  
  if (size === 2) {
    // For 2x2: quadrant-based placement
    // If cursor is in top-left of cell, cell becomes bottom-right of 2x2
    // If cursor is in bottom-right of cell, cell becomes top-left of 2x2
    if (offsetY < 0.5) {
      // Top half - cell becomes bottom row of 2x2
      row = cursorCell[0] - 1;
    } else {
      // Bottom half - cell becomes top row of 2x2
      row = cursorCell[0];
    }
    
    if (offsetX < 0.5) {
      // Left half - cell becomes right column of 2x2
      col = cursorCell[1] - 1;
    } else {
      // Right half - cell becomes left column of 2x2
      col = cursorCell[1];
    }
  } else {
    // For 3x3+: center under cursor
    const offset = Math.floor(size / 2);
    row = cursorCell[0] - offset;
    col = cursorCell[1] - offset;
  }
  
  // Clamp to valid grid bounds
  row = Math.max(0, Math.min(GRID_SIZE - size, row));
  col = Math.max(0, Math.min(GRID_SIZE - size, col));
  
  return [row, col];
}

/**
 * Find nearest valid position for a placement (snaps to unlocked cells)
 * Searches in expanding squares for a valid position
 * @param targetPos - Target position to place at
 * @param size - Size of the crop/mutation
 * @param isValidPositionFn - Function to check if a position is valid
 * @returns Valid position or null if none found
 */
export function findNearestValidPosition(
  targetPos: [number, number],
  size: number,
  isValidPositionFn: (pos: [number, number], size: number) => { valid: boolean }
): [number, number] | null {
  // Check if target position is valid
  const validation = isValidPositionFn(targetPos, size);
  if (validation.valid) return targetPos;
  
  // Search in expanding squares for a valid position
  for (let radius = 1; radius <= Math.max(GRID_SIZE, GRID_SIZE); radius++) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue; // Only check perimeter
        
        const testRow = targetPos[0] + dr;
        const testCol = targetPos[1] + dc;
        
        if (testRow < 0 || testCol < 0 || testRow + size > GRID_SIZE || testCol + size > GRID_SIZE) continue;
        
        const testValidation = isValidPositionFn([testRow, testCol], size);
        if (testValidation.valid) {
          return [testRow, testCol];
        }
      }
    }
  }
  
  return null;
}

/**
 * Get the adjusted position for placement (position calculation + snap to valid)
 * Combines getPlacementPosition with findNearestValidPosition
 */
export function getAdjustedPosition(
  cursorCell: [number, number],
  offsetX: number,
  offsetY: number,
  size: number,
  isValidPositionFn: (pos: [number, number], size: number) => { valid: boolean }
): [number, number] | null {
  const basePos = getPlacementPosition(cursorCell, offsetX, offsetY, size);
  return findNearestValidPosition(basePos, size, isValidPositionFn);
}

/**
 * Check if two placement areas overlap
 * @param posA - Position of first placement
 * @param sizeA - Size of first placement
 * @param posB - Position of second placement
 * @param sizeB - Size of second placement
 * @returns True if the placements overlap
 */
export function doPlacementsOverlap(
  posA: [number, number],
  sizeA: number,
  posB: [number, number],
  sizeB: number
): boolean {
  const aEndRow = posA[0] + sizeA;
  const aEndCol = posA[1] + sizeA;
  const bEndRow = posB[0] + sizeB;
  const bEndCol = posB[1] + sizeB;
  
  return !(posA[0] >= bEndRow || aEndRow <= posB[0] ||
           posA[1] >= bEndCol || aEndCol <= posB[1]);
}

/**
 * Get all cells occupied by a placement
 * @param position - Top-left position of placement
 * @param size - Size of the placement
 * @returns Set of cell keys in "row,col" format
 */
export function getOccupiedCells(
  position: [number, number],
  size: number
): Set<string> {
  const cells = new Set<string>();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      cells.add(`${position[0] + r},${position[1] + c}`);
    }
  }
  return cells;
}

/**
 * Calculate crop image dimensions for rendering
 * @param size - Size of the crop (1, 2, or 3)
 * @param cellSize - Size of each cell in pixels
 * @param gap - Gap between cells in pixels
 * @returns Object with totalWidth, totalHeight, imageWidth, imageHeight
 */
export function calculateCropImageDimensions(
  size: number,
  cellSize: number,
  gap: number
): {
  totalWidth: number;
  totalHeight: number;
  imageWidth: number;
  imageHeight: number;
} {
  const totalWidth = size * cellSize + (size - 1) * gap;
  const totalHeight = size * cellSize + (size - 1) * gap;
  
  // Smaller crops use larger scale for visibility
  const imageScale = size === 1 ? 0.8 : 0.6;
  const imageWidth = totalWidth * imageScale;
  const imageHeight = totalHeight * imageScale;
  
  return { totalWidth, totalHeight, imageWidth, imageHeight };
}

/**
 * Calculate the pixel position for a cell in the grid
 */
export function getCellPixelPosition(
  row: number,
  col: number,
  cellSize: number,
  gap: number
): { top: number; left: number } {
  return {
    top: row * (cellSize + gap),
    left: col * (cellSize + gap),
  };
}

/**
 * Calculate the total grid dimensions in pixels
 */
export function getGridDimensions(
  cellSize: number,
  gap: number
): { width: number; height: number } {
  return {
    width: GRID_SIZE * cellSize + (GRID_SIZE - 1) * gap,
    height: GRID_SIZE * cellSize + (GRID_SIZE - 1) * gap,
  };
}
