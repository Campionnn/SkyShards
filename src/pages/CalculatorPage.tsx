import React, { useState, useEffect, useCallback, useRef } from "react";
import { Menu, X } from "lucide-react";
import { CalculatorForm, CalculationResults } from "../components";
import { WelcomeProfileModal } from "../components";
import { useCustomRates, useCalculatorState } from "../hooks";
import { DataService } from "../services";
import type { CalculationFormData } from "../schemas";
import type { CalculationResult, CalculationParams, RecipeOverride, Data } from "../types/types";
import { isFirstVisit, setSaveEnabled } from "../utilities";
import { calculateOptimalPathWithWorker, calculateMultipleShardsParallel, type WorkerProgress } from "../services/workerCalculationService";

const CalculatorFormWithContext: React.FC<{ onSubmit: (data: CalculationFormData, setForm: (data: CalculationFormData) => void) => void }> = ({ onSubmit }) => {
  const { setForm } = useCalculatorState();
  return <CalculatorForm onSubmit={(data) => onSubmit(data, setForm)} />;
};

// Shared calculation logic
const performCalculation = async (
  formData: CalculationFormData,
  customRates: { [shardId: string]: number | undefined },
  recipeOverrides: RecipeOverride[] = [],
  callbacks: {
    setTargetShardName: (name: string) => void;
    setCurrentShardKey: (key: string) => void;
    setCurrentQuantity: (quantity: number) => void;
    setCurrentParams: (params: CalculationParams) => void;
    setResult: (result: CalculationResult | null) => void;
    setCalculationData: (data: Data | null) => void;
    setCalculating: (v: boolean) => void;
    setProgress: (p: WorkerProgress | null) => void;
  }
): Promise<(() => void) | null> => {
  let isCancelled = false;

  const checkCancelled = () => isCancelled;

  const handleError = (err: unknown) => {
    if (!isCancelled && err instanceof Error && err.message !== "Worker calculation failed") {
      console.error("Calculation error:", err);
    }
  };

  const cleanup = () => {
    if (!isCancelled) {
      callbacks.setProgress(null);
      callbacks.setCalculating(false);
    }
  };

  // Handle Materials Only mode
  if (formData.materialsOnly) {
    if (!formData.selectedShardKeys || formData.selectedShardKeys.length === 0) {
      return null;
    }

    const dataService = DataService.getInstance();
    const filteredCustomRates = Object.fromEntries(
      Object.entries(customRates).filter(([, v]) => v !== undefined)
    ) as { [shardId: string]: number };

    const params = {
      customRates: formData.ironManView ? filteredCustomRates : await dataService.loadShardCosts(formData.instantBuyPrices),
      hunterFortune: formData.hunterFortune,
      excludeChameleon: formData.excludeChameleon,
      frogBonus: formData.frogBonus,
      newtLevel: formData.newtLevel,
      salamanderLevel: formData.salamanderLevel,
      lizardKingLevel: formData.lizardKingLevel,
      leviathanLevel: formData.leviathanLevel,
      pythonLevel: formData.pythonLevel,
      kingCobraLevel: formData.kingCobraLevel,
      seaSerpentLevel: formData.seaSerpentLevel,
      tiamatLevel: formData.tiamatLevel,
      crocodileLevel: formData.crocodileLevel,
      kuudraTier: formData.kuudraTier,
      moneyPerHour: formData.moneyPerHour,
      customKuudraTime: formData.customKuudraTime,
      kuudraTimeSeconds: formData.kuudraTimeSeconds,
      noWoodenBait: formData.noWoodenBait,
      rateAsCoinValue: !formData.ironManView,
      craftPenalty: formData.craftPenalty,
    };

    callbacks.setCurrentParams(params);
    callbacks.setCalculating(true);
    callbacks.setProgress(null);

    const shardQuantitiesMap = new Map<string, number>();
    if (formData.shardQuantities) {
      formData.shardQuantities.forEach((item: { shard?: { key: string }; quantity?: number }) => {
        if (item.shard && item.quantity) {
          shardQuantitiesMap.set(item.shard.key, item.quantity);
        }
      });
    }

    const targets = formData.selectedShardKeys.map(shardKey => ({
      shard: shardKey,
      quantity: shardQuantitiesMap.get(shardKey) || 1
    }));

    const { promise, cancel: workerCancel } = calculateMultipleShardsParallel(
      targets,
      params,
      recipeOverrides,
      (p) => !checkCancelled() && callbacks.setProgress(p)
    );

    promise
      .then(results => {
        if (checkCancelled()) return;

        const combinedMaterials: Record<string, number> = {};
        let totalTime = 0;
        let totalFusions = 0;
        let totalCraftTime = 0;
        let totalCraftsNeeded = 0;

        results.forEach((result) => {
          if (result.totalQuantities) {
            result.totalQuantities.forEach((quantity, matKey) => {
              combinedMaterials[matKey] = (combinedMaterials[matKey] || 0) + quantity;
            });
          }

          totalTime += result.totalTime || 0;
          totalFusions += result.totalFusions || 0;
          totalCraftTime += result.craftTime || 0;
          totalCraftsNeeded += result.craftsNeeded || 0;
        });

        const materialQuantities = new Map<string, number>(Object.entries(combinedMaterials));
        const selectedShardKeys = formData.selectedShardKeys || [];
        const totalShardsRequested = Array.from(shardQuantitiesMap.values()).reduce((sum, qty) => sum + qty, 0) || selectedShardKeys.length;

        // Use the materialBreakdown from the first result since the worker service already merged them globally
        const globalMaterialBreakdown = results.length > 0 ? results[0].materialBreakdown : undefined;

        const combinedResult: CalculationResult = {
          timePerShard: totalShardsRequested > 0 ? totalTime / totalShardsRequested : 0,
          totalTime,
          totalShardsProduced: totalShardsRequested,
          craftsNeeded: totalCraftsNeeded,
          totalQuantities: materialQuantities,
          totalFusions,
          craftTime: totalCraftTime,
          tree: null,
          materialBreakdown: globalMaterialBreakdown,
        };

        callbacks.setResult(combinedResult);

        return import("../services/calculationService").then(({ CalculationService }) => {
          if (checkCancelled()) return;
          const service = CalculationService.getInstance();
          return service.parseData(params);
        }).then(data => {
          if (checkCancelled() || !data) return;
          callbacks.setCalculationData(data);
          callbacks.setTargetShardName(`${selectedShardKeys.length} Shards`);
          callbacks.setCurrentShardKey(selectedShardKeys[0] || "");
          callbacks.setCurrentQuantity(selectedShardKeys.length);
        });
      })
      .catch(handleError)
      .finally(cleanup);

    return () => {
      isCancelled = true;
      workerCancel();
    };
  }

  // Single shard logic
  if (!formData.shard || formData.shard.trim() === "") {
    return null;
  }

  const dataService = DataService.getInstance();
  const nameToKeyMap = await dataService.getShardNameToKeyMap();
  const shardKey = nameToKeyMap[formData.shard.toLowerCase()];

  if (!shardKey) {
    return null;
  }

  callbacks.setTargetShardName(formData.shard);
  callbacks.setCurrentShardKey(shardKey);
  callbacks.setCurrentQuantity(formData.quantity);

  const filteredCustomRates = Object.fromEntries(
    Object.entries(customRates).filter(([, v]) => v !== undefined)
  ) as { [shardId: string]: number };

  const params = {
    customRates: formData.ironManView ? filteredCustomRates : await dataService.loadShardCosts(formData.instantBuyPrices),
    hunterFortune: formData.hunterFortune,
    excludeChameleon: formData.excludeChameleon,
    frogBonus: formData.frogBonus,
    newtLevel: formData.newtLevel,
    salamanderLevel: formData.salamanderLevel,
    lizardKingLevel: formData.lizardKingLevel,
    leviathanLevel: formData.leviathanLevel,
    pythonLevel: formData.pythonLevel,
    kingCobraLevel: formData.kingCobraLevel,
    seaSerpentLevel: formData.seaSerpentLevel,
    tiamatLevel: formData.tiamatLevel,
    crocodileLevel: formData.crocodileLevel,
    kuudraTier: formData.kuudraTier,
    moneyPerHour: formData.moneyPerHour,
    customKuudraTime: formData.customKuudraTime,
    kuudraTimeSeconds: formData.kuudraTimeSeconds,
    noWoodenBait: formData.noWoodenBait,
    rateAsCoinValue: !formData.ironManView,
    craftPenalty: formData.craftPenalty,
  };

  callbacks.setCurrentParams(params);
  callbacks.setResult(null);
  callbacks.setCalculationData(null);
  callbacks.setCalculating(true);
  callbacks.setProgress({ phase: "parsing", progress: 0, message: "Starting..." });

  const { promise, cancel: workerCancel } = calculateOptimalPathWithWorker(
    shardKey,
    formData.quantity,
    params,
    recipeOverrides,
    (p) => !checkCancelled() && callbacks.setProgress(p)
  );

  promise
    .then(calculationResult => {
      if (checkCancelled()) return;
      callbacks.setResult(calculationResult);

      return import("../services/calculationService").then(({ CalculationService }) => {
        if (checkCancelled()) return;
        const service = CalculationService.getInstance();
        return service.parseData(params);
      }).then(data => {
        if (checkCancelled() || !data) return;
        callbacks.setCalculationData(data);
      });
    })
    .catch(handleError)
    .finally(cleanup);

  return () => {
    isCancelled = true;
    workerCancel();
  };
};

