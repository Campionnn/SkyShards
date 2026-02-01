import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, Trash2, FolderOpen, Search, Edit2, Check } from "lucide-react";
import type { SavedLayout } from "../../types/layout";
import { getCropPreviewColor } from "../../data/cropColors";
import { useGreenhouseData } from "../../context";

interface LoadLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (layout: SavedLayout) => void;
  onDelete: (layoutId: string) => void;
  onRename: (layoutId: string, newName: string) => void;
  layouts: SavedLayout[];
}

// Mini grid preview component
const LayoutPreview: React.FC<{ layout: SavedLayout }> = ({ layout }) => {
  const { getCropDef, getMutationDef } = useGreenhouseData();
  const cellSize = 14; // pixels
  const gap = 1; // pixels
  const gridSize = 10;

  // Create a map of position to crop info
  const cellMap = useMemo(() => {
    const map = new Map<string, { cropId: string; isTarget: boolean }>();

    // Add inputs - fill all cells based on crop size
    layout.inputs.forEach(placement => {
      const [row, col] = placement.position;
      const cropDef = getCropDef(placement.cropId);
      const mutationDef = getMutationDef(placement.cropId);
      const size = cropDef?.size || mutationDef?.size || 1;
      
      // Fill all cells this crop occupies
      for (let dr = 0; dr < size; dr++) {
        for (let dc = 0; dc < size; dc++) {
          map.set(`${row + dr},${col + dc}`, { cropId: placement.cropId, isTarget: false });
        }
      }
    });

    // Add targets - fill all cells based on mutation size
    layout.targets.forEach(placement => {
      const [row, col] = placement.position;
      const mutationDef = getMutationDef(placement.cropId);
      const cropDef = getCropDef(placement.cropId);
      const size = mutationDef?.size || cropDef?.size || 1;
      
      // Fill all cells this mutation occupies
      for (let dr = 0; dr < size; dr++) {
        for (let dc = 0; dc < size; dc++) {
          map.set(`${row + dr},${col + dc}`, { cropId: placement.cropId, isTarget: true });
        }
      }
    });

    return map;
  }, [layout, getCropDef, getMutationDef]);

  return (
    <div 
      className="inline-block bg-slate-950 rounded border border-slate-700/50 p-1"
      style={{
        width: gridSize * cellSize + (gridSize - 1) * gap + 8, // +8 for padding
        height: gridSize * cellSize + (gridSize - 1) * gap + 8,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`,
          gap: `${gap}px`,
        }}
      >
        {Array.from({ length: gridSize * gridSize }, (_, i) => {
          const row = Math.floor(i / gridSize);
          const col = i % gridSize;
          const cellData = cellMap.get(`${row},${col}`);

          const bgColor = cellData
            ? getCropPreviewColor(cellData.cropId, cellData.isTarget)
            : '#1e293b'; // slate-800 for empty cells

          return (
            <div
              key={i}
              style={{
                width: `${cellSize}px`,
                height: `${cellSize}px`,
                backgroundColor: bgColor,
                borderRadius: '2px',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

// Individual layout card
const LayoutCard: React.FC<{
  layout: SavedLayout;
  onLoad: () => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
}> = ({ layout, onLoad, onDelete, onRename }) => {
  const { getMutationDef } = useGreenhouseData();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(layout.name);
  const [renameError, setRenameError] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus rename input
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  // Get unique target mutations
  const targetMutations = useMemo(() => {
    const mutationMap = new Map<string, number>();
    layout.targets.forEach(target => {
      mutationMap.set(target.cropId, (mutationMap.get(target.cropId) || 0) + 1);
    });
    return Array.from(mutationMap.entries()).map(([cropId, count]) => ({
      cropId,
      count,
      def: getMutationDef(cropId),
    }));
  }, [layout.targets, getMutationDef]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleDelete = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    onDelete();
  };

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenameError("Name cannot be empty");
      return;
    }
    if (trimmed === layout.name) {
      // No change, just cancel
      setIsRenaming(false);
      setRenameValue(layout.name);
      setRenameError("");
      return;
    }
    // Call parent rename handler - it will handle duplicate checking
    onRename(trimmed);
    setIsRenaming(false);
    setRenameValue(trimmed);
    setRenameError("");
  };

  const handleRenameCancel = () => {
    setIsRenaming(false);
    setRenameValue(layout.name);
    setRenameError("");
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      handleRenameCancel();
    }
  };

  return (
    <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4 hover:border-slate-500/50 transition-colors">
      {/* Main Layout: Left side (info) and Right side (grid) */}
      <div className="flex gap-4">
        {/* Left side: Name and info */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="mb-2 min-w-0">
            {isRenaming ? (
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameValue}
                    onChange={(e) => {
                      setRenameValue(e.target.value);
                      setRenameError("");
                    }}
                    onKeyDown={handleRenameKeyDown}
                    onBlur={handleRenameSubmit}
                    className={`flex-1 min-w-0 px-2 py-1 bg-slate-900/60 border rounded text-sm text-slate-100 focus:outline-none ${
                      renameError 
                        ? 'border-red-500/50 focus:border-red-500/50' 
                        : 'border-slate-600/50 focus:border-emerald-500/50'
                    }`}
                    maxLength={50}
                  />
                  <button
                    onClick={handleRenameSubmit}
                    className="p-1 text-emerald-400 hover:text-emerald-300 flex-shrink-0"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
                {renameError && (
                  <p className="mt-1 text-xs text-red-400">{renameError}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h3 className="text-base font-medium text-slate-100 truncate flex-1">
                  {layout.name}
                </h3>
                <button
                  onClick={() => setIsRenaming(true)}
                  className="p-1 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Rename"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="text-xs text-slate-500 mt-0.5">
              Saved {formatDate(layout.savedAt)}
              {layout.modifiedAt !== layout.savedAt && (
                <span> • Modified {formatDate(layout.modifiedAt)}</span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm mb-3">
            <span className="text-slate-400">
              <span className="font-medium text-purple-400">{layout.targets.length}</span> targets
            </span>
            <span className="text-slate-400">
              <span className="font-medium text-emerald-400">{layout.inputs.length}</span> inputs
            </span>
          </div>

          {/* Target Mutations List */}
          {targetMutations.length > 0 && (
            <div className="mb-3 flex-1">
              <div className="text-xs text-slate-500 mb-1.5">Target Mutations:</div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {targetMutations.map(({ cropId, count, def }) => (
                  <div key={cropId} className="text-xs text-slate-300 flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: getCropPreviewColor(cropId, true) }}
                    />
                    <span className="truncate">
                      {def?.name || cropId.replace(/_/g, ' ')}
                      <span className="text-slate-500 ml-1">({count})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-auto">
            <button
              onClick={onLoad}
              className="flex-1 px-3 py-2 bg-emerald-500/80 hover:bg-emerald-500 rounded-lg text-sm text-white transition-colors flex items-center justify-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              Load Layout
            </button>
            <button
              onClick={handleDelete}
              onBlur={() => setShowDeleteConfirm(false)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${
                showDeleteConfirm
                  ? 'bg-red-500/80 text-white hover:bg-red-500'
                  : 'bg-slate-700/60 text-slate-300 hover:bg-red-500/10 hover:text-red-400'
              }`}
              title={showDeleteConfirm ? 'Click again to confirm' : 'Delete layout'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right side: Preview grid */}
        <div className="flex items-center justify-center">
          <LayoutPreview layout={layout} />
        </div>
      </div>
    </div>
  );
};

export const LoadLayoutModal: React.FC<LoadLayoutModalProps> = ({
  isOpen,
  onClose,
  onLoad,
  onDelete,
  onRename,
  layouts,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'saved' | 'name'>('saved');
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // Filter and sort layouts
  const filteredAndSortedLayouts = useMemo(() => {
    let filtered = layouts;

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = layouts.filter(layout =>
        layout.name.toLowerCase().includes(search)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'saved':
          return b.savedAt - a.savedAt;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return sorted;
  }, [layouts, searchTerm, sortBy]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] my-auto overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 border-b border-slate-700 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-100">Load Layout</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Sort Controls */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search layouts..."
                className="w-full pl-9 pr-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-slate-700/50 border border-slate-600/30 rounded-md text-sm text-slate-200 hover:bg-slate-700/70 focus:outline-none focus:border-slate-500 cursor-pointer transition-colors"
            >
              <option value="saved">Sort by Saved</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>

          {/* Results count */}
          <div className="mt-2 text-xs text-slate-500">
            {filteredAndSortedLayouts.length} {filteredAndSortedLayouts.length === 1 ? 'layout' : 'layouts'}
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredAndSortedLayouts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAndSortedLayouts.map(layout => (
                <LayoutCard
                  key={layout.id}
                  layout={layout}
                  onLoad={() => onLoad(layout)}
                  onDelete={() => onDelete(layout.id)}
                  onRename={(newName) => onRename(layout.id, newName)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">
                {searchTerm ? 'No layouts found matching your search' : 'No saved layouts'}
              </p>
              {!searchTerm && layouts.length === 0 && (
                <p className="text-slate-500 text-xs mt-2">
                  Save your first layout to see it here
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
