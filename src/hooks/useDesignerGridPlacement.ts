import { useState, useRef, useCallback, useEffect } from "react";
import {
  getGridCellWithOffset as getGridCellWithOffsetUtil,
  getGridCellClampedWithOffset as getGridCellClampedWithOffsetUtil,
  getPlacementPosition,
  findNearestValidPosition,
  doPlacementsOverlap,
  type CellWithOffset,
} from "../utilities";
import { useDesigner } from "../context";
import { useToast } from "../components/ui/toastContext";

export interface DesignerDragState {
  placementId: string;
  startPosition: [number, number];
  currentPosition: [number, number];
  isDragging: boolean; // True once mouse has moved enough to be considered a drag
}

export interface DesignerPaintState {
  mode: "place" | "remove";
}

export interface DesignerHoverInfo {
  cell: [number, number];
  offsetX: number;
  offsetY: number;
}

export interface UseDesignerGridPlacementOptions {
  cellSize: number;
  gap: number;
  gridRef: React.RefObject<HTMLDivElement | null>;
}

export interface UseDesignerGridPlacementReturn {
  // State
  hoveredPlacementId: string | null;
  setHoveredPlacementId: React.Dispatch<React.SetStateAction<string | null>>;
  dragState: DesignerDragState | null;
  paintState: DesignerPaintState | null;
  hoverInfo: DesignerHoverInfo | null;
  
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
  
  // UI state
  const [hoveredPlacementId, setHoveredPlacementId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DesignerDragState | null>(null);
  const [paintState, setPaintState] = useState<DesignerPaintState | null>(null);
  const [hoverInfo, setHoverInfo] = useState<DesignerHoverInfo | null>(null);
  
  // Paint tracking ref
  const paintDataRef = useRef<{
    lastCell: [number, number] | null;
    lastPlacedPosition: [number, number] | null;
    lastPlacedSize: number;
  }>({ lastCell: null, lastPlacedPosition: null, lastPlacedSize: 1 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedCropForPlacement) {
        setSelectedCropForPlacement(null);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCropForPlacement, setSelectedCropForPlacement]);

  const getGridCellWithOffset = useCallback((clientX: number, clientY: number): CellWithOffset | null => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    return getGridCellWithOffsetUtil(clientX, clientY, rect, cellSize, gap);
  }, [gridRef, cellSize, gap]);
  
