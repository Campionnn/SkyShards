import { useCallback } from "react";
import { useLockedPlacements } from "../context";
import { useToast } from "../components/ui/toastContext";
import { useGridInteractionCore, type DragState, type PaintState, type HoverInfo } from "./shared/useGridInteractionCore";
import { getPlacementPosition, findNearestValidPosition } from "../utilities";

export interface UseGridPlacementOptions {
  cellSize: number;
  gap: number;
  gridRef: React.RefObject<HTMLDivElement | null>;
}

export interface UseGridPlacementReturn {
  // State
  hoveredPlacementId: string | null;
  setHoveredPlacementId: React.Dispatch<React.SetStateAction<string | null>>;
  dragState: DragState | null;
  paintState: PaintState | null;
  hoverInfo: HoverInfo | null;
  
  // Computed values
  previewPosition: [number, number] | null;
  previewValidation: { valid: boolean; error?: string } | null;
  dragValidation: { valid: boolean; error?: string } | null;
  
  // Event handlers
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseLeave: () => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleContextMenu: (e: React.MouseEvent) => void;
  handlePlacementMouseDown: (placementId: string, e: React.MouseEvent) => void;
  cancelDrag: () => void;
  
  // Utility functions
  getAdjustedPosition: (
    cursorCell: [number, number],
    offsetX: number,
    offsetY: number,
    size: number
  ) => [number, number] | null;
}

export function useGridPlacement({
  cellSize,
  gap,
  gridRef,
}: UseGridPlacementOptions): UseGridPlacementReturn {
  const {
    lockedPlacements,
    selectedCropForPlacement,
    addLockedPlacement,
    removeLockedPlacement,
    moveLockedPlacement,
    getLockedPlacementAt,
    isValidPlacement,
    isValidPlacementPosition,
    isPlacementMode,
  } = useLockedPlacements();
  const { toast } = useToast();
  
  // Adapter functions to match the core hook's expected interface
  const handleAddPlacement = useCallback((
    cell: [number, number],
    offsetX: number,
    offsetY: number
  ): [number, number] | null => {
    if (!selectedCropForPlacement) return null;
    
    // Use the getAdjustedPosition from the core hook
    const basePos = getPlacementPosition(cell, offsetX, offsetY, selectedCropForPlacement.size);
    const adjustedPos = findNearestValidPosition(basePos, selectedCropForPlacement.size, isValidPlacementPosition);
    if (!adjustedPos) return null;
    
    const result = addLockedPlacement({
      crop: selectedCropForPlacement.id,
      position: adjustedPos,
      size: selectedCropForPlacement.size,
      ground: selectedCropForPlacement.ground,
    });
    
    if (!result.success) {
      toast({
        title: "Cannot place here",
        description: result.error,
        variant: "error",
        duration: 2000,
      });
      return null;
    }
    
    return adjustedPos;
  }, [selectedCropForPlacement, addLockedPlacement, toast, isValidPlacementPosition]);
  
  const handleRemovePlacement = useCallback((cell: [number, number]) => {
    const placement = getLockedPlacementAt(cell[0], cell[1]);
    if (placement) {
      removeLockedPlacement(placement.id);
    }
  }, [getLockedPlacementAt, removeLockedPlacement]);
  
  const handleShowToast = useCallback((title: string, description?: string, variant?: "success" | "error" | "warning") => {
    toast({
      title,
      description,
      variant: variant || "error",
      duration: 2000,
    });
  }, [toast]);
  
  const getSelectedItemSize = useCallback(() => {
    return selectedCropForPlacement?.size || 1;
  }, [selectedCropForPlacement]);
  
  // Use the core hook
  return useGridInteractionCore({
    cellSize,
    gap,
    gridRef,
    placements: lockedPlacements,
    selectedItem: selectedCropForPlacement,
    isPlacementMode,
    isValidPlacement,
    isValidPlacementPosition,
    onAddPlacement: handleAddPlacement,
    onRemovePlacement: handleRemovePlacement,
    onMovePlacement: moveLockedPlacement,
    showToast: handleShowToast,
    getSelectedItemSize,
  });
}

// Re-export types
export type { DragState, PaintState, HoverInfo };
