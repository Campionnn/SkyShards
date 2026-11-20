import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import {
  CalculatorForm,
  CalculationResults,
  InventoryCalculationResults,
  WelcomeProfileModal,
  InventoryManagementModal,
  ActiveAlternativesModal,
  InventoryPanel,
  CalculationProgress,
  CalculatorEmptyState,
  remainingToMax,
  useTreeExpansion,
} from "../components";
import { useCustomRates, useCalculatorState } from "../hooks";
import { DataService } from "../services";
import type { CalculationFormData } from "../schemas";
import type { RecipeOverride } from "../types/types";
import type { ShardLevelKey } from "../constants";
import { isFirstVisit, setSaveEnabled, saveProfileType, type ProfileType } from "../utilities";
import { hasTarget, isTargetChange } from "./calculator/calculations";
import { useCalculation } from "./calculator/useCalculation";
import { useInventoryState } from "./calculator/useInventoryState";

/**
 * The calculator: settings form in the sidebar, results on the right.
 *
 * Every form change reaches `handleCalculate`, which schedules a debounced run (see
 * useCalculation). Runs also restart when anything else that feeds them changes:
 * custom rates, recipe overrides, or the inventory.
 */
export const CalculatorPage = () => {
  const { form, setForm } = useCalculatorState();
  const { customRates } = useCustomRates();
  const { useInventory, setUseInventory, inventory, setInventory, ownedAttributes, setOwnedAttributes, disabledShards, setDisabledShards } =
    useInventoryState();
  const [recipeOverrides, setRecipeOverrides] = useState<RecipeOverride[]>([]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(isFirstVisit);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [activeAlternativesOpen, setActiveAlternativesOpen] = useState(false);
  /** Multi-shard mode: the selected shard whose own tree is shown. */
  const [materialTreeShardKey, setMaterialTreeShardKey] = useState("");
  const inventoryTree = useTreeExpansion();

  const { outcome, isCalculating, progress, schedule, clear } = useCalculation({
    customRates,
    recipeOverrides,
    useInventory,
    inventory,
    disabledShards,
    ownedAttributes,
  });

  // Assigned during render, not in an effect: CalculatorForm's effects run before this
  // component's, and when one of them resubmits the form, handleCalculate must already
  // compare against the form that was just rendered.
  const formRef = useRef(form);
  formRef.current = form;

  const handleCalculate = useCallback(
    (formData: CalculationFormData) => {
      const previous = formRef.current;
      setForm(formData);
      schedule(formData, isTargetChange(previous, formData) ? 100 : 300);
    },
    [setForm, schedule],
  );

  // Recalculate when an input outside the form changes.
  useEffect(() => {
    if (hasTarget(formRef.current)) schedule(formRef.current, 150);
  }, [customRates, recipeOverrides, inventory, useInventory, disabledShards, ownedAttributes, schedule]);

  const handleSelectProfile = (profile: ProfileType) => {
    saveProfileType(profile);
    setSaveEnabled(true);
    const newForm = { ...form, ironManView: profile === "ironman" };
    setForm(newForm);
    schedule(newForm, 100);
    setShowWelcome(false);
  };

  const handleUseInventoryChange = (enabled: boolean) => {
    setUseInventory(enabled);
    // The effect above recalculates; clear now so the other mode's result never shows.
    clear();
  };

  // Clicking an attribute in the inventory modal targets that shard, for what is left to max it.
  const handleShardClickFromInventory = async (shardKey: string) => {
    try {
      const shards = await DataService.getInstance().loadShards();
      const shard = shards.find((s) => s.id === shardKey);
      if (!shard) return;
      const updatedForm = { ...form, shard: shard.name, quantity: remainingToMax(shard.rarity, ownedAttributes.get(shardKey)) };
      setForm(updatedForm);
      schedule(updatedForm, 100);
    } catch (error) {
      console.error("Failed to load shard from key:", error);
    }
  };

  // No explicit recalculation: the import also replaces the inventory, which triggers one.
  const handleShardLevelsImport = (levels: Partial<Pick<CalculationFormData, ShardLevelKey>>) => setForm({ ...form, ...levels });

  const resetRecipeOverrides = () => setRecipeOverrides([]);
  const removeRecipeOverride = (shardId: string) => setRecipeOverrides((overrides) => overrides.filter((override) => override.shardId !== shardId));

  // Only show a result computed in the mode currently selected.
  const inventoryMode = useInventory && !form.materialsOnly;
  const shown = outcome && (outcome.mode === "inventory") === inventoryMode ? outcome : null;
  const sharedResultProps = {
    recipeOverrides,
    onRecipeOverridesUpdate: setRecipeOverrides,
    onShowActiveAlternatives: () => setActiveAlternativesOpen(true),
    ironManView: form.ironManView,
  };

  return (
    <>
      <WelcomeProfileModal open={showWelcome} onSelectProfile={handleSelectProfile} onClose={() => setShowWelcome(false)} />
      <div className="min-h-screen space-y-3 py-4">
        <div className="grid grid-cols-1 xl:grid-cols-7 gap-1 lg:gap-4">
          {/* Configuration Panel */}
          <div className="xl:col-span-2">
            <div className="xl:hidden mb-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="w-full px-3 py-2.5 bg-purple-500/10 border border-purple-500/20 hover:border-purple-400/30 rounded-md text-white hover:bg-purple-500/20 flex items-center justify-center space-x-2 transition-colors duration-200 font-medium text-sm cursor-pointer"
              >
                {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                <span>{sidebarOpen ? "Hide" : "Show"} Configuration</span>
              </button>
            </div>

            <div className={`${sidebarOpen ? "block" : "hidden xl:block"} space-y-3`}>
              <InventoryPanel inventorySize={inventory.size} attributeCount={ownedAttributes.size} onManage={() => setShowInventoryModal(true)} />
              <CalculatorForm
                onSubmit={handleCalculate}
                ownedAttributes={ownedAttributes}
                useInventory={useInventory}
                onUseInventoryChange={handleUseInventoryChange}
              />
            </div>
          </div>

          {/* Results Panel */}
          <div className="xl:col-span-5 space-y-3">
            {isCalculating && <CalculationProgress progress={progress} />}

            {shown?.mode === "inventory" && (
              <InventoryCalculationResults
                {...sharedResultProps}
                result={shown.result}
                data={shown.data}
                params={shown.params}
                targetShardName={shown.targetShardName}
                targetShard={shown.targetShardKey}
                expandedStates={inventoryTree.expandedStates}
                onToggle={inventoryTree.toggle}
                onExpandAll={inventoryTree.expandAll}
                onCollapseAll={inventoryTree.collapseAll}
                inventory={inventory}
                disabledShards={disabledShards}
                onDisabledShardsChange={setDisabledShards}
              />
            )}

            {shown?.mode === "standard" && (
              <CalculationResults
                {...sharedResultProps}
                result={shown.result}
                data={shown.data}
                params={shown.params}
                targetShardName={shown.targetShardName}
                targetShard={shown.targetShardKey}
                materialsOnly={form.materialsOnly}
                materialShardResults={shown.perShardResults}
                materialTreeShardKey={materialTreeShardKey}
                onMaterialTreeShardChange={setMaterialTreeShardKey}
              />
            )}

            {!outcome && !isCalculating && <CalculatorEmptyState />}
          </div>
        </div>
      </div>

      <InventoryManagementModal
        open={showInventoryModal}
        onClose={() => setShowInventoryModal(false)}
        inventory={inventory}
        ownedAttributes={ownedAttributes}
        onInventoryChange={setInventory}
        onOwnedAttributesChange={setOwnedAttributes}
        disabledShards={disabledShards}
        onDisabledShardsChange={setDisabledShards}
        onShardClick={handleShardClickFromInventory}
        onShardLevelsImport={handleShardLevelsImport}
      />

      {/* Lives here, not in the results, so it stays open while the tree recalculates. */}
      <ActiveAlternativesModal
        open={activeAlternativesOpen}
        onClose={() => setActiveAlternativesOpen(false)}
        recipeOverrides={recipeOverrides}
        rateAsCoinValue={!form.ironManView}
        onRemove={removeRecipeOverride}
        onRemoveAll={resetRecipeOverrides}
      />
    </>
  );
};
