import React, { useCallback, useRef } from "react";
import { Save, FolderOpen, Download, Trash2, RotateCcw, Layers } from "lucide-react";
import { useDesigner } from "../../context";
import { useToast } from "../ui/toastContext";

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
  } = useDesigner();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
      name: p.cropId,
      position: p.position,
      size: p.size,
    }));
    const mutations = design.targetPlacements.map(p => ({
      name: p.cropId,
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
  
  // Export design as JSON file
  const handleExport = useCallback(() => {
    const design = {
      version: 1,
      exportedAt: new Date().toISOString(),
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
    
    const blob = new Blob([JSON.stringify(design, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `greenhouse-design-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Design exported",
      description: "JSON file downloaded",
      variant: "success",
      duration: 3000,
    });
  }, [inputPlacements, targetPlacements, toast]);
  
  // Import design from JSON file
  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        if (!data.inputPlacements || !data.targetPlacements) {
          throw new Error("Invalid design file format");
        }
        
        const crops = data.inputPlacements.map((p: any) => ({
          name: p.cropId,
          position: p.position,
          size: p.size,
        }));
        const mutations = data.targetPlacements.map((p: any) => ({
          name: p.cropId,
          position: p.position,
          size: p.size,
        }));
        
        loadFromSolverResult(crops, mutations);
        
        toast({
          title: "Design imported",
          description: "Design loaded from file",
          variant: "success",
          duration: 3000,
        });
      } catch (err) {
        toast({
          title: "Import failed",
          description: err instanceof Error ? err.message : "Invalid file",
          variant: "error",
          duration: 5000,
        });
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [loadFromSolverResult, toast]);
  
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
          onClick={() => setMode("inputs")}
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
          onClick={() => setMode("targets")}
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
          <Download className="w-4 h-4" />
          Export
        </button>
        
        <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-sm text-slate-300 hover:bg-slate-700/60 hover:border-slate-500/50 transition-colors cursor-pointer">
          <FolderOpen className="w-4 h-4" />
          Import
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </label>
      </div>
      
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
