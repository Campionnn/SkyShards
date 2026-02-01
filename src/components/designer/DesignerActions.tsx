import React, { useCallback, useState, useEffect, type RefObject } from "react";
import { Save, FolderOpen, Copy, Clipboard, Trash2, RotateCcw, Layers, X, Image, Film, Download, ClipboardCopy, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDesigner, useGreenhouseData } from "../../context";
import { useToast } from "../ui/toastContext";
import { encodeDesign, decodeDesign } from "../../utilities";
import { 
  loadLayouts, 
  saveLayouts,
  deleteLayout,
  renameLayout,
  updateLayout,
  generateLayoutId,
} from "../../utilities/layoutStorage";
import {
  captureGridAsPng,
  captureGridAsGif,
  copyBlobToClipboard,
  downloadBlob,
  aggregateCropInfo,
  type ExportOptions,
} from "../../utilities/gridExport";
import type { SavedLayout } from "../../types/layout";
import type { DesignerGridHandle } from "./DesignerGrid";
import { SaveLayoutModal } from "./SaveLayoutModal";
import { LoadLayoutModal } from "./LoadLayoutModal";

interface DesignerActionsProps {
  className?: string;
  gridRef?: RefObject<DesignerGridHandle | null>;
  showTargets?: boolean;
}

type ExportFormat = "png" | "gif";
type ExportStep = "choose-format" | "exporting" | "choose-action";