const CalculatorPageContent: React.FC = () => {
  const { result, setResult, calculationData, setCalculationData, targetShardName, setTargetShardName, form, setForm } = useCalculatorState();
  const { customRates } = useCustomRates();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentParams, setCurrentParams] = useState<CalculationParams | null>(null);
  const [currentShardKey, setCurrentShardKey] = useState<string>("");
  const [currentQuantity, setCurrentQuantity] = useState<number>(1);
  const [recipeOverrides, setRecipeOverrides] = useState<RecipeOverride[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [progress, setProgress] = useState<WorkerProgress | null>(null);

  // Welcome modal state (first visit only)
  const [showWelcome, setShowWelcome] = useState(false);
  useEffect(() => {
    if (isFirstVisit()) {
      setShowWelcome(true);
    }
  }, []);

  const handleSelectProfile = (profile: "ironman" | "normal") => {
    localStorage.setItem("skyshards_profile_type", profile);
    setSaveEnabled(true);

    const newForm = {
      ...form,
      ironManView: profile === "ironman",
    };

    setForm(newForm);
    setResult(null);
    setCalculationData(null);

    debouncedCalculate(newForm, 100).catch(console.error);

    setShowWelcome(false);
  };

  // Debounced calculation
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  const debouncedCalculate = useCallback(
    async (formData: CalculationFormData, delay = 300) => {
      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Cancel any ongoing calculation
      if (cancelRef?.current) {
        cancelRef.current();
        cancelRef.current = null;
      }

      setResult(null);
      setCalculationData(null);
      setProgress(null);

      debounceTimeoutRef.current = setTimeout(async () => {
        const callbacks = {
          setTargetShardName,
          setCurrentShardKey,
          setCurrentQuantity,
          setCurrentParams,
          setResult,
          setCalculationData,
          setCalculating: setIsCalculating,
          setProgress,
        };

        try {
          // Store the cancel function so it can be called if parameters change
          cancelRef.current = await performCalculation(formData, customRates, recipeOverrides, callbacks);
        } catch (err) {
          if (err instanceof Error && !err.message.includes("not found")) {
            console.error("Calculation failed:", err);
          }
        }
      }, delay);
    },
    [customRates, recipeOverrides, setTargetShardName, setCurrentShardKey, setCurrentQuantity, setCurrentParams, setResult, setCalculationData]
  );

  const handleCalculate = async (formData: CalculationFormData, setForm: (data: CalculationFormData) => void) => {
    setForm(formData);
    // For immediate fields like shard selection, calculate immediately
    const materialsOnlyChanged = formData.materialsOnly !== form?.materialsOnly;
    const selectedShardsChanged = JSON.stringify(formData.selectedShardKeys) !== JSON.stringify(form?.selectedShardKeys);
    
    if (formData.shard !== form?.shard || formData.quantity !== form?.quantity || materialsOnlyChanged || selectedShardsChanged) {
      await debouncedCalculate(formData, 100);
    } else {
      await debouncedCalculate(formData, 300);
    }
  };

  const handleResultUpdate = (newResult: CalculationResult) => {
    setResult(newResult);
  };

  const handleRecipeOverridesUpdate = (newOverrides: RecipeOverride[]) => {
    setRecipeOverrides(newOverrides);
  };

  const resetRecipeOverrides = () => {
    setRecipeOverrides([]);
  };

  // Re-calculate when customRates, recipeOverrides change and form is valid
  useEffect(() => {
    const isValidForm = form && (
      (form.shard && form.shard.trim() !== "") || 
      (form.materialsOnly && form.selectedShardKeys && form.selectedShardKeys.length > 0)
    );
    
    if (isValidForm) {
      debouncedCalculate(form, 150).catch(console.error);
    }
  }, [customRates, recipeOverrides, form, debouncedCalculate]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <WelcomeProfileModal open={showWelcome} onSelectProfile={handleSelectProfile} onClose={() => setShowWelcome(false)} />
      <div className="min-h-screen space-y-3 py-4">
        <div className="grid grid-cols-1 xl:grid-cols-7 gap-1 lg:gap-4">
          {/* Configuration Panel */}
          <div className="xl:col-span-2">
            {/* Mobile toggle */}
            <div className="xl:hidden mb-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="
                w-full px-3 py-2.5
                bg-purple-500/10 border border-purple-500/20 hover:border-purple-400/30
                rounded-md text-white hover:bg-purple-500/20 
                flex items-center justify-center space-x-2 
                transition-colors duration-200 font-medium text-sm cursor-pointer
              "
              >
                {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                <span>{sidebarOpen ? "Hide" : "Show"} Configuration</span>
              </button>
            </div>

            <div className={`${sidebarOpen ? "block" : "hidden xl:block"}`}>
              <CalculatorFormWithContext onSubmit={handleCalculate} />
            </div>
          </div>
          {/* Results Panel */}
          <div className="xl:col-span-5 space-y-3">
            {/* Loading Indicator */}
            {isCalculating && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="text-white text-sm font-medium">{progress?.message || "Calculating..."}</div>
                  {typeof progress?.progress === "number" && <div className="text-purple-300 text-xs">{Math.round((progress.progress || 0) * 100)}%</div>}
                </div>
                <div className="mt-2 h-2 bg-white/10 rounded">
                  <div className="h-2 bg-purple-400 rounded" style={{ width: `${Math.min(100, Math.round((progress?.progress || 0) * 100))}%` }} />
                </div>
              </div>
            )}

            {/* Results */}
            {result && calculationData && currentParams && (
              <CalculationResults
                result={result}
                data={calculationData}
                targetShardName={targetShardName}
                targetShard={currentShardKey}
                requiredQuantity={currentQuantity}
                params={currentParams}
                onResultUpdate={handleResultUpdate}
                recipeOverrides={recipeOverrides}
                onRecipeOverridesUpdate={handleRecipeOverridesUpdate}
                onResetRecipeOverrides={resetRecipeOverrides}
                ironManView={form.ironManView}
                materialsOnly={form.materialsOnly}
              />
            )}

            {/* Empty State */}
            {!result && !isCalculating && (
              <div className="text-center py-10 bg-white/5 border border-white/10 rounded-md">
                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 bg-purple-500/20 border border-purple-500/20 rounded-md flex items-center justify-center mx-auto">
                    <Menu className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white">Ready to Calculate</h3>
                  <h5 className="text-sm font-medium text-white">
                    If this is your first time using SkyShards, check out the{" "}
                    <a href="/guide" className="underline text-purple-300 hover:text-purple-200">
                      guide!
                    </a>
                  </h5>
                  <p className="text-slate-400 text-sm mt-1">Configure your settings and select a shard to see optimal fusion paths</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export const CalculatorPage: React.FC = () => <CalculatorPageContent />;
