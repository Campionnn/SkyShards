import { useCallback, useEffect } from "react";
import { useDesigner } from "../context";
import { useToast } from "../components/ui/toastContext";
import { useGridInteractionCore, type DragState, type PaintState, type HoverInfo } from "./shared/useGridInteractionCore";
import { getPlacementPosition, findNearestValidPosition } from "../utilities";

export interface UseDesignerGridPlacementOptions {
  cellSize: number;
  gap: number;
  gridRef: React.RefObject<HTMLDivElement | null>;
}

export interface UseDesignerGridPlacementReturn {
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
}

export function useDesignerGridPlacement({
  cellSize,
  gap,
  gridRef,
}: UseDesignerGridPlacementOptions): UseDesignerGridPlacementReturn {
  const {
    allPlacements,
    selectedCropForPlacement,
    setSelectedCropForPlacement,
    addPlacement,
    removePlacement,
    movePlacement,
    getPlacementAt,
    isValidPlacement,
    isValidPlacementPosition,
    isPlacementMode,
  } = useDesigner();
  const { toast } = useToast();

  // ESC key handler to deselect crop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedCropForPlacement) {
        setSelectedCropForPlacement(null);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCropForPlacement, setSelectedCropForPlacement]);

  // Adapter functions to match the core hook's expected interface
  const handleAddPlacement = useCallback((
    cell: [number, number],
    offsetX: number,
    offsetY: number
  ): [number, number] | null => {
    if (!selectedCropForPlacement) return null;
    
    // Calculate position
    const basePos = getPlacementPosition(cell, offsetX, offsetY, selectedCropForPlacement.size);
    const adjustedPos = findNearestValidPosition(basePos, selectedCropForPlacement.size, isValidPlacementPosition);
    if (!adjustedPos) return null;
    
    const result = addPlacement({
      cropId: selectedCropForPlacement.id,
      cropName: selectedCropForPlacement.name,
      size: selectedCropForPlacement.size,
      position: adjustedPos,
      isMutation: selectedCropForPlacement.isMutation,
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
  }, [selectedCropForPlacement, addPlacement, toast, isValidPlacementPosition]);
  
  const handleRemovePlacement = useCallback((cell: [number, number]) => {
    const placement = getPlacementAt(cell[0], cell[1]);
    if (placement) {
      removePlacement(placement.id);
    }
  }, [getPlacementAt, removePlacement]);
  
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
    placements: allPlacements,
    selectedItem: selectedCropForPlacement,
    isPlacementMode,
    isValidPlacement,
    isValidPlacementPosition,
    onAddPlacement: handleAddPlacement,
    onRemovePlacement: handleRemovePlacement,
    onMovePlacement: movePlacement,
    showToast: handleShowToast,
    getSelectedItemSize,
  });
}

// Re-export types
export type { DragState as DesignerDragState, PaintState as DesignerPaintState, HoverInfo as DesignerHoverInfo };
