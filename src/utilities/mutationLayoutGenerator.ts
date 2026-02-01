// =============================================================================
// Mutation Layout Generator
// =============================================================================
// Generates example layouts for mutation requirements using 8-way adjacency.
// Creates a minimal grid size that fits all requirements around the mutation.

import type { MutationRequirementJSON } from "../services/greenhouseDataService";

export interface LayoutCell {
  cropId: string;
  isCenter: boolean;
}

export interface MutationLayout {
  grid: (LayoutCell | null)[][];
  gridSize: number;
  centerPosition: [number, number];
}

// 8-way adjacency directions (N, NE, E, SE, S, SW, W, NW)
const DIRECTIONS_8WAY: [number, number][] = [
  [-1, 0],  // N
  [-1, 1],  // NE
  [0, 1],   // E
  [1, 1],   // SE
  [1, 0],   // S
  [1, -1],  // SW
  [0, -1],  // W
  [-1, -1], // NW
];

/**
 * Calculate the minimum grid size needed to fit a mutation and its requirements.
 * Takes into account the mutation's size and total requirement count.
 */
function calculateGridSize(mutationSize: number, totalRequirements: number): number {
  // For 1x1 mutations: can have up to 8 adjacent cells
  // For 2x2 mutations: can have up to 12 adjacent cells (perimeter)
  // For 3x3 mutations: can have up to 16 adjacent cells (perimeter)
  
  // Base grid needs to fit the mutation plus at least one ring of cells
  const baseSize = mutationSize + 2;
  
  // Calculate how many cells are available in the first ring
  const firstRingCells = (mutationSize + 2) * 4 - 4 + (mutationSize > 1 ? (mutationSize - 1) * 4 : 0);
  
  if (totalRequirements <= firstRingCells) {
    return baseSize;
  }
  
  // Need a second ring for overflow
  return baseSize + 2;
}

/**
 * Get all adjacent positions around a multi-cell mutation.
 * For a 1x1 at [1,1], returns the 8 surrounding cells.
 * For a 2x2 at [1,1], returns the 12 perimeter cells.
 */
function getAdjacentPositions(
  centerRow: number,
  centerCol: number,
  mutationSize: number,
  gridSize: number
): [number, number][] {
  const positions: [number, number][] = [];
  
  // For each cell the mutation occupies, check all 8 directions
  const occupiedCells = new Set<string>();
  for (let dr = 0; dr < mutationSize; dr++) {
    for (let dc = 0; dc < mutationSize; dc++) {
      occupiedCells.add(`${centerRow + dr},${centerCol + dc}`);
    }
  }
  
  const adjacentSet = new Set<string>();
  
  for (let dr = 0; dr < mutationSize; dr++) {
    for (let dc = 0; dc < mutationSize; dc++) {
      const cellRow = centerRow + dr;
      const cellCol = centerCol + dc;
      
      for (const [dRow, dCol] of DIRECTIONS_8WAY) {
        const newRow = cellRow + dRow;
        const newCol = cellCol + dCol;
        const key = `${newRow},${newCol}`;
        
        // Skip if out of bounds
        if (newRow < 0 || newRow >= gridSize || newCol < 0 || newCol >= gridSize) {
          continue;
        }
        
        // Skip if it's part of the mutation itself
        if (occupiedCells.has(key)) {
          continue;
        }
        
        // Skip if already added
        if (adjacentSet.has(key)) {
          continue;
        }
        
        adjacentSet.add(key);
        positions.push([newRow, newCol]);
      }
    }
  }
  
  // Sort positions in a consistent order (top-left to bottom-right, row by row)
  positions.sort((a, b) => {
    if (a[0] !== b[0]) return a[0] - b[0];
    return a[1] - b[1];
  });
  
  return positions;
}

/**
 * Generate a layout for mutation requirements.
 * Places the mutation in the center and distributes requirements around it.
 */
export function generateMutationLayout(
  mutationId: string,
  mutationSize: number,
  requirements: MutationRequirementJSON[]
): MutationLayout {
  // Calculate total requirements
  const totalRequirements = requirements.reduce((sum, req) => sum + req.count, 0);
  
  // Handle special case: no requirements (like Lonelily)
  if (totalRequirements === 0) {
    const gridSize = mutationSize + 2;
    const centerRow = 1;
    const centerCol = 1;
    
    const grid: (LayoutCell | null)[][] = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => null)
    );
    
    // Place the mutation
    for (let dr = 0; dr < mutationSize; dr++) {
      for (let dc = 0; dc < mutationSize; dc++) {
        grid[centerRow + dr][centerCol + dc] = {
          cropId: mutationId,
          isCenter: true,
        };
      }
    }
    
    return { grid, gridSize, centerPosition: [centerRow, centerCol] };
  }
  
  // Calculate grid size
  const gridSize = calculateGridSize(mutationSize, totalRequirements);
  
  // Center position (accounting for mutation size)
  const centerRow = Math.floor((gridSize - mutationSize) / 2);
  const centerCol = Math.floor((gridSize - mutationSize) / 2);
  
  // Initialize grid
  const grid: (LayoutCell | null)[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => null)
  );
  
  // Place the mutation in center
  for (let dr = 0; dr < mutationSize; dr++) {
    for (let dc = 0; dc < mutationSize; dc++) {
      grid[centerRow + dr][centerCol + dc] = {
        cropId: mutationId,
        isCenter: true,
      };
    }
  }
  
  // Get adjacent positions
  const adjacentPositions = getAdjacentPositions(centerRow, centerCol, mutationSize, gridSize);
  
  // Create a flat list of crop IDs to place
  const cropsToPlace: string[] = [];
  for (const req of requirements) {
    for (let i = 0; i < req.count; i++) {
      cropsToPlace.push(req.crop);
    }
  }
  
  // Place crops in adjacent positions
  for (let i = 0; i < cropsToPlace.length && i < adjacentPositions.length; i++) {
    const [row, col] = adjacentPositions[i];
    grid[row][col] = {
      cropId: cropsToPlace[i],
      isCenter: false,
    };
  }
  
  return { grid, gridSize, centerPosition: [centerRow, centerCol] };
}

/**
 * Get the ground type for a crop/mutation by its ID.
 * This is a helper for rendering the mini grid with correct textures.
 */
export function getGroundTypeForCrop(_cropId: string, fallbackGround: string): string {
  // This will be populated by the component using the data service
  return fallbackGround;
}
