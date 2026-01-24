// Greenhouse constants

export const GRID_SIZE = 10;

// Default starting grid: 4x4 center with corners removed (12 cells)
export function getDefaultUnlockedCells(): Set<string> {
  const cells = new Set<string>();
  const startRow = Math.floor((GRID_SIZE - 4) / 2);
  const startCol = Math.floor((GRID_SIZE - 4) / 2);
  
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      // Skip corners: (0,0), (0,3), (3,0), (3,3)
      if ((r === 0 && c === 0) || (r === 0 && c === 3) || 
          (r === 3 && c === 0) || (r === 3 && c === 3)) {
        continue;
      }
      cells.add(`${startRow + r},${startCol + c}`);
    }
  }
  
  return cells;
}

// Check if a cell is cardinally adjacent to any unlocked cell
export function isAdjacentToUnlocked(row: number, col: number, unlockedCells: Set<string>): boolean {
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  
  for (const [dr, dc] of directions) {
    const adjRow = row + dr;
    const adjCol = col + dc;
    if (unlockedCells.has(`${adjRow},${adjCol}`)) {
      return true;
    }
  }
  
  return false;
}

// Get all cells that can be expanded to (locked cells adjacent to unlocked)
export function getExpandableCells(unlockedCells: Set<string>): Set<string> {
  const expandable = new Set<string>();
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  
  for (const cellKey of unlockedCells) {
    const [row, col] = cellKey.split(",").map(Number);
    
    for (const [dr, dc] of directions) {
      const adjRow = row + dr;
      const adjCol = col + dc;
      
      // Check bounds
      if (adjRow >= 0 && adjRow < GRID_SIZE && adjCol >= 0 && adjCol < GRID_SIZE) {
        const adjKey = `${adjRow},${adjCol}`;
        if (!unlockedCells.has(adjKey)) {
          expandable.add(adjKey);
        }
      }
    }
  }
  
  return expandable;
}
