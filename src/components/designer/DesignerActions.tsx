import React, { useCallback, useState } from "react";
import { Save, FolderOpen, Copy, Clipboard, Trash2, RotateCcw, Layers, X } from "lucide-react";
import { useDesigner, useGreenhouseData } from "../../context";
import { useToast } from "../ui/toastContext";
import { encodeDesign, decodeDesign } from "../../utilities";

interface DesignerActionsProps {
  className?: string;
}

const STORAGE_KEY = "skyshards-designer-designs";

interface SavedDesign {
  name: string;
  savedAt: number;
  inputPlacements: Array<{
    cropId: string;
    cropName: string;
    size: number;
    position: [number, number];
    isMutation: boolean;
  }>;
  targetPlacements: Array<{
    cropId: string;
    cropName: string;
    size: number;
    position: [number, number];
    isMutation: boolean;
  }>;
}

export const DesignerActions: React.FC<DesignerActionsProps> = ({ className = "" }) => {
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
  
  // Handle mode change with auto-deselect
  const handleModeChange = useCallback((newMode: "inputs" | "targets") => {
    setMode(newMode);
    
    // If switching to targets and a non-mutation crop is selected, deselect it
    if (newMode === "targets" && selectedCropForPlacement && !selectedCropForPlacement.isMutation) {
      setSelectedCropForPlacement(null);
    }
  }, [setMode, selectedCropForPlacement, setSelectedCropForPlacement]);
  
  // Save current design to localStorage
  const handleSave = useCallback(() => {
    const name = prompt("Enter a name for this design:", `Design ${new Date().toLocaleDateString()}`);
    if (!name) return;
    
    const design: SavedDesign = {
      name,
      savedAt: Date.now(),
      inputPlacements: inputPlacements.map(p => ({
        cropId: p.cropId,
        cropName: p.cropName,
        size: p.size,
        position: p.position,
        isMutation: p.isMutation,
      })),
      targetPlacements: targetPlacements.map(p => ({
        cropId: p.cropId,
        cropName: p.cropName,
        size: p.size,
        position: p.position,
        isMutation: p.isMutation,
      })),
    };
    
    // Get existing designs
    const existing = localStorage.getItem(STORAGE_KEY);
    const designs: SavedDesign[] = existing ? JSON.parse(existing) : [];
    
    // Add new design
    designs.push(design);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
    
    toast({
      title: "Design saved",
      description: `"${name}" has been saved`,
      variant: "success",
      duration: 3000,
    });
  }, [inputPlacements, targetPlacements, toast]);
  
  // Load design from localStorage
  const handleLoad = useCallback(() => {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      toast({
        title: "No saved designs",
        description: "Save a design first before loading",
        variant: "warning",
        duration: 3000,
      });
      return;
    }
    
    const designs: SavedDesign[] = JSON.parse(existing);
    if (designs.length === 0) {
      toast({
        title: "No saved designs",
        description: "Save a design first before loading",
        variant: "warning",
        duration: 3000,
      });
      return;
    }
    
    // Show simple selection (for now just use the most recent)
    const designNames = designs.map((d, i) => `${i + 1}. ${d.name} (${new Date(d.savedAt).toLocaleDateString()})`);
    const selection = prompt(
      `Select a design to load:\n${designNames.join("\n")}\n\nEnter number:`,
      "1"
    );
    
    if (!selection) return;
    
    const index = parseInt(selection) - 1;
    if (isNaN(index) || index < 0 || index >= designs.length) {
      toast({
        title: "Invalid selection",
        variant: "error",
        duration: 3000,
      });
      return;
    }
    
    const design = designs[index];
    
    // Convert to the format expected by loadFromSolverResult
    const crops = design.inputPlacements.map(p => ({
      id: p.cropId,
      name: p.cropName,
      position: p.position,
      size: p.size,
    }));
    const mutations = design.targetPlacements.map(p => ({
      id: p.cropId,
      name: p.cropName,
      position: p.position,
      size: p.size,
    }));
    
    loadFromSolverResult(crops, mutations);
    
    toast({
      title: "Design loaded",
      description: `"${design.name}" has been loaded`,
      variant: "success",
      duration: 3000,
    });
  }, [loadFromSolverResult, toast]);
  
  // State for import modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  
  // Export design as base64 gzipped string to clipboard
  const handleExport = useCallback(() => {
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
  
  const totalPlacements = inputPlacements.length + targetPlacements.length;
  
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
          onClick={handleSave}
          disabled={totalPlacements === 0}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-sm text-slate-300 hover:bg-slate-700/60 hover:border-slate-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-4 h-4" />
          Save
        </button>
        
        <button
          onClick={handleLoad}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-sm text-slate-300 hover:bg-slate-700/60 hover:border-slate-500/50 transition-colors"
        >
          <FolderOpen className="w-4 h-4" />
          Load
        </button>
        
        <button
          onClick={handleExport}
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
    </div>
  );
};
