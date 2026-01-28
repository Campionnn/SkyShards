import React, { useMemo, useState, useRef, useCallback } from "react";
import { CheckCircle2, AlertCircle, Grid3X3, Eye, EyeOff, Zap, Target, TrendingUp, Clock, RotateCcw, Paintbrush } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GRID_SIZE } from "../../constants";
import { useGreenhouseData, useGridState, useLockedPlacements, useDesigner } from "../../context";
import { useGridPlacement } from "../../hooks";
import { getGridDimensions, getRarityTextColor } from "../../utilities";
import {
  GridBackground,
  LockedPlacementCell,
  PlacementPreview,
  DragValidationOverlay,
  CropCell,
  MutationCell,
} from "../grid";
import { useToast } from "../ui/toastContext";
import type { SolveResponse, CropPlacement, MutationResult, JobProgress } from "../../types/greenhouse";
import { getCropImagePath } from "../../types/greenhouse";

interface SolverResultsProps {
  result: SolveResponse | null;
  error: string | null;
  isLoading: boolean;
  progress?: JobProgress | null;
  queuePosition?: number | null;
  onClear?: () => void;
}

// Represents a crop/mutation placement on the grid
interface PlacementItem {
  id: string;
  name: string;
  size: number;
  startRow: number;
  startCol: number;
  locked?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getOccupiedCells(position: [number, number], size: number): [number, number][] {
  const cells: [number, number][] = [];
  for (let dr = 0; dr < size; dr++) {
    for (let dc = 0; dc < size; dc++) {
      cells.push([position[0] + dr, position[1] + dc]);
    }
  }
  return cells;
}

function processPlacementsToItems(
  placements: CropPlacement[],
  getCropDef: (id: string) => { name: string } | undefined,
  getMutationDef: (id: string) => { name: string } | undefined
): { items: PlacementItem[]; occupiedCells: Set<string> } {
  const items: PlacementItem[] = [];
  const occupiedCells = new Set<string>();

  for (const p of placements) {
    const cropDef = getCropDef(p.crop);
    const mutationDef = getMutationDef(p.crop);
    const displayName = cropDef?.name || mutationDef?.name || p.crop.replace(/_/g, " ");
    
    items.push({
      id: p.crop,
      name: displayName,
      size: p.size,
      startRow: p.position[0],
      startCol: p.position[1],
      locked: p.locked || false,
    });
    
    const cells = getOccupiedCells(p.position, p.size);
    for (const [row, col] of cells) {
      occupiedCells.add(`${row},${col}`);
    }
  }

  return { items, occupiedCells };
}

function processMutationsToItems(
  mutations: MutationResult[],
  getMutationDef: (id: string) => { name: string } | undefined
): PlacementItem[] {
  return mutations.map(m => {
    const mutationDef = getMutationDef(m.mutation);
    const displayName = mutationDef?.name || m.mutation.replace(/_/g, " ");
    
    return {
      id: m.mutation,
      name: displayName,
      size: m.size,
      startRow: m.position[0],
      startCol: m.position[1],
    };
  });
}

// =============================================================================
// Sub-Components
// =============================================================================

const LoadingState: React.FC = () => (
  <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
    <div className="flex items-center gap-2 mb-3">
      <Grid3X3 className="w-4 h-4 text-emerald-400" />
      <h3 className="text-sm font-medium text-slate-200">Solution</h3>
    </div>
    <div className="flex flex-col items-center justify-center py-8">
      <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3" />
      <span className="text-sm text-slate-400">Solving...</span>
    </div>
  </div>
);

const ErrorState: React.FC<{ error: string }> = ({ error }) => (
  <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
    <div className="flex items-center gap-2 mb-3">
      <AlertCircle className="w-4 h-4 text-red-400" />
      <h3 className="text-sm font-medium text-slate-200">Error</h3>
    </div>
    <div className="px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-md text-red-300 text-sm">
      {error}
    </div>
  </div>
);

const QueueBanner: React.FC<{ position: number }> = ({ position }) => (
  <div className="mb-4 bg-blue-500/20 border border-blue-500/30 rounded-lg px-4 py-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-blue-400" />
        <span className="text-sm text-slate-300">Position in queue:</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-blue-400">#{position}</span>
      </div>
    </div>
  </div>
);

const ProgressBar: React.FC<{ progress: JobProgress }> = ({ progress }) => (
  <div className="mb-4">
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400">{progress.phase}</span>
        {progress.percentage !== null && progress.percentage > 0 && (
          <span className="text-xs text-emerald-400">
            {Math.round(progress.percentage)}%
          </span>
        )}
      </div>
      {progress.percentage !== null && progress.percentage > 0 && (
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      )}
    </div>

    {progress.current_activity && (
      <p className="text-xs text-slate-400 mb-3">
        {progress.current_activity}
      </p>
    )}

    <div className="grid grid-cols-4 gap-2">
      <div className="bg-slate-700/30 rounded-md p-2">
        <div className="flex items-center gap-1 mb-0.5">
          <Zap className="w-3 h-3 text-emerald-400" />
          <span className="text-xs text-slate-400">Solutions</span>
        </div>
        <span className="text-base font-semibold text-slate-200">
          {progress.solutions_found}
        </span>
      </div>

      {progress.best_objective !== null && (
        <div className="bg-slate-700/30 rounded-md p-2">
          <div className="flex items-center gap-1 mb-0.5">
            <Target className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-slate-400">Best Obj</span>
          </div>
          <span className="text-base font-semibold text-slate-200">
            {progress.best_objective}
          </span>
        </div>
      )}

      {progress.best_bound !== null && (
        <div className="bg-slate-700/30 rounded-md p-2">
          <div className="flex items-center gap-1 mb-0.5">
            <TrendingUp className="w-3 h-3 text-yellow-400" />
            <span className="text-xs text-slate-400">Best Bound</span>
          </div>
          <span className="text-base font-semibold text-slate-200">
            {progress.best_bound.toFixed(1)}
          </span>
        </div>
      )}

      {progress.elapsed_seconds !== null && (
        <div className="bg-slate-700/30 rounded-md p-2">
          <div className="flex items-center gap-1 mb-0.5">
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="text-xs text-slate-400">Elapsed</span>
          </div>
          <span className="text-base font-semibold text-slate-200">
            {(() => {
              const elapsedTime = Math.round(progress.elapsed_seconds);
              const minutes = Math.floor(elapsedTime / 60);
              const seconds = elapsedTime % 60;
              return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
            })()}
          </span>
        </div>
      )}
    </div>
  </div>
);

const StatusMessage: React.FC<{
  hoveredPlacementId: string | null;
  isPlacementMode: boolean;
  hoverInfo: { cell: [number, number] } | null;
  hasResult: boolean;
}> = ({ hoveredPlacementId, isPlacementMode, hoverInfo, hasResult }) => {
  const getMessage = () => {
    if (hoveredPlacementId && isPlacementMode) {
      return (
        <span>
          <span className="font-semibold text-emerald-400">Click to place crops</span>,{" "}
          <span className="font-semibold text-red-400">right-click to remove</span>
          {!hasResult && <><br />press escape to stop placement</>}
        </span>
      );
    }
    if (hoveredPlacementId && !isPlacementMode) {
      return (
        <span>
          Drag to move, <span className="font-semibold text-red-400">right-click to remove</span>
        </span>
      );
    }
    if (isPlacementMode && hoverInfo) {
      return (
        <span>
          <span className="font-semibold text-emerald-400">Click to place crops</span>, right-click to remove
          {!hasResult && <><br />press escape to stop placement</>}
        </span>
      );
    }
    if (isPlacementMode) {
      return hasResult 
        ? "Click to place crops, right-click to remove"
        : "Click to place crops, right-click to remove\npress escape to stop placement";
    }
    return hasResult 
      ? "Drag locked placements to move, right-click to remove"
      : "Configure your targets and click \"Solve\" to find the optimal crop placement";
  };

  return (
    <div className="text-center py-2 text-slate-500 text-sm">
      {getMessage()}
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const SolverResults: React.FC<SolverResultsProps> = ({
  result,
  error,
  isLoading,
  progress,
  queuePosition,
  onClear,
}) => {
  const { getCropDef, getMutationDef } = useGreenhouseData();
  const { unlockedCells } = useGridState();
  const { lockedPlacements, selectedCropForPlacement, isPlacementMode } = useLockedPlacements();
  const { loadFromSolverResult } = useDesigner();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [showMutations, setShowMutations] = useState(true);
  
  // Handle sending current grid content to designer
  const handleSendToDesigner = useCallback(() => {
    // Collect all placements to send as inputs:
    // 1. Locked placements from the calculator
    // 2. Solver result crops (if any)
    const inputs: Array<{ name: string; position: [number, number]; size: number }> = [];
    const targets: Array<{ name: string; position: [number, number]; size: number }> = [];
    
    // Add locked placements as inputs
    for (const placement of lockedPlacements) {
      inputs.push({
        name: placement.crop,
        position: placement.position,
        size: placement.size,
      });
    }
    
    // Add solver result placements as inputs (if we have results)
    if (result) {
      for (const placement of result.placements || []) {
        // Skip if this overlaps with a locked placement (locked placements take priority)
        const overlapsWithLocked = lockedPlacements.some(locked => {
          const [lr, lc] = locked.position;
          const [pr, pc] = placement.position;
          const noOverlap = 
            pr + placement.size <= lr || lr + locked.size <= pr ||
            pc + placement.size <= lc || lc + locked.size <= pc;
          return !noOverlap;
        });
        
        if (!overlapsWithLocked) {
          inputs.push({
            name: placement.crop,
            position: placement.position,
            size: placement.size,
          });
        }
      }
      
      // Add mutations as targets
      for (const mutation of result.mutations || []) {
        targets.push({
          name: mutation.mutation,
          position: mutation.position,
          size: mutation.size,
        });
      }
    }
    
    if (inputs.length === 0 && targets.length === 0) {
      toast({
        title: "Nothing to send",
        description: "Place some locked crops or solve first",
        variant: "warning",
        duration: 3000,
      });
      return;
    }
    
    loadFromSolverResult(inputs, targets);
    
    toast({
      title: "Sent to Designer",
      description: `Loaded ${inputs.length} inputs and ${targets.length} targets`,
      variant: "success",
      duration: 3000,
    });
    
    navigate("/designer");
  }, [lockedPlacements, result, loadFromSolverResult, toast, navigate]);
  
  // Grid configuration
  const gridRef = useRef<HTMLDivElement>(null);
  const cellSize = 48;
  const gap = 2;
  const { width: gridWidth, height: gridHeight } = getGridDimensions(cellSize, gap);
  
  // Use the shared grid placement hook
  const {
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
  } = useGridPlacement({ cellSize, gap, gridRef });
  
  // Build ground type maps for solver results
  const cropGrounds = useMemo(() => {
    const grounds = new Map<string, string>();
    if (result) {
      (result.placements || []).forEach((p) => {
        const cropDef = getCropDef(p.crop);
        const mutationDef = getMutationDef(p.crop);
        grounds.set(p.crop, cropDef?.ground || mutationDef?.ground || "farmland");
      });
    }
    return grounds;
  }, [result, getCropDef, getMutationDef]);

  const mutationGrounds = useMemo(() => {
    const grounds = new Map<string, string>();
    if (result) {
      (result.mutations || []).forEach((m) => {
        const mutationDef = getMutationDef(m.mutation);
        const cropDef = getCropDef(m.mutation);
        grounds.set(m.mutation, cropDef?.ground || mutationDef?.ground || "farmland");
      });
    }
    return grounds;
  }, [result, getMutationDef, getCropDef]);

  // Process placements
  const { items: cropItems, occupiedCells } = useMemo(() => {
    if (!result) return { items: [], occupiedCells: new Set<string>() };
    return processPlacementsToItems(result.placements || [], getCropDef, getMutationDef);
  }, [result, getCropDef, getMutationDef]);

  const mutationItems = useMemo(() => {
    if (!result || !result.mutations) return [];
    return processMutationsToItems(result.mutations, getMutationDef);
  }, [result, getMutationDef]);

  // Early returns for loading/error states
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  // Render interactive grid (shared between empty and results states)
  const renderInteractiveGrid = (showOccupied: boolean = false) => (
    <div className="w-full overflow-x-auto">
      <div
        ref={gridRef}
        className="relative mx-auto select-none"
        style={{
          width: gridWidth,
          height: gridHeight,
          minWidth: gridWidth,
          cursor: isPlacementMode ? "crosshair" : "default",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        onMouseUp={handleMouseUp}
      >
        {/* Background grid - filter out occupied cells when showing results */}
        {showOccupied ? (
          Array.from({ length: GRID_SIZE }).flatMap((_, rowIndex) =>
            Array.from({ length: GRID_SIZE }).map((_, colIndex) => {
              const key = `${rowIndex},${colIndex}`;
              if (occupiedCells.has(key)) return null;
              const isUnlocked = unlockedCells.has(key);
              return (
                <div
                  key={key}
                  style={{
                    position: "absolute",
                    top: rowIndex * (cellSize + gap),
                    left: colIndex * (cellSize + gap),
                    width: cellSize,
                    height: cellSize,
                  }}
                  className={`rounded ${
                    isUnlocked
                      ? "bg-emerald-600/40 border border-emerald-500/30"
                      : "bg-slate-700/30 border border-slate-600/20"
                  }`}
                />
              );
            })
          )
        ) : (
          <GridBackground cellSize={cellSize} gap={gap} unlockedCells={unlockedCells} />
        )}

        {/* Solver result crops */}
        {cropItems.map((item, index) => (
          <CropCell
            key={`${item.id}-${item.startRow}-${item.startCol}-${index}`}
            id={item.id}
            name={item.name}
            position={[item.startRow, item.startCol]}
            size={item.size}
            groundType={cropGrounds.get(item.id) || "farmland"}
            cellSize={cellSize}
            gap={gap}
            isLocked={item.locked}
          />
        ))}

        {/* Solver result mutations */}
        {mutationItems.map((item, index) => (
          <MutationCell
            key={`mutation-${item.id}-${item.startRow}-${item.startCol}-${index}`}
            id={item.id}
            name={item.name}
            position={[item.startRow, item.startCol]}
            size={item.size}
            groundType={mutationGrounds.get(item.id) || "farmland"}
            cellSize={cellSize}
            gap={gap}
            showImage={showMutations}
          />
        ))}

        {/* Locked placements */}
        {lockedPlacements.map((placement) => {
          const isDragging = dragState?.placementId === placement.id;
          const isHovered = hoveredPlacementId === placement.id && !isDragging && !isPlacementMode;
          const displayPlacement = isDragging
            ? { ...placement, position: dragState.currentPosition }
            : placement;

          return (
            <LockedPlacementCell
              key={placement.id}
              placement={displayPlacement}
              cellSize={cellSize}
              gap={gap}
              isDragging={isDragging}
              isHovered={isHovered}
              isPlacementMode={isPlacementMode}
              onMouseDown={(e) => handlePlacementMouseDown(placement.id, e)}
              onMouseEnter={() => setHoveredPlacementId(placement.id)}
              onMouseLeave={() => setHoveredPlacementId(null)}
            />
          );
        })}

        {/* Drag validation overlay */}
        {dragState && dragValidation && (
          <DragValidationOverlay
            position={dragState.currentPosition}
            size={lockedPlacements.find(p => p.id === dragState.placementId)?.size ?? 1}
            cellSize={cellSize}
            gap={gap}
            isValid={dragValidation.valid}
          />
        )}

        {/* Placement preview */}
        {previewPosition && selectedCropForPlacement && !dragState && !paintState && (
          <PlacementPreview
            position={previewPosition}
            crop={selectedCropForPlacement}
            isValid={previewValidation?.valid ?? false}
            cellSize={cellSize}
            gap={gap}
          />
        )}
      </div>
    </div>
  );

  // Empty state (no result yet)
  if (!result) {
    return (
      <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Grid3X3 className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-medium text-slate-400">Solution</h3>
          {lockedPlacements.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleSendToDesigner}
                className="px-2 py-1 text-xs bg-purple-500/50 hover:bg-purple-500/70 rounded text-slate-200 transition-colors flex items-center gap-1"
                title="Send locked placements to Designer"
              >
                <Paintbrush className="w-3 h-3" />
                Designer
              </button>
            </div>
          )}
        </div>

        {queuePosition !== null && queuePosition !== undefined && (
          <QueueBanner position={queuePosition} />
        )}

        <div className="mb-4">
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
            Grid Layout
          </h4>
          {renderInteractiveGrid(false)}
        </div>

        <StatusMessage
          hoveredPlacementId={hoveredPlacementId}
          isPlacementMode={isPlacementMode}
          hoverInfo={hoverInfo}
          hasResult={false}
        />
      </div>
    );
  }

  // Result state
  const isOptimal = result.status === "OPTIMAL";
  const isSolving = progress !== null && progress !== undefined;

  return (
    <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {isOptimal ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        ) : isSolving ? (
          <div className="w-4 h-4 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        ) : (
          <AlertCircle className="w-4 h-4 text-yellow-400" />
        )}
        <h3 className="text-sm font-medium text-slate-200">
          {isSolving ? "Current Best Solution" : "Solution"}
        </h3>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleSendToDesigner}
            className="px-2 py-1 text-xs bg-purple-500/50 hover:bg-purple-500/70 rounded text-slate-200 transition-colors flex items-center gap-1"
            title="Send to Designer"
          >
            <Paintbrush className="w-3 h-3" />
            Designer
          </button>
          {onClear && (
            <button
              onClick={onClear}
              className="px-2 py-1 text-xs bg-slate-600/50 hover:bg-slate-600/70 rounded text-slate-300 transition-colors flex items-center gap-1"
              title="Clear results"
            >
              <RotateCcw className="w-3 h-3" />
              Clear
            </button>
          )}
          {result.cache_hit && (
            <span className="text-xs text-slate-500">cached</span>
          )}
        </div>
      </div>

      {/* Status */}
      {!isSolving && (
        <div
          className={`px-3 py-2 rounded-md text-sm mb-4 ${
            isOptimal
              ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
              : "bg-yellow-500/20 border border-yellow-500/30 text-yellow-300"
          }`}
        >
          {isOptimal ? "Optimal solution found!" : `Status: ${result.status}`}
        </div>
      )}

      {/* Progress */}
      {progress && <ProgressBar progress={progress} />}

      {/* Grid Layout */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Grid Layout
          </h4>
          <button
            onClick={() => setShowMutations(!showMutations)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 hover:text-slate-200"
            title={showMutations ? "Hide mutation overlays" : "Show mutation overlays"}
          >
            {showMutations ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide Target Mutations</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Show Target Mutations</span>
              </>
            )}
          </button>
        </div>
        {renderInteractiveGrid(true)}
      </div>

      <StatusMessage
        hoveredPlacementId={hoveredPlacementId}
        isPlacementMode={isPlacementMode}
        hoverInfo={hoverInfo}
        hasResult={true}
      />

      {/* Mutation Summary */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
          Mutations
        </h4>
        <div className="space-y-2">
          {(() => {
            const mutationMap = new Map<string, number>();
            (result.mutations || []).forEach((m) => {
              mutationMap.set(m.mutation, (mutationMap.get(m.mutation) || 0) + 1);
            });
            return Array.from(mutationMap.entries()).map(([mutationId, count]) => {
              const mutationDef = getMutationDef(mutationId);
              const displayName = mutationDef?.name || mutationId.replace(/_/g, " ");

              return (
                <div
                  key={mutationId}
                  className="flex items-center justify-between bg-slate-700/30 rounded-md px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={getCropImagePath(mutationId)}
                      alt={displayName}
                      className="w-5 h-5 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <span className={`text-sm ${mutationDef ? getRarityTextColor(mutationDef.rarity) : "text-slate-200"}`}>{displayName}</span>
                  </div>
                  <span className="text-sm font-medium text-emerald-400">x{count}</span>
                </div>
              );
            });
          })()}
          {(!result.mutations || result.mutations.length === 0) && (
            <div className="text-center py-2 text-xs text-slate-500">
              No mutations found
            </div>
          )}
        </div>
      </div>

      {/* Crop Placements */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
          Crop Placements
        </h4>
        <div className="flex flex-wrap gap-2">
          {(() => {
            const placementMap = new Map<string, number>();
            (result.placements || []).forEach((p) => {
              placementMap.set(p.crop, (placementMap.get(p.crop) || 0) + 1);
            });
            return Array.from(placementMap.entries()).map(([cropId, count]) => {
              const cropDef = getCropDef(cropId);
              const mutationDef = getMutationDef(cropId);
              const displayName = cropDef?.name || mutationDef?.name || cropId.replace(/_/g, " ");

              return (
                <div
                  key={cropId}
                  className="flex items-center gap-2 bg-slate-700/30 rounded-md px-2 py-1"
                >
                  <img
                    src={getCropImagePath(cropId)}
                    alt={displayName}
                    className="w-5 h-5 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <span className="text-xs text-slate-300">{displayName}</span>
                  <span className="text-xs text-slate-500">x{count}</span>
                </div>
              );
            });
          })()}
          {(!result.placements || result.placements.length === 0) && (
            <div className="text-center py-2 text-xs text-slate-500">
              No crops placed
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