export const DesignerActions: React.FC<DesignerActionsProps> = ({ 
  className = "",
  gridRef,
  showTargets = true,
}) => {
  const { 
    mode, 
    setMode,
    inputPlacements, 
    targetPlacements, 
    clearInputPlacements, 
    clearTargetPlacements,
    clearAllPlacements,
    loadFromSolverResult,
    selectedCropForPlacement,
    setSelectedCropForPlacement,
  } = useDesigner();
  const { getCropDef, getMutationDef } = useGreenhouseData();
  const { toast } = useToast();
  
  // State for modals
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>([]);
  
  // Export state
  const [exportStep, setExportStep] = useState<ExportStep>("choose-format");
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentExportBlob, setCurrentExportBlob] = useState<Blob | null>(null);
  
  // Reload layouts when load modal opens
  useEffect(() => {
    if (isLoadModalOpen) {
      setSavedLayouts(loadLayouts());
    }
  }, [isLoadModalOpen]);
  
  // Reset export state
  const resetExportState = useCallback(() => {
    setExportStep("choose-format");
    setExportFormat(null);
    setExportProgress(0);
    setCurrentExportBlob(null);
  }, []);
  
  // Handle mode change with auto-deselect
  const handleModeChange = useCallback((newMode: "inputs" | "targets") => {
    setMode(newMode);
    
    // If switching to targets and a non-mutation crop is selected, deselect it
    if (newMode === "targets" && selectedCropForPlacement && !selectedCropForPlacement.isMutation) {
      setSelectedCropForPlacement(null);
    }
  }, [setMode, selectedCropForPlacement, setSelectedCropForPlacement]);
  
  // Open save modal
  const handleOpenSave = useCallback(() => {
    if (inputPlacements.length === 0 && targetPlacements.length === 0) {
      return; // Button is disabled, but just in case
    }
    setIsSaveModalOpen(true);
  }, [inputPlacements.length, targetPlacements.length]);
  
  // Save layout
  const handleSaveLayout = useCallback((name: string, overwriteId?: string) => {
    const now = Date.now();
    
    if (overwriteId) {
      // Overwrite existing layout
      const success = updateLayout(overwriteId, {
        name,
        modifiedAt: now,
        inputs: inputPlacements.map(p => ({
          cropId: p.cropId,
          position: p.position,
        })),
        targets: targetPlacements.map(p => ({
          cropId: p.cropId,
          position: p.position,
        })),
      });
      
      if (success) {
        setIsSaveModalOpen(false);
        toast({
          title: "Layout updated",
          description: `"${name}" has been updated`,
          variant: "success",
          duration: 3000,
        });
      } else {
        toast({
          title: "Failed to update layout",
          variant: "error",
          duration: 3000,
        });
      }
    } else {
      // Create new layout
      const newLayout: SavedLayout = {
        id: generateLayoutId(),
        name,
        savedAt: now,
        modifiedAt: now,
        inputs: inputPlacements.map(p => ({
          cropId: p.cropId,
          position: p.position,
        })),
        targets: targetPlacements.map(p => ({
          cropId: p.cropId,
          position: p.position,
        })),
      };
      
      const layouts = loadLayouts();
      layouts.push(newLayout);
      saveLayouts(layouts);
      
      setIsSaveModalOpen(false);
      toast({
        title: "Layout saved",
        description: `"${name}" has been saved`,
        variant: "success",
        duration: 3000,
      });
    }
  }, [inputPlacements, targetPlacements, toast]);
  
  // Open load modal
  const handleOpenLoad = useCallback(() => {
    const layouts = loadLayouts();
    if (layouts.length === 0) {
      toast({
        title: "No saved layouts",
        description: "Save a layout first before loading",
        variant: "warning",
        duration: 3000,
      });
      return;
    }
    setSavedLayouts(layouts);
    setIsLoadModalOpen(true);
  }, [toast]);
  
  // Load layout
  const handleLoadLayout = useCallback((layout: SavedLayout) => {
    // Get size and name info from crop definitions
    const crops = layout.inputs.map(p => {
      const cropDef = getCropDef(p.cropId);
      const mutationDef = getMutationDef(p.cropId);
      const displayName = cropDef?.name || mutationDef?.name || p.cropId.replace(/_/g, " ");
      return {
        id: p.cropId,
        name: displayName,
        position: p.position,
        size: cropDef?.size || mutationDef?.size || 1,
      };
    });
    
    const mutations = layout.targets.map(p => {
      const mutationDef = getMutationDef(p.cropId);
      const cropDef = getCropDef(p.cropId);
      const displayName = mutationDef?.name || cropDef?.name || p.cropId.replace(/_/g, " ");
      return {
        id: p.cropId,
        name: displayName,
        position: p.position,
        size: mutationDef?.size || cropDef?.size || 1,
      };
    });
    
    loadFromSolverResult(crops, mutations);
    setIsLoadModalOpen(false);
    
    toast({
      title: "Layout loaded",
      description: `"${layout.name}" has been loaded`,
      variant: "success",
      duration: 3000,
    });
  }, [loadFromSolverResult, getCropDef, getMutationDef, toast]);
  
  // Delete layout
  const handleDeleteLayout = useCallback((layoutId: string) => {
    const success = deleteLayout(layoutId);
    if (success) {
      setSavedLayouts(loadLayouts());
      toast({
        title: "Layout deleted",
        variant: "success",
        duration: 2000,
      });
    } else {
      toast({
        title: "Failed to delete layout",
        variant: "error",
        duration: 3000,
      });
    }
  }, [toast]);
  
  // Rename layout
  const handleRenameLayout = useCallback((layoutId: string, newName: string) => {
    const success = renameLayout(layoutId, newName);
    if (success) {
      setSavedLayouts(loadLayouts());
      toast({
        title: "Layout renamed",
        description: `Renamed to "${newName}"`,
        variant: "success",
        duration: 2000,
      });
    } else {
      toast({
        title: "Failed to rename layout",
        variant: "error",
        duration: 3000,
      });
    }
  }, [toast]);
  
  // State for import modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  
  // Export design as base64 gzipped string to clipboard
  const handleExportCode = useCallback(() => {
    try {
      const encoded = encodeDesign(inputPlacements, targetPlacements);
      navigator.clipboard.writeText(encoded);
      
      toast({
        title: "Design copied to clipboard",
        description: "Share this code with others to share your design",
        variant: "success",
        duration: 3000,
      });
    } catch (err) {
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Failed to encode design",
        variant: "error",
        duration: 5000,
      });
    }
  }, [inputPlacements, targetPlacements, toast]);
  
  // Open import modal
  const handleOpenImport = useCallback(() => {
    setImportText("");
    setIsImportModalOpen(true);
  }, []);
  
  // Import design from base64 gzipped string
  const handleImportFromText = useCallback(() => {
    if (!importText.trim()) {
      toast({
        title: "No code provided",
        description: "Paste a design code to import",
        variant: "warning",
        duration: 3000,
      });
      return;
    }
    
    try {
      const { inputs, targets } = decodeDesign(importText.trim());
      
      // Get size info from crop definitions
      const crops = inputs.map(p => {
        const cropDef = getCropDef(p.cropId);
        const mutationDef = getMutationDef(p.cropId);
        const displayName = cropDef?.name || mutationDef?.name || p.cropId.replace(/_/g, " ");
        return {
          id: p.cropId,
          name: displayName,
          position: p.position,
          size: cropDef?.size || mutationDef?.size || 1,
        };
      });
      
      const mutations = targets.map(p => {
        const mutationDef = getMutationDef(p.cropId);
        const cropDef = getCropDef(p.cropId);
        const displayName = mutationDef?.name || cropDef?.name || p.cropId.replace(/_/g, " ");
        return {
          id: p.cropId,
          name: displayName,
          position: p.position,
          size: mutationDef?.size || cropDef?.size || 1,
        };
      });
      
      loadFromSolverResult(crops, mutations);
      setIsImportModalOpen(false);
      setImportText("");
      
      toast({
        title: "Design imported",
        description: `Loaded ${inputs.length} inputs and ${targets.length} targets`,
        variant: "success",
        duration: 3000,
      });
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Invalid design code",
        variant: "error",
        duration: 5000,
      });
    }
  }, [importText, loadFromSolverResult, getCropDef, getMutationDef, toast]);
  
  // Clear current mode's placements
  const handleClearCurrent = useCallback(() => {
    if (mode === "inputs") {
      clearInputPlacements();
      toast({ title: "Input placements cleared", variant: "success", duration: 2000 });
    } else {
      clearTargetPlacements();
      toast({ title: "Target placements cleared", variant: "success", duration: 2000 });
    }
  }, [mode, clearInputPlacements, clearTargetPlacements, toast]);
  
  // Clear all placements
  const handleClearAll = useCallback(() => {
    if (confirm("Clear all input and target placements?")) {
      clearAllPlacements();
      toast({ title: "All placements cleared", variant: "success", duration: 2000 });
    }
  }, [clearAllPlacements, toast]);
  
  // Get export options
  const getExportOptions = useCallback((): ExportOptions => {
    const inputCrops = aggregateCropInfo(inputPlacements);
    const targetCrops = showTargets ? aggregateCropInfo(targetPlacements) : [];
    
    return {
      scale: 2,
      includeWatermark: true,
      watermarkUrl: "greenhouse.skyshards.com",
      watermarkTitle: "Greenhouse Designer",
      inputCrops,
      targetCrops,
      showTargets,
    };
  }, [inputPlacements, targetPlacements, showTargets]);
  
  // Handle export format selection
  const handleSelectExportFormat = useCallback(async (format: ExportFormat) => {
    if (!gridRef?.current) {
      toast({
        title: "Export failed",
        description: "Grid not available for export",
        variant: "error",
        duration: 3000,
      });
      return;
    }
    
    const gridElement = gridRef.current.getGridElement();
    if (!gridElement) {
      toast({
        title: "Export failed",
        description: "Grid element not found",
        variant: "error",
        duration: 3000,
      });
      return;
    }
    
    setExportFormat(format);
    setExportStep("exporting");
    setExportProgress(0);
    
    try {
      const options = getExportOptions();
      let result;
      
      if (format === "png") {
        result = await captureGridAsPng(gridElement, options);
        // PNG: show copy/download options
        setCurrentExportBlob(result.blob);
        setExportStep("choose-action");
      } else {
        // GIF: auto-download (clipboard doesn't support GIF well)
        const cropIds = [
          ...inputPlacements.map(p => p.cropId),
          ...(showTargets ? targetPlacements.map(p => p.cropId) : []),
        ];
        result = await captureGridAsGif(gridElement, options, cropIds, setExportProgress);
        
        // Auto-download the GIF
        const filename = `SkyShards-designer-${Date.now()}.gif`;
        downloadBlob(result.blob, filename);
        
        toast({
          title: "GIF Downloaded!",
          description: `Saved as ${filename}`,
          variant: "success",
          duration: 3000,
        });
        resetExportState();
      }
    } catch (err) {
      console.error("Export failed:", err);
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Failed to capture grid",
        variant: "error",
        duration: 5000,
      });
      resetExportState();
    }
  }, [gridRef, getExportOptions, inputPlacements, targetPlacements, showTargets, toast, resetExportState]);
  
  // Handle download
  const handleDownload = useCallback(() => {
    if (!currentExportBlob) return;
    
    const filename = `SkyShards-designer-${Date.now()}.${exportFormat}`;
    downloadBlob(currentExportBlob, filename);
    
    toast({
      title: "Downloaded!",
      description: `Saved as ${filename}`,
      variant: "success",
      duration: 3000,
    });
    resetExportState();
  }, [currentExportBlob, exportFormat, toast, resetExportState]);
  
  // Handle copy to clipboard
  const handleCopyToClipboard = useCallback(async () => {
    if (!currentExportBlob) return;
    
    const success = await copyBlobToClipboard(currentExportBlob);
    
    if (success) {
      toast({
        title: "Copied to clipboard!",
        description: "PNG image copied successfully",
        variant: "success",
        duration: 3000,
      });
      resetExportState();
    } else {
      // Clipboard failed, offer download instead
      toast({
        title: "Clipboard not supported",
        description: "Downloading image instead...",
        variant: "warning",
        duration: 3000,
      });
      handleDownload();
    }
  }, [currentExportBlob, toast, resetExportState, handleDownload]);
  
  const totalPlacements = inputPlacements.length + targetPlacements.length;
  
  // Animation variants for button transitions
  const buttonVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mode Toggle */}
      <div className="flex rounded-lg overflow-hidden border border-slate-600/50">
        <button
          onClick={() => handleModeChange("inputs")}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            mode === "inputs"
              ? "bg-emerald-500/20 text-emerald-300 border-r border-emerald-500/30"
              : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 border-r border-slate-600/50"
          }`}
        >
          <Layers className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          Inputs ({inputPlacements.length})
        </button>
        <button
          onClick={() => handleModeChange("targets")}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            mode === "targets"
              ? "bg-purple-500/20 text-purple-300"
              : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60"
          }`}
        >
          <Layers className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          Targets ({targetPlacements.length})
        </button>
      </div>
      
      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleOpenSave}
          disabled={totalPlacements === 0}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-sm text-slate-300 hover:bg-slate-700/60 hover:border-slate-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-4 h-4" />
          Save
        </button>
        
        <button
          onClick={handleOpenLoad}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-sm text-slate-300 hover:bg-slate-700/60 hover:border-slate-500/50 transition-colors"
        >
          <FolderOpen className="w-4 h-4" />
          Load
        </button>
        
        <button
          onClick={handleExportCode}
          disabled={totalPlacements === 0}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-sm text-slate-300 hover:bg-slate-700/60 hover:border-slate-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Copy className="w-4 h-4" />
          Copy Code
        </button>
        
        <button
          onClick={handleOpenImport}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-sm text-slate-300 hover:bg-slate-700/60 hover:border-slate-500/50 transition-colors"
        >
          <Clipboard className="w-4 h-4" />
          Paste Code
        </button>
      </div>
      
      {/* Export Image Section */}
      <div className="space-y-2">
        <div className="text-xs text-slate-400 uppercase tracking-wider">Export Image</div>
        <div className="grid grid-cols-2 gap-2 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {exportStep === "choose-format" && (
              <>
                <motion.button
                  key="png-btn"
                  variants={buttonVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  onClick={() => handleSelectExportFormat("png")}
                  disabled={totalPlacements === 0}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm text-blue-300 hover:bg-blue-500/30 hover:border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Image className="w-4 h-4" />
                  PNG
                </motion.button>
                
                <motion.button
                  key="gif-btn"
                  variants={buttonVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  onClick={() => handleSelectExportFormat("gif")}
                  disabled={totalPlacements === 0}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg text-sm text-purple-300 hover:bg-purple-500/30 hover:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Film className="w-4 h-4" />
                  GIF
                </motion.button>
              </>
            )}
            
            {exportStep === "exporting" && (
              <motion.div
                key="exporting"
                variants={buttonVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="col-span-2 flex flex-col items-center justify-center gap-2 px-3 py-3 bg-slate-800/60 border border-slate-600/50 rounded-lg"
              >
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting {exportFormat?.toUpperCase()}...</span>
                </div>
                {exportFormat === "gif" && (
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div 
                      className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                )}
              </motion.div>
            )}
            
            {exportStep === "choose-action" && (
              <>
                <motion.button
                  key="clipboard-btn"
                  variants={buttonVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  onClick={handleCopyToClipboard}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-sm text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-500/50 transition-colors"
                >
                  <ClipboardCopy className="w-4 h-4" />
                  Copy
                </motion.button>
                
                <motion.button
                  key="download-btn"
                  variants={buttonVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/20 border border-amber-500/30 rounded-lg text-sm text-amber-300 hover:bg-amber-500/30 hover:border-amber-500/50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </motion.button>
                
                <motion.button
                  key="cancel-btn"
                  variants={buttonVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  onClick={resetExportState}
                  className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </motion.button>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsImportModalOpen(false)}>
          <div 
            className="bg-slate-800 border border-slate-600 rounded-lg p-4 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-200">Import Design</h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste design code here..."
              className="w-full h-24 px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-slate-500"
            />
            
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="flex-1 px-3 py-2 bg-slate-700/60 border border-slate-600/50 rounded-lg text-sm text-slate-300 hover:bg-slate-600/60 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportFromText}
                disabled={!importText.trim()}
                className="flex-1 px-3 py-2 bg-emerald-500/80 rounded-lg text-sm text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Clear Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleClearCurrent}
          disabled={(mode === "inputs" ? inputPlacements.length : targetPlacements.length) === 0}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-sm text-slate-300 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Clear {mode === "inputs" ? "Inputs" : "Targets"}
        </button>
        
        <button
          onClick={handleClearAll}
          disabled={totalPlacements === 0}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-sm text-slate-300 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      {/* Save Layout Modal */}
      <SaveLayoutModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveLayout}
        existingLayouts={savedLayouts.map(l => ({ id: l.id, name: l.name }))}
      />
      
      {/* Load Layout Modal */}
      <LoadLayoutModal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        onLoad={handleLoadLayout}
        onDelete={handleDeleteLayout}
        onRename={handleRenameLayout}
        layouts={savedLayouts}
      />
    </div>
  );
};
