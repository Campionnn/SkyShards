/**
 * Type definitions for optimized designer layout storage
 */

// Minimal placement data - only essential information
export interface OptimizedPlacement {
  cropId: string;
  position: [number, number];
}

// Optimized layout format
export interface SavedLayout {
  id: string;              // Unique identifier
  name: string;            // User-provided name
  savedAt: number;         // Timestamp when first saved
  modifiedAt: number;      // Timestamp when last modified
  inputs: OptimizedPlacement[];
  targets: OptimizedPlacement[];
}