  const getGridCellClampedWithOffset = useCallback((clientX: number, clientY: number): CellWithOffset | null => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    return getGridCellClampedWithOffsetUtil(clientX, clientY, rect, cellSize, gap);
  }, [gridRef, cellSize, gap]);
  
  const isValidPositionFn = useCallback((pos: [number, number], size: number) => {
    return isValidPlacementPosition(pos, size);
  }, [isValidPlacementPosition]);
  
  const getAdjustedPosition = useCallback((
    cursorCell: [number, number],
    offsetX: number,
    offsetY: number,
    size: number
  ): [number, number] | null => {
    const basePos = getPlacementPosition(cursorCell, offsetX, offsetY, size);
    return findNearestValidPosition(basePos, size, isValidPositionFn);
  }, [isValidPositionFn]);
  
  // Place a crop at the given position
  const placeCropAtPosition = useCallback((
    cursorCell: [number, number],
    offsetX: number,
    offsetY: number
  ): [number, number] | null => {
    if (!selectedCropForPlacement) return null;
    
    const adjustedPos = getAdjustedPosition(cursorCell, offsetX, offsetY, selectedCropForPlacement.size);
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
  }, [selectedCropForPlacement, getAdjustedPosition, addPlacement, toast]);
  
  // Remove any placement at the given cell
  const removeAtCell = useCallback((cell: [number, number]) => {
    const placement = getPlacementAt(cell[0], cell[1]);
    if (placement) {
      removePlacement(placement.id);
    }
  }, [getPlacementAt, removePlacement]);
  
  // Core painting logic
  const handlePaintAtCell = useCallback((
    cell: [number, number],
    offsetX: number,
    offsetY: number,
    paintMode: "place" | "remove"
  ) => {
    const { lastCell, lastPlacedPosition, lastPlacedSize } = paintDataRef.current;
    
    if (lastCell && lastCell[0] === cell[0] && lastCell[1] === cell[1]) {
      return;
    }
    
    if (paintMode === "place" && selectedCropForPlacement) {
      const adjustedPos = getAdjustedPosition(cell, offsetX, offsetY, selectedCropForPlacement.size);
      
      if (adjustedPos && !doPlacementsOverlap(adjustedPos, selectedCropForPlacement.size, lastPlacedPosition ?? [-100, -100], lastPlacedSize)) {
        const placedPos = placeCropAtPosition(cell, offsetX, offsetY);
        if (placedPos) {
          paintDataRef.current = { lastCell: cell, lastPlacedPosition: placedPos, lastPlacedSize: selectedCropForPlacement.size };
        } else {
          paintDataRef.current = { ...paintDataRef.current, lastCell: cell };
        }
      } else {
        paintDataRef.current = { ...paintDataRef.current, lastCell: cell };
      }
    } else if (paintMode === "remove") {
      removeAtCell(cell);
      paintDataRef.current = { ...paintDataRef.current, lastCell: cell };
    }
  }, [selectedCropForPlacement, getAdjustedPosition, placeCropAtPosition, removeAtCell]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const cellInfo = getGridCellWithOffset(e.clientX, e.clientY);
    
    if (dragState) {
      if (cellInfo) {
        const placement = allPlacements.find(p => p.id === dragState.placementId);
        if (placement) {
          const adjustedPos = getAdjustedPosition(cellInfo.cell, cellInfo.offsetX, cellInfo.offsetY, placement.size);
          if (adjustedPos) {
            setDragState(prev => prev ? { ...prev, currentPosition: adjustedPos } : null);
          }
        } else {
          setDragState(prev => prev ? { ...prev, currentPosition: cellInfo.cell } : null);
        }
      }
    } else if (paintState) {
      if (cellInfo) {
        handlePaintAtCell(cellInfo.cell, cellInfo.offsetX, cellInfo.offsetY, paintState.mode);
      }
    } else if (isPlacementMode) {
      setHoverInfo(cellInfo);
    }
  }, [getGridCellWithOffset, dragState, paintState, isPlacementMode, handlePaintAtCell, allPlacements, getAdjustedPosition]);
  
  const handleMouseLeave = useCallback(() => {
    if (!dragState && !paintState) {
      setHoverInfo(null);
    }
  }, [dragState, paintState]);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (dragState) return;
    
    const cellInfo = getGridCellWithOffset(e.clientX, e.clientY);
    if (!cellInfo) return;
    
    const { cell, offsetX, offsetY } = cellInfo;
    
    // Left click in placement mode - start drag-placing
    if (e.button === 0 && isPlacementMode && selectedCropForPlacement) {
      e.preventDefault();
      const placedPos = placeCropAtPosition(cell, offsetX, offsetY);
      paintDataRef.current = { lastCell: cell, lastPlacedPosition: placedPos, lastPlacedSize: selectedCropForPlacement.size };
      setPaintState({ mode: "place" });
      setHoverInfo(null);
    }
    // Right click - start drag-removing
    else if (e.button === 2) {
      e.preventDefault();
      removeAtCell(cell);
      setHoveredPlacementId(null);
      paintDataRef.current = { lastCell: cell, lastPlacedPosition: null, lastPlacedSize: 1 };
      setPaintState({ mode: "remove" });
      setHoverInfo(null);
    }
  }, [getGridCellWithOffset, dragState, isPlacementMode, selectedCropForPlacement, placeCropAtPosition, removeAtCell]);
  
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);
  
  const handlePlacementMouseDown = useCallback((placementId: string, e: React.MouseEvent) => {
    // Right-click removes
    if (e.button === 2) {
      e.preventDefault();
      e.stopPropagation();
      removePlacement(placementId);
      setHoveredPlacementId(null);
      setHoverInfo(null);
      paintDataRef.current = { lastCell: null, lastPlacedPosition: null, lastPlacedSize: 1 };
      setPaintState({ mode: "remove" });
      return;
    }
    
    // Left-click starts drag move (only if not in placement mode)
    if (e.button === 0 && !isPlacementMode) {
      e.preventDefault();
      e.stopPropagation();
      
      const placement = allPlacements.find(p => p.id === placementId);
      if (placement) {
        setDragState({
          placementId,
          startPosition: placement.position,
          currentPosition: placement.position,
          isDragging: false, // Not dragging yet, waiting for mouse movement
        });
      }
    }
  }, [allPlacements, removePlacement, isPlacementMode]);
  
  const handleMouseUp = useCallback(() => {
    if (dragState) {
      const { placementId, startPosition, currentPosition, isDragging } = dragState;
      
      // Only move if we actually dragged (not just clicked)
      if (isDragging && (startPosition[0] !== currentPosition[0] || startPosition[1] !== currentPosition[1])) {
        const moveResult = movePlacement(placementId, currentPosition);
        
        if (!moveResult.success) {
          toast({
            title: "Cannot move here",
            description: moveResult.error,
            variant: "error",
            duration: 2000,
          });
        }
      }
      
      setDragState(null);
    }
    
    if (paintState) {
      setPaintState(null);
      setHoveredPlacementId(null);
      paintDataRef.current = { lastCell: null, lastPlacedPosition: null, lastPlacedSize: 1 };
    }
  }, [dragState, paintState, movePlacement, toast]);

  useEffect(() => {
    if (!paintState && !dragState) return;
    
    const handleDocumentMouseMove = (e: MouseEvent) => {
      const cellInfo = getGridCellClampedWithOffset(e.clientX, e.clientY);
      if (!cellInfo) return;
      
      if (dragState) {
        const placement = allPlacements.find(p => p.id === dragState.placementId);
        if (placement) {
          const adjustedPos = getAdjustedPosition(cellInfo.cell, cellInfo.offsetX, cellInfo.offsetY, placement.size);
          if (adjustedPos) {
            // Mark as dragging once mouse moves to a different position
            const hasMoved = adjustedPos[0] !== dragState.startPosition[0] || adjustedPos[1] !== dragState.startPosition[1];
            setDragState(prev => prev ? { 
              ...prev, 
              currentPosition: adjustedPos,
              isDragging: prev.isDragging || hasMoved,
            } : null);
          }
        } else {
          setDragState(prev => prev ? { ...prev, currentPosition: cellInfo.cell, isDragging: true } : null);
        }
      } else if (paintState) {
        handlePaintAtCell(cellInfo.cell, cellInfo.offsetX, cellInfo.offsetY, paintState.mode);
      }
    };
    
    const handleDocumentMouseUp = () => handleMouseUp();
    
    document.addEventListener("mousemove", handleDocumentMouseMove);
    document.addEventListener("mouseup", handleDocumentMouseUp);
    
    return () => {
      document.removeEventListener("mousemove", handleDocumentMouseMove);
      document.removeEventListener("mouseup", handleDocumentMouseUp);
    };
  }, [paintState, dragState, allPlacements, getGridCellClampedWithOffset, getAdjustedPosition, handlePaintAtCell, handleMouseUp]);

  const previewPosition = hoverInfo && selectedCropForPlacement
    ? getAdjustedPosition(hoverInfo.cell, hoverInfo.offsetX, hoverInfo.offsetY, selectedCropForPlacement.size)
    : null;
  
  const previewValidation = previewPosition && selectedCropForPlacement
    ? isValidPlacementPosition(previewPosition, selectedCropForPlacement.size)
    : null;
  
  const dragValidation = dragState
    ? (() => {
        const placement = allPlacements.find(p => p.id === dragState.placementId);
        if (!placement) return null;
        return isValidPlacement(dragState.currentPosition, placement.size, dragState.placementId);
      })()
    : null;
  
  return {
    hoveredPlacementId,
    setHoveredPlacementId,
    dragState,
    paintState,
    hoverInfo,
    previewPosition,
    previewValidation,
    dragValidation,
    handleMouseMove,
    handleMouseLeave,
    handleMouseDown,
    handleMouseUp,
    handleContextMenu,
    handlePlacementMouseDown,
  };
}
