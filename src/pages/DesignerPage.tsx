import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { 
  CropSelectionPalette, 
  DesignerActions, 
  DesignerGrid,
  MutationValidator,
} from "../components";
import { useToast } from "../components/ui/toastContext";
import { useDesigner, useGreenhouseData } from "../context";
import { decodeDesign } from "../utilities";
import { captureGridAsPng, aggregateCropInfo } from "../utilities/gridExport";
import type { DesignerGridHandle } from "../components";

export const DesignerPage: React.FC = () => {
  const [showTargets, setShowTargets] = useState(true);
  const gridRef = useRef<DesignerGridHandle>(null);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { inputPlacements, targetPlacements, loadFromSolverResult } = useDesigner();
  const { getCropDef, getMutationDef, isLoading: isDataLoading } = useGreenhouseData();
  const [hasLoadedFromUrl, setHasLoadedFromUrl] = useState(false);
  
  // Responsive grid sizing
  const [gridSize, setGridSize] = useState(() => {
    const width = window.innerWidth;
    if (width < 640) return { cellSize: 32, gap: 1 };
    if (width < 1024) return { cellSize: 40, gap: 2 };
    return { cellSize: 48, gap: 2 };
  });
  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) setGridSize({ cellSize: 32, gap: 1 });
      else if (width < 1024) setGridSize({ cellSize: 40, gap: 2 });
      else setGridSize({ cellSize: 48, gap: 2 });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Export grid function for Playwright-based share image generation
  const exportGridForShare = useCallback(async (): Promise<string> => {
    if (!gridRef.current) {
      throw new Error('Grid not available');
    }
    
    const gridElement = gridRef.current.getGridElement();
    if (!gridElement) {
      throw new Error('Grid element not found');
    }
    
    // Build crop info for the watermark
    const inputCrops = aggregateCropInfo(
      inputPlacements.map(p => {
        const def = getCropDef(p.cropId) || getMutationDef(p.cropId);
        return { cropId: p.cropId, cropName: def?.name || p.cropId.replace(/_/g, ' ') };
      })
    );
    
    const targetCrops = showTargets ? aggregateCropInfo(
      targetPlacements.map(p => {
        const def = getMutationDef(p.cropId) || getCropDef(p.cropId);
        return { cropId: p.cropId, cropName: def?.name || p.cropId.replace(/_/g, ' ') };
      })
    ) : [];
    
    const options = {
      scale: 2,
      includeWatermark: true,
      watermarkUrl: "greenhouse.skyshards.com",
      watermarkTitle: "Greenhouse Designer",
      inputCrops,
      targetCrops,
      showTargets,
    };
    
    const result = await captureGridAsPng(gridElement, options);
    return result.dataUrl;
  }, [gridRef, inputPlacements, targetPlacements, showTargets, getCropDef, getMutationDef]);
  
  // Expose exportGrid to window for Playwright access
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).exportGrid = exportGridForShare;
    
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).exportGrid;
    };
  }, [exportGridForShare]);
  
  // Track layout loading state for Playwright
  const [layoutLoadState, setLayoutLoadState] = useState<'pending' | 'loaded' | 'error' | 'no-layout'>('pending');
  
  // Auto-load layout from URL parameter
  useEffect(() => {
    // Wait for greenhouse data to load and only run once
    if (isDataLoading || hasLoadedFromUrl) return;
    
    const layoutCode = searchParams.get("layout");
    if (!layoutCode) {
      setLayoutLoadState('no-layout');
      setHasLoadedFromUrl(true);
      return;
    }
    
    try {
      const { inputs, targets } = decodeDesign(layoutCode);
      
      // Convert to the format expected by loadFromSolverResult
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
      setHasLoadedFromUrl(true);
      setLayoutLoadState('loaded');
      
      toast({
        title: "Layout loaded",
        description: `Loaded ${inputs.length} inputs and ${targets.length} targets from shared link`,
        variant: "success",
        duration: 3000,
      });
    } catch (err) {
      setHasLoadedFromUrl(true); // Don't retry on error
      setLayoutLoadState('error');
      toast({
        title: "Failed to load layout",
        description: err instanceof Error ? err.message : "Invalid layout code in URL",
        variant: "error",
        duration: 5000,
      });
    }
  }, [searchParams, isDataLoading, hasLoadedFromUrl, getCropDef, getMutationDef, loadFromSolverResult, toast]);
  
  // Expose layout load state to window for Playwright to check
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).layoutLoadState = layoutLoadState;
    
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).layoutLoadState;
    };
  }, [layoutLoadState]);
  
  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-screen-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_420px] gap-4 lg:gap-6">
        <div className="space-y-4 order-2 lg:order-1">
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 sm:p-4">
            <DesignerActions gridRef={gridRef} showTargets={showTargets} />
          </div>
          
          {/* Mutation Validator */}
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 sm:p-4">
            <h3 className="text-sm font-medium text-slate-200 mb-3">Mutation Status</h3>
            <MutationValidator />
          </div>
        </div>
        
        <div className="flex flex-col items-center order-1 lg:order-2">
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 sm:p-4 w-full">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-2">
              <h3 className="text-sm font-medium text-slate-200">Greenhouse Designer</h3>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setShowTargets(!showTargets)}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 hover:text-slate-200"
                  title={showTargets ? "Hide target mutations" : "Show target mutations"}
                >
                  {showTargets ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Hide Targets</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Show Targets</span>
                    </>
                  )}
                </button>
                <div className="flex gap-2 sm:gap-4 text-xs text-slate-400">
                </div>
              </div>
            </div>
            <div className="w-full">
              <div className="overflow-x-auto">
                <div className="flex flex-col items-center min-w-full">
                  <DesignerGrid 
                    ref={gridRef} 
                    showTargets={showTargets}
                    cellSize={gridSize.cellSize}
                    gap={gridSize.gap}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 sm:p-4 h-[500px] lg:h-[calc(100vh-180px)] lg:min-h-[500px] order-3">
          <CropSelectionPalette className="h-full" />
        </div>
      </div>
    </div>
  );
};
