import { GRID_SIZE } from "../constants";


export interface CellWithOffset {
  cell: [number, number];
  offsetX: number;
  offsetY: number;
}

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

export function getPlacementPosition(
  cursorCell: [number, number],
  offsetX: number,
  offsetY: number,
  size: number
): [number, number] {
  if (size === 1) return cursorCell;
  
  let row: number, col: number;
  
  if (size === 2) {
    if (offsetY < 0.5) {
      row = cursorCell[0] - 1;
    } else {
      row = cursorCell[0];
    }
    
    if (offsetX < 0.5) {
      col = cursorCell[1] - 1;
    } else {
      col = cursorCell[1];
    }
  } else {
    const offset = Math.floor(size / 2);
    row = cursorCell[0] - offset;
    col = cursorCell[1] - offset;
  }
  
  // Clamp to valid grid bounds
  row = Math.max(0, Math.min(GRID_SIZE - size, row));
  col = Math.max(0, Math.min(GRID_SIZE - size, col));
  
  return [row, col];
}

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

export function getGridDimensions(
  cellSize: number,
  gap: number
): { width: number; height: number } {
  return {
    width: GRID_SIZE * cellSize + (GRID_SIZE - 1) * gap,
    height: GRID_SIZE * cellSize + (GRID_SIZE - 1) * gap,
  };
}
