import React, { useState, useEffect, useCallback, useRef } from "react";
import { Menu, X, ChevronDown, ChevronRight, Package } from "lucide-react";
import { CalculatorForm, InventoryCalculationResults } from "../components";
import { InventoryManagementModal } from "../components/modals";
import { useCustomRates, useCalculatorState } from "../hooks";
import { DataService, InvCalculationService, CalculationService } from "../services";
import { loadInventory, saveInventory, loadOwnedAttributes, saveOwnedAttributes } from "../utilities";
import type { CalculationFormData } from "../schemas";
import type { InventoryCalculationResult, CalculationParams, Data, RecipeOverride } from "../types/types";

const CalculatorFormWithContext: React.FC<{ onSubmit: (data: CalculationFormData, setForm: (data: CalculationFormData) => void) => void; inventory: Map<string, number>; ownedAttributes: Map<string, number> }> = ({ onSubmit, inventory, ownedAttributes }) => {
  const { setForm } = useCalculatorState();
  return <CalculatorForm onSubmit={(data) => onSubmit(data, setForm)} inventory={inventory} ownedAttributes={ownedAttributes} />;
};

const SmartCalculatorPage: React.FC = () => {
  const { form } = useCalculatorState();
  const { customRates } = useCustomRates();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inventoryExpanded, setInventoryExpanded] = useState(true);
  const [result, setResult] = useState<InventoryCalculationResult | null>(null);
  const [calculationData, setCalculationData] = useState<Data | null>(null);
  const [currentParams, setCurrentParams] = useState<CalculationParams | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [recipeOverrides, setRecipeOverrides] = useState<RecipeOverride[]>([]);

  const [inventory, setInventory] = useState<Map<string, number>>(loadInventory);
  const [ownedAttributes, setOwnedAttributes] = useState<Map<string, number>>(loadOwnedAttributes);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [expandedStates] = useState<Map<string, boolean>>(new Map());

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

      // Calculate the optimal path
      const calculationResult = await invService.calculateOptimalPath(
        shardKey,
        formData.quantity,
        params,
        new Map(inventory),
        recipeOverrides
      );

      setResult(calculationResult);

      // Parse data for display
      const calculationService = CalculationService.getInstance();
      const data = await calculationService.parseData(params);
      setCalculationData(data);
    } catch (err) {
      console.error("Calculation failed:", err);
    } finally {
      setIsCalculating(false);
    }
  }, [customRates, inventory, recipeOverrides]);

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

  const handleRecipeOverridesUpdate = (newOverrides: RecipeOverride[]) => {
    setRecipeOverrides(newOverrides);
  };

  const resetRecipeOverrides = () => {
    setRecipeOverrides([]);
  };

  // Re-calculate when inventory or k values change
  useEffect(() => {
    if (form && form.shard && form.shard.trim() !== "") {
      void debouncedCalculate(form, 150);
    }
  }, [inventory, form, debouncedCalculate, recipeOverrides]);

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Save inventory to localStorage whenever it changes
  useEffect(() => {
    saveInventory(inventory);
  }, [inventory]);

  // Save owned attributes to localStorage whenever they change
  useEffect(() => {
    saveOwnedAttributes(ownedAttributes);
  }, [ownedAttributes]);

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
                className="w-full px-3 py-2.5 flex items-center justify-between text-white hover:bg-purple-500/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-400" />
                  <span className="font-medium">Inventory</span>
                  {inventory.size > 0 && (
                    <span className="text-xs text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded">
                      {inventory.size} shard{inventory.size !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {inventoryExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {inventoryExpanded && (
                <div className="border-t border-purple-500/20 p-3 space-y-3">
                  {inventory.size === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-2">
                      No inventory configured. Import your shards to get started.
                    </p>
                  ) : (
                    <div className="text-sm text-slate-300">
                      <span className="text-white font-medium">{inventory.size}</span> shard type{inventory.size !== 1 ? "s" : ""} in inventory
                      {ownedAttributes.size > 0 && (
                        <span className="ml-2">
                          • <span className="text-white font-medium">{ownedAttributes.size}</span> attribute{ownedAttributes.size !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => setShowInventoryModal(true)}
                    className="w-full px-3 py-2 bg-purple-500/20 border border-purple-500/30 hover:border-purple-400/40 rounded-md text-purple-300 hover:bg-purple-500/30 flex items-center justify-center gap-2 transition-colors duration-200 text-sm font-medium cursor-pointer"
                  >
                    <Package className="w-4 h-4" />
                    <span>Manage Inventory</span>
                  </button>
                </div>
              )}
            </div>

            {/* Calculator Settings Form - using same wrapper as normal calculator */}
            <div className="smart-calculator-form">
              <CalculatorFormWithContext onSubmit={handleCalculate} inventory={inventory} ownedAttributes={ownedAttributes} />
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
              params={currentParams}
              recipeOverrides={recipeOverrides}
              onRecipeOverridesUpdate={handleRecipeOverridesUpdate}
              onResetRecipeOverrides={resetRecipeOverrides}
            />
          )}

          {/* Empty State */}
          {!result && !isCalculating && (
            <div className="text-center py-10 bg-white/5 border border-white/10 rounded-md">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 bg-purple-500/20 border border-purple-500/20 rounded-md flex items-center justify-center mx-auto">
                  <Package className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-medium text-white">Smart</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Configure your inventory and settings, then select a shard to see the optimal fusion path considering your available shards.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inventory Management Modal */}
      <InventoryManagementModal
        open={showInventoryModal}
        onClose={() => setShowInventoryModal(false)}
        inventory={inventory}
        ownedAttributes={ownedAttributes}
        onInventoryChange={setInventory}
        onOwnedAttributesChange={setOwnedAttributes}
      />
    </div>
  );
};

export default SmartCalculatorPage;
export { SmartCalculatorPage };

