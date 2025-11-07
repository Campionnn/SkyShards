import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Menu, X, ChevronDown, ChevronRight, Search, Package } from "lucide-react";
import { CalculatorForm, InventoryCalculationResults } from "../components";
import { useCustomRates, useCalculatorState, useShards } from "../hooks";
import { DataService, InvCalculationService, CalculationService } from "../services";
import type { CalculationFormData } from "../schemas";
import type { InventoryCalculationResult, CalculationParams, Data } from "../types/types";

const CalculatorFormWithContext: React.FC<{ onSubmit: (data: CalculationFormData, setForm: (data: CalculationFormData) => void) => void }> = ({ onSubmit }) => {
  const { setForm } = useCalculatorState();
  return <CalculatorForm onSubmit={(data) => onSubmit(data, setForm)} />;
};

const SmartCalculatorPage: React.FC = () => {
  const { form } = useCalculatorState();
  const { customRates } = useCustomRates();
  const { shards } = useShards();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inventoryExpanded, setInventoryExpanded] = useState(true);
  const [result, setResult] = useState<InventoryCalculationResult | null>(null);
  const [calculationData, setCalculationData] = useState<Data | null>(null);
  const [currentParams, setCurrentParams] = useState<CalculationParams | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Inventory state: Map<shardId, quantity>
  const [inventory, setInventory] = useState<Map<string, number>>(new Map());

  // K values state: Map<shardId, k>
  const [kValues, setKValues] = useState<Map<string, number>>(new Map());

  // MinCosts for display
  const [originalMinCosts, setOriginalMinCosts] = useState<Map<string, number>>(new Map());
  const [adjustedMinCosts, setAdjustedMinCosts] = useState<Map<string, number>>(new Map());

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const minCostsDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [expandedStates] = useState<Map<string, boolean>>(new Map());

  // Cache params hash to avoid unnecessary recalculations
  const paramsHashRef = useRef<string>("");

  // Filter shards based on search
  const filteredShards = useMemo(() => {
    if (!shards) return [];
    const shardsArray = Object.entries(shards).map(([shardKey, shard]) => ({ shardKey, ...shard }));

    if (!searchTerm) return shardsArray;

    const lowerSearch = searchTerm.toLowerCase();
    return shardsArray.filter(shard =>
      shard.name.toLowerCase().includes(lowerSearch) ||
      shard.id.toLowerCase().includes(lowerSearch)
    );
  }, [shards, searchTerm]);

  const performCalculation = useCallback(async (formData: CalculationFormData) => {
    if (!formData.shard || formData.shard.trim() === "") {
      return;
    }

    const dataService = DataService.getInstance();
    const nameToKeyMap = await dataService.getShardNameToKeyMap();
    const shardKey = nameToKeyMap[formData.shard.toLowerCase()];

    if (!shardKey) {
      return;
    }

    const filteredCustomRates = Object.fromEntries(
      Object.entries(customRates).filter(([, v]) => v !== undefined)
    ) as { [shardId: string]: number };

    const params: CalculationParams = {
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

    setCurrentParams(params);
    setIsCalculating(true);

    try {
      const invService = InvCalculationService.getInstance();

      // Compute original minCosts (without inventory adjustment)
      const calculationService = CalculationService.getInstance();
      const parsedData = await calculationService.parseData(params);
      const { minCosts: originalCosts } = calculationService.computeMinCosts(parsedData, params, []);
      setOriginalMinCosts(originalCosts);

      // Compute adjusted minCosts (with inventory adjustment)
      const adjustedCosts = await invService.computeInventoryAdjustedMinCosts(params, inventory, kValues);
      setAdjustedMinCosts(adjustedCosts);

      // Calculate the optimal path
      const calculationResult = await invService.calculateOptimalPath(
        shardKey,
        formData.quantity,
        params,
        new Map(inventory),
        kValues
      );

      setResult(calculationResult);

      // Parse data for display
      const data = await calculationService.parseData(params);
      setCalculationData(data);
    } catch (err) {
      console.error("Calculation failed:", err);
    } finally {
      setIsCalculating(false);
    }
  }, [customRates, inventory, kValues]);

  const debouncedCalculate = useCallback(
    (formData: CalculationFormData, delay = 300) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      setResult(null);
      setCalculationData(null);

      debounceTimeoutRef.current = setTimeout(() => {
        performCalculation(formData).catch(console.error);
      }, delay);
    },
    [performCalculation]
  );

  const handleCalculate = async (formData: CalculationFormData, setFormFn: (data: CalculationFormData) => void) => {
    const adjustedFormData = { ...formData, materialsOnly: false };
    setFormFn(adjustedFormData);
    // For immediate fields like shard selection, calculate immediately
    if (formData.shard !== form?.shard || formData.quantity !== form?.quantity) {
      debouncedCalculate(adjustedFormData, 100);
    } else {
      debouncedCalculate(adjustedFormData, 300);
    }
  };

  const handleInventoryChange = (shardId: string, value: string) => {
    const numValue = value === "" ? 0 : parseInt(value);
    const newInventory = new Map(inventory);
    if (numValue > 0) {
      newInventory.set(shardId, numValue);
    } else {
      newInventory.delete(shardId);
    }
    setInventory(newInventory);
  };

  const handleKValueChange = (shardId: string, value: string) => {
    const newKValues = new Map(kValues);
    if (value === "") {
      newKValues.delete(shardId);
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        newKValues.set(shardId, numValue);
      }
    }
    setKValues(newKValues);
  };

  const handleNumberInputWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  // Prevent arrow keys from changing number input values when not focused
  const handleNumberInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
    }
  };

  // Re-calculate when inventory or k values change
  useEffect(() => {
    if (form && form.shard && form.shard.trim() !== "") {
      void debouncedCalculate(form, 150);
    }
  }, [inventory, kValues, form, debouncedCalculate]);

  // Initialize params from form state so we can display costs even before a calculation
  useEffect(() => {
    const initializeParams = async () => {
      if (!form) return;

      const dataService = DataService.getInstance();
      const filteredCustomRates = Object.fromEntries(
        Object.entries(customRates).filter(([, v]) => v !== undefined)
      ) as { [shardId: string]: number };

      const params: CalculationParams = {
        customRates: form.ironManView ? filteredCustomRates : await dataService.loadShardCosts(form.instantBuyPrices),
        hunterFortune: form.hunterFortune,
        excludeChameleon: form.excludeChameleon,
        frogBonus: form.frogBonus,
        newtLevel: form.newtLevel,
        salamanderLevel: form.salamanderLevel,
        lizardKingLevel: form.lizardKingLevel,
        leviathanLevel: form.leviathanLevel,
        pythonLevel: form.pythonLevel,
        kingCobraLevel: form.kingCobraLevel,
        seaSerpentLevel: form.seaSerpentLevel,
        tiamatLevel: form.tiamatLevel,
        crocodileLevel: form.crocodileLevel,
        kuudraTier: form.kuudraTier,
        moneyPerHour: form.moneyPerHour,
        customKuudraTime: form.customKuudraTime,
        kuudraTimeSeconds: form.kuudraTimeSeconds,
        noWoodenBait: form.noWoodenBait,
        rateAsCoinValue: !form.ironManView,
        craftPenalty: form.craftPenalty,
      };

      setCurrentParams(params);
    };

    void initializeParams();
  }, [form, customRates]);

  useEffect(() => {
    const paramsHash = currentParams ? JSON.stringify({
      rates: currentParams.customRates,
      fortune: currentParams.hunterFortune,
      levels: [
        currentParams.newtLevel,
        currentParams.salamanderLevel,
        currentParams.lizardKingLevel,
        currentParams.leviathanLevel,
        currentParams.pythonLevel,
        currentParams.kingCobraLevel,
        currentParams.seaSerpentLevel,
        currentParams.tiamatLevel,
        currentParams.crocodileLevel,
      ],
      kuudra: currentParams.kuudraTier,
    }) : "";

    // Only recompute if params actually changed
    if (paramsHash === paramsHashRef.current) {
      return;
    }

    // Clear existing debounce
    if (minCostsDebounceRef.current) {
      clearTimeout(minCostsDebounceRef.current);
    }

    // Debounce the computation
    minCostsDebounceRef.current = setTimeout(async () => {
      if (!currentParams) return;

      try {
        const calculationService = CalculationService.getInstance();
        const parsedData = await calculationService.parseData(currentParams);
        const { minCosts: originalCosts } = calculationService.computeMinCosts(parsedData, currentParams, []);
        setOriginalMinCosts(originalCosts);

        // Update hash after successful computation
        paramsHashRef.current = paramsHash;
      } catch (err) {
        console.error("Failed to compute original minCosts:", err);
      }
    }, 300); // 300ms debounce

    return () => {
      if (minCostsDebounceRef.current) {
        clearTimeout(minCostsDebounceRef.current);
      }
    };
  }, [currentParams]);

  // Apply inventory adjustment to original minCosts (cheap operation - just multiplication)
  useEffect(() => {
    if (originalMinCosts.size === 0 || !currentParams) return;

    const adjustedCosts = new Map<string, number>();

    for (const [shardId, baseCost] of originalMinCosts.entries()) {
      const inv = inventory.get(shardId) || 0;
      const k = kValues.has(shardId) ? kValues.get(shardId)! : 0.05;

      // Simple adjustment formula
      if (inv > 0) {
        const adjustedCost = baseCost * (1 / (1 + k * inv));
        adjustedCosts.set(shardId, adjustedCost);
      } else {
        adjustedCosts.set(shardId, baseCost);
      }
    }

    setAdjustedMinCosts(adjustedCosts);
  }, [originalMinCosts, inventory, kValues, currentParams]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const getWeightedCost = (shardId: string): number => {
    return adjustedMinCosts.get(shardId) || 0;
  };

  const getBaseCost = (shardId: string): number => {
    return originalMinCosts.get(shardId) || 0;
  };

  const handleToggle = (nodeId: string) => {
    expandedStates.set(nodeId, !expandedStates.get(nodeId));
    setResult({ ...result! }); // Force re-render
  };

  const handleExpandAll = () => {
    expandedStates.forEach((_, key) => {
      expandedStates.set(key, true);
    });
    setResult({ ...result! }); // Force re-render
  };

  const handleCollapseAll = () => {
    expandedStates.forEach((_, key) => {
      expandedStates.set(key, false);
    });
    setResult({ ...result! }); // Force re-render
  };

  return (
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

          <div className={`${sidebarOpen ? "block" : "hidden xl:block"} space-y-3`}>
            {/* Inventory Section */}
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-md overflow-hidden">
              <button
                onClick={() => setInventoryExpanded(!inventoryExpanded)}
                className="w-full px-3 py-2.5 flex items-center justify-between text-white hover:bg-purple-500/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-400" />
                  <span className="font-medium">Inventory</span>
                </div>
                {inventoryExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {inventoryExpanded && (
                <div className="border-t border-purple-500/20 p-3 space-y-2">
                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search shards..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  {/* Shard list */}
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {filteredShards.map((shard) => {
                      const shardId = shard.id;
                      const inv = inventory.get(shardId) || 0;
                      const k = kValues.has(shardId) ? kValues.get(shardId)! : 0.05;
                      const weightedCost = getWeightedCost(shardId);
                      const originalCost = getBaseCost(shardId);

                      return (
                        <div key={shardId} className="bg-slate-800/50 border border-slate-600 rounded-md p-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={`${import.meta.env.BASE_URL}shardIcons/${shardId}.png`}
                              alt={shard.name}
                              className="w-5 h-5 object-contain flex-shrink-0"
                              loading="lazy"
                            />
                            <span className="text-white text-sm font-medium flex-1">{shard.name}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-slate-400 block mb-1">Quantity</label>
                              <input
                                type="number"
                                min="0"
                                value={inv === 0 ? "" : inv}
                                onChange={(e) => handleInventoryChange(shardId, e.target.value)}
                                onWheel={handleNumberInputWheel}
                                onKeyDown={handleNumberInputKeyDown}
                                placeholder="0"
                                className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-purple-400"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-400 block mb-1">K Value</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={kValues.has(shardId) ? k : ""}
                                onChange={(e) => handleKValueChange(shardId, e.target.value)}
                                onWheel={handleNumberInputWheel}
                                onKeyDown={handleNumberInputKeyDown}
                                placeholder="0.05"
                                className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-purple-400"
                              />
                            </div>
                          </div>

                          {(originalCost > 0 || weightedCost > 0) && (
                            <div className="text-xs space-y-0.5">
                              <div className="flex justify-between text-slate-400">
                                <span>Original:</span>
                                <span className="text-white">
                                  {originalCost.toExponential(2)}
                                </span>
                              </div>
                              {inv > 0 && (
                                <div className="flex justify-between text-purple-400">
                                  <span>Weighted:</span>
                                  <span className="text-purple-300 font-medium">
                                    {weightedCost.toExponential(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Calculator Settings Form - using same wrapper as normal calculator */}
            <div className="smart-calculator-form">
              <CalculatorFormWithContext onSubmit={handleCalculate} />
              <style>{`
                /* Hide Materials Only toggle in Smart Calculator */
                .smart-calculator-form .flex.items-center.justify-between:has(svg[class*="lucide-layers"]) {
                  display: none !important;
                }
              `}</style>
            </div>
          </div>
        </div>
        {/* Results Panel */}
        <div className="xl:col-span-5 space-y-3">
          {/* Loading Indicator */}
          {isCalculating && (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="text-white text-sm font-medium">Calculating...</div>
              </div>
              <div className="mt-2 h-2 bg-white/10 rounded">
                <div className="h-2 bg-purple-400 rounded" style={{ width: "100%" }} />
              </div>
            </div>
          )}

          {/* Results */}
          {result && calculationData && currentParams && (
            <InventoryCalculationResults
              result={result}
              data={calculationData}
              targetShardName={form.shard || "Unknown Shard"}
              targetShard={form.shard || ""}
              ironManView={form.ironManView}
              expandedStates={expandedStates}
              onToggle={handleToggle}
              onExpandAll={handleExpandAll}
              onCollapseAll={handleCollapseAll}
            />
          )}

          {/* Empty State */}
          {!result && !isCalculating && (
            <div className="text-center py-10 bg-white/5 border border-white/10 rounded-md">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 bg-purple-500/20 border border-purple-500/20 rounded-md flex items-center justify-center mx-auto">
                  <Package className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-medium text-white">Smart Calculator</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Configure your inventory and settings, then select a shard to see the optimal fusion path considering your available shards.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartCalculatorPage;
export { SmartCalculatorPage };

