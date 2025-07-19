import React, { useState, useEffect, useCallback, useRef } from "react";
import { AlertCircle, Menu, X } from "lucide-react";
import { CalculatorForm, CalculationResults } from "../components";
import { useCalculation, useCustomRates } from "../hooks";
import { DataService } from "../services";
import type { CalculationFormData } from "../schemas";
import type { CalculationResult, CalculationParams, RecipeOverride } from "../types/types";
import { useCalculatorState } from "../context";

const CalculatorFormWithContext: React.FC<{ onSubmit: (data: CalculationFormData, setForm: (data: CalculationFormData) => void) => void }> = ({ onSubmit }) => {
  const { setForm } = useCalculatorState();
  return <CalculatorForm onSubmit={(data) => onSubmit(data, setForm)} />;
};

// Shared calculation logic
const performCalculation = async (
  formData: CalculationFormData,
  customRates: { [shardId: string]: number | undefined },
  recipeOverrides: RecipeOverride[] = [], // Add recipe overrides parameter,
  isIronMan: boolean,
  callbacks: {
    setTargetShardName: (name: string) => void;
    setCurrentShardKey: (key: string) => void;
    setCurrentQuantity: (quantity: number) => void;
    setCurrentParams: (params: CalculationParams) => void;
    setResult: (result: CalculationResult) => void;
    setCalculationData: (data: any) => void;
  }
) => {
  if (!formData.shard || formData.shard.trim() === "") {
    console.warn("Calculation skipped: No shard selected");
    return;
  }

  const dataService = DataService.getInstance();
  const nameToKeyMap = await dataService.getShardNameToKeyMap();
  const shardKey = nameToKeyMap[formData.shard.toLowerCase()];

  if (!shardKey) {
    return;
  }

  callbacks.setTargetShardName(formData.shard);
  callbacks.setCurrentShardKey(shardKey);
  callbacks.setCurrentQuantity(formData.quantity);

  const filteredCustomRates = Object.fromEntries(Object.entries(customRates).filter(([, v]) => v !== undefined)) as { [shardId: string]: number };

  const params = {
    customRates: filteredCustomRates,
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
    noWoodenBait: formData.noWoodenBait,
    rateAsCoinValue: !isIronMan
  };

  callbacks.setCurrentParams(params);

  const calculationService = await import("../services/calculationService");
  const service = calculationService.CalculationService.getInstance();
  const calculationResult = await service.calculateOptimalPath(shardKey, formData.quantity, params, recipeOverrides);
  callbacks.setResult(calculationResult);
  const data = await service.parseData(params);
  callbacks.setCalculationData(data);
};

const CalculatorPageContent: React.FC = () => {
  const { result, setResult, calculationData, setCalculationData, targetShardName, setTargetShardName, form } = useCalculatorState();
  const { loading, error } = useCalculation();
  const { customRates } = useCustomRates();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentParams, setCurrentParams] = useState<CalculationParams | null>(null);
  const [currentShardKey, setCurrentShardKey] = useState<string>("");
  const [currentQuantity, setCurrentQuantity] = useState<number>(1);
  const [recipeOverrides, setRecipeOverrides] = useState<RecipeOverride[]>([]);
  const [ironManView, setIronManView] = useState(true);

  // Debounced calculation
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCalculate = useCallback(
    async (formData: CalculationFormData, delay = 300) => {
      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(async () => {
        const callbacks = {
          setTargetShardName,
          setCurrentShardKey,
          setCurrentQuantity,
          setCurrentParams,
          setResult,
          setCalculationData,
        };

        try {
          await performCalculation(formData, customRates, recipeOverrides, ironManView, callbacks);
        } catch (err) {
          if (err instanceof Error && !err.message.includes("not found")) {
            console.error("Calculation failed:", err);
          }
        }
      }, delay);
    },
    [customRates, recipeOverrides, setTargetShardName, setCurrentShardKey, setCurrentQuantity, setCurrentParams, setResult, setCalculationData, ironManView]
  );

  const handleCalculate = async (formData: CalculationFormData, setForm: (data: CalculationFormData) => void) => {
    setForm(formData);
    // Don't close mobile sidebar after calculation to allow multiple changes
    // setSidebarOpen(false);

    // For immediate fields like shard selection, calculate immediately
    if (formData.shard !== form?.shard || formData.quantity !== form?.quantity) {
      await debouncedCalculate(formData, 100); // Short delay for shard/quantity changes
    } else {
      await debouncedCalculate(formData, 300); // Longer delay for other fields
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

  const handleToggleDisplayMode = () => {
    setIronManView(!ironManView);
  };

  // Re-calculate when customRates change and form is valid
  useEffect(() => {
    if (form && form.shard && form.shard.trim() !== "") {
      debouncedCalculate(form, 150); // Shorter delay for rate changes
    }
  }, [customRates, form, debouncedCalculate]);
 
  // Re-calculate when ironManView changes and form is valid
  useEffect(() => {
    if (form && form.shard && form.shard.trim() !== "") {
      debouncedCalculate(form, 150); // Shorter delay for rate changes
    }
  }, [ironManView, form, debouncedCalculate]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen space-y-3 py-4">
      {/* Header */}

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

        <button
          className="px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 border border-gray-500/20 hover:border-gray-500/30"
          onClick={handleToggleDisplayMode}
        >
          <span>Ironman View</span>
        </button>
        {/* Results Panel */}
        <div className="xl:col-span-5 space-y-3">
          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-400">Calculation Error</h3>
                <p className="text-red-300 text-sm mt-1">{error}</p>
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
              ironManView={ironManView}
            />
          )}

          {/* Empty State */}
          {!result && !loading && !error && (
            <div className="text-center py-10 bg-white/5 border border-white/10 rounded-md">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 bg-purple-500/20 border border-purple-500/20 rounded-md flex items-center justify-center mx-auto">
                  <Menu className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-medium text-white">Ready to Calculate</h3>
                <p className="text-slate-400 text-sm mt-1">Configure your settings and select a shard to see optimal fusion paths</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CalculatorPage: React.FC = () => <CalculatorPageContent />;
