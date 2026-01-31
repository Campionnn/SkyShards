import { useState, useRef, useCallback, useEffect } from "react";
import {
  getGridCellWithOffset as getGridCellWithOffsetUtil,
  getGridCellClampedWithOffset as getGridCellClampedWithOffsetUtil,
  getPlacementPosition,
  findNearestValidPosition,
  doPlacementsOverlap,
  type CellWithOffset,
} from "../utilities";
import { useLockedPlacements } from "../context";
import { useToast } from "../components/ui/toastContext";
// Types imported for documentation purposes but used via context

export interface DragState {
  placementId: string;
  startPosition: [number, number];
  currentPosition: [number, number];
}

export interface PaintState {
  mode: "place" | "remove";
}

export interface HoverInfo {
  cell: [number, number];
  offsetX: number;
  offsetY: number;
}

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
  
  // UI state
  const [hoveredPlacementId, setHoveredPlacementId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [paintState, setPaintState] = useState<PaintState | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  
  // Paint tracking ref (avoids stale closure issues during fast mouse movement)
  const paintDataRef = useRef<{
    lastCell: [number, number] | null;
    lastPlacedPosition: [number, number] | null;
    lastPlacedSize: number;
  }>({ lastCell: null, lastPlacedPosition: null, lastPlacedSize: 1 });

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
  
  // Wrapper for isValidPlacementPosition to match function signature expected by findNearestValidPosition
  const isValidPositionFn = useCallback((pos: [number, number], size: number) => {
    return isValidPlacementPosition(pos, size);
  }, [isValidPlacementPosition]);
  
  // Get the adjusted position for placement (position calculation + snap to valid)
  const getAdjustedPosition = useCallback((
    cursorCell: [number, number],
    offsetX: number,
    offsetY: number,
    size: number
  ): [number, number] | null => {
    const basePos = getPlacementPosition(cursorCell, offsetX, offsetY, size);
    return findNearestValidPosition(basePos, size, isValidPositionFn);
  }, [isValidPositionFn]);
  
  // Place a crop at the given position with offset info
  const placeCropAtPosition = useCallback((
    cursorCell: [number, number],
    offsetX: number,
    offsetY: number
  ): [number, number] | null => {
    if (!selectedCropForPlacement) return null;
    
    const adjustedPos = getAdjustedPosition(cursorCell, offsetX, offsetY, selectedCropForPlacement.size);
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
  }, [selectedCropForPlacement, getAdjustedPosition, addLockedPlacement, toast]);
  
  // Remove any placement at the given cell
  const removeAtCell = useCallback((cell: [number, number]) => {
    const placement = getLockedPlacementAt(cell[0], cell[1]);
    if (placement) {
      removeLockedPlacement(placement.id);
    }
  }, [getLockedPlacementAt, removeLockedPlacement]);
  
  // Core painting logic
  const handlePaintAtCell = useCallback((
    cell: [number, number],
    offsetX: number,
    offsetY: number,
    mode: "place" | "remove"
  ) => {
    const { lastCell, lastPlacedPosition, lastPlacedSize } = paintDataRef.current;
    
    // Only act if we moved to a new cell
    if (lastCell && lastCell[0] === cell[0] && lastCell[1] === cell[1]) {
      return;
    }
    
    if (mode === "place" && selectedCropForPlacement) {
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
    } else if (mode === "remove") {
      removeAtCell(cell);
      paintDataRef.current = { ...paintDataRef.current, lastCell: cell };
    }
  }, [selectedCropForPlacement, getAdjustedPosition, placeCropAtPosition, removeAtCell]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const cellInfo = getGridCellWithOffset(e.clientX, e.clientY);
    
    if (dragState) {
      if (cellInfo) {
        const placement = lockedPlacements.find(p => p.id === dragState.placementId);
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
  }, [getGridCellWithOffset, dragState, paintState, isPlacementMode, handlePaintAtCell, lockedPlacements, getAdjustedPosition]);
  
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
      removeLockedPlacement(placementId);
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
      
      const placement = lockedPlacements.find(p => p.id === placementId);
      if (placement) {
        setDragState({
          placementId,
          startPosition: placement.position,
          currentPosition: placement.position,
        });
      }
    }
  }, [lockedPlacements, removeLockedPlacement, isPlacementMode]);
  
  const handleMouseUp = useCallback(() => {
    if (dragState) {
      const { placementId, startPosition, currentPosition } = dragState;
      
      if (startPosition[0] !== currentPosition[0] || startPosition[1] !== currentPosition[1]) {
        const moveResult = moveLockedPlacement(placementId, currentPosition);
        
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
  }, [dragState, paintState, moveLockedPlacement, toast]);

  useEffect(() => {
    if (!paintState && !dragState) return;
    
    const handleDocumentMouseMove = (e: MouseEvent) => {
      const cellInfo = getGridCellClampedWithOffset(e.clientX, e.clientY);
      if (!cellInfo) return;
      
      if (dragState) {
        const placement = lockedPlacements.find(p => p.id === dragState.placementId);
        if (placement) {
          const adjustedPos = getAdjustedPosition(cellInfo.cell, cellInfo.offsetX, cellInfo.offsetY, placement.size);
          if (adjustedPos) {
            setDragState(prev => prev ? { ...prev, currentPosition: adjustedPos } : null);
          }
        } else {
          setDragState(prev => prev ? { ...prev, currentPosition: cellInfo.cell } : null);
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
  }, [paintState, dragState, lockedPlacements, getGridCellClampedWithOffset, getAdjustedPosition, handlePaintAtCell, handleMouseUp]);

  const previewPosition = hoverInfo && selectedCropForPlacement
    ? getAdjustedPosition(hoverInfo.cell, hoverInfo.offsetX, hoverInfo.offsetY, selectedCropForPlacement.size)
    : null;
  
  const previewValidation = previewPosition && selectedCropForPlacement
    ? isValidPlacementPosition(previewPosition, selectedCropForPlacement.size)
    : null;
  
  const dragValidation = dragState
    ? (() => {
        const placement = lockedPlacements.find(p => p.id === dragState.placementId);
        if (!placement) return null;
        return isValidPlacement(dragState.currentPosition, placement.size, dragState.placementId);
      })()
    : null;
  
  return {
    // State
    hoveredPlacementId,
    setHoveredPlacementId,
    dragState,
    paintState,
    hoverInfo,
    
    // Computed values
    previewPosition,
    previewValidation,
    dragValidation,
    
    // Event handlers
    handleMouseMove,
    handleMouseLeave,
    handleMouseDown,
    handleMouseUp,
    handleContextMenu,
    handlePlacementMouseDown,
    
    // Utility functions
    getAdjustedPosition,
  };
}
