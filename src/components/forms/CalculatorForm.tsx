import React from "react";
import { Zap, RotateCcw, Settings, TriangleAlert, Layers } from "lucide-react";
import { type CalculationFormData } from "../../schemas";
import { ShardAutocomplete, MoneyInput } from "./inputs";
import { useCalculatorState, useShards } from "../../hooks";
import { LevelDropdown, KuudraDropdown } from "../calculator";
import {LEVELED_SHARDS, MAX_QUANTITIES, SHARD_DESCRIPTIONS, type ShardLevelKey} from "../../constants";
import { isValidShardName } from "../../utilities";
import { ShardDescription } from "../ui/ShardDescription";
import { Tooltip, ToggleSwitch } from "../ui";
import type { Shard } from "../../types/types";
import { MultiSelectShardModal } from "../modals";
import { DataService } from "../../services";

interface CalculatorFormProps {
  onSubmit: (data: CalculationFormData) => void;
  ownedAttributes?: Map<string, number>;
  useInventory?: boolean;
  onUseInventoryChange?: (enabled: boolean) => void;
}

type LevelKey = ShardLevelKey;

export const CalculatorForm: React.FC<CalculatorFormProps> = ({ onSubmit, ownedAttributes, useInventory, onUseInventoryChange }) => {
  const { form, setForm, saveEnabled, setSaveEnabledState } = useCalculatorState();
  const { shards } = useShards();

  // Keep refs of the latest form and onSubmit to use inside effects
  // without depending on the whole object/callback identity
  const latestFormRef = React.useRef<CalculationFormData>(form);
  React.useEffect(() => {
    latestFormRef.current = form;
  }, [form]);

  const onSubmitRef = React.useRef(onSubmit);
  React.useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  React.useEffect(() => {
    const checkAndSubmit = async () => {
      const current = latestFormRef.current;
      if (current.shard && current.shard.trim() !== "") {
        const isValid = await isValidShardName(current.shard);
        if (isValid) {
          onSubmitRef.current({ ...current, frogBonus: false });
        }
      }
    };
    checkAndSubmit().catch(console.error);
  }, [form.shard, form.quantity]);

  // Only call onSubmit immediately for non-shard/quantity fields
  const handleInputChange = <K extends keyof CalculationFormData>(field: K, value: CalculationFormData[K]) => {
    const updatedForm = { ...form, [field]: value };
    setForm(updatedForm);
    if (field !== "shard" && field !== "quantity" && field !== "customKuudraTime") {
      onSubmit(updatedForm);
    }
  };

  const handleLevelChange =
    <K extends LevelKey>(key: K) =>
    (value: number) => {
      handleInputChange(key, value);
    };

  const handleMaxStats = () => {
    const updatedForm: CalculationFormData = {
      ...form,
      hunterFortune: 181,
      newtLevel: 10,
      salamanderLevel: 10,
      lizardKingLevel: 10,
      leviathanLevel: 10,
      pythonLevel: 10,
      kingCobraLevel: 10,
      seaSerpentLevel: 10,
      tiamatLevel: 10,
      crocodileLevel: 10,
      kuudraTier: "t5", // Set Kuudra to t5 on max stats
    };
    setForm(updatedForm);
    onSubmit(updatedForm);
  };

  const handleReset = () => {
    // Preserve current shard and quantity values, and Materials Only mode
    const currentShard = form.shard;
    const currentQuantity = form.quantity;
    const currentIronManView = form.ironManView;
    const currentInstantBuyPrices = form.instantBuyPrices;
    const currentMaterialsOnly = form.materialsOnly;
    const currentSelectedShardKeys = form.selectedShardKeys;
    // Reset to default, then immediately restore preserved values
    const resetFormData: CalculationFormData = {
      shard: currentShard,
      quantity: currentQuantity,
      hunterFortune: 0,
      excludeChameleon: false,
      frogBonus: false,
      newtLevel: 0,
      salamanderLevel: 0,
      lizardKingLevel: 0,
      leviathanLevel: 0,
      pythonLevel: 0,
      kingCobraLevel: 0,
      seaSerpentLevel: 0,
      tiamatLevel: 0,
      crocodileLevel: 0,
      kuudraTier: "none",
      moneyPerHour: Infinity,
      customKuudraTime: false,
      kuudraTimeSeconds: null,
      noWoodenBait: false,
      ironManView: currentIronManView,
      instantBuyPrices: currentInstantBuyPrices,
      craftPenalty: currentIronManView ? 0.8 : 1000,
      materialsOnly: currentMaterialsOnly,
      selectedShardKeys: currentSelectedShardKeys,
      shardQuantities: form.shardQuantities || [],
    };
    setForm(resetFormData);
    setMoneyInput(""); // Clear the input field
    setKuudraTimeInput(""); // Clear the kuudra time input field
    onSubmit(resetFormData);
  };

  // Utility to parse shorthand like 10k, 53m, 2.5b
  function parseShorthandNumber(value: string): number {
    if (!value) return 0;
    const match = value
      .trim()
      .toLowerCase()
      .match(/^([\d,.]+)([kmb])?$/);
    if (!match) return Number(value.replace(/,/g, "")) || 0;
    let num = parseFloat(match[1].replace(/,/g, ""));
    const suffix = match[2];
    if (suffix === "k") num *= 1_000;
    else if (suffix === "m") num *= 1_000_000;
    else if (suffix === "b") num *= 1_000_000_000;
    return Math.round(num);
  }

  // For moneyPerHour, keep a local string state for user input
  const [moneyInput, setMoneyInput] = React.useState<string>(""); // always empty by default
  const [kuudraTimeInput, setKuudraTimeInput] = React.useState<string>(""); // for custom kuudra time input

  // Set moneyPerHour to Infinity by default on mount and when target shard changes
  const setMoneyToInfinity = React.useCallback(() => {
    const moneyNullishOrZero = form.moneyPerHour === undefined || form.moneyPerHour === null || form.moneyPerHour === 0;
    if (moneyNullishOrZero && moneyInput === "") {
      const updated = { ...latestFormRef.current, moneyPerHour: Infinity };
      setForm(updated);
      onSubmitRef.current(updated);
    }
  }, [form.moneyPerHour, moneyInput, setForm]);

  React.useEffect(() => {
    setMoneyToInfinity();
  }, [setMoneyToInfinity]);

  // Only clear the input when moneyPerHour is reset to null/undefined
  React.useEffect(() => {
    if (form.moneyPerHour === null || form.moneyPerHour === undefined) {
      setMoneyInput("");
    }
  }, [form.moneyPerHour]);

  // Clear shard input on focus if a shard is already selected
  const handleShardInputFocus = () => {
    if (form.shard) {
      handleInputChange("shard", "");
    }
  };

  // Handle craftPenalty default and mode switching
  React.useEffect(() => {
    const desiredDefault = form.ironManView ? 0.8 : 1000;
    const isNullish = form.craftPenalty === undefined || form.craftPenalty === null;

    if (isNullish) {
      const updated = { ...latestFormRef.current, craftPenalty: desiredDefault };
      setForm(updated);
      onSubmitRef.current(updated);
    } else if (form.ironManView && form.craftPenalty === 1000) {
      const updated = { ...latestFormRef.current, craftPenalty: 0.8 };
      setForm(updated);
      onSubmitRef.current(updated);
    } else if (!form.ironManView && form.craftPenalty === 0.8) {
      const updated = { ...latestFormRef.current, craftPenalty: 1000 };
      setForm(updated);
      onSubmitRef.current(updated);
    }
  }, [form.ironManView, form.craftPenalty, setForm]);

  // For craftPenalty, keep a local string state for user input
  const [craftPenaltyInput, setCraftPenaltyInput] = React.useState<string>("");

  // On mode switch, reset input to empty only; craft penalty default handled above
  React.useEffect(() => {
    setCraftPenaltyInput("");
  }, [form.ironManView]);

  // Only Crocodile is shown on a normal profile; the rest are ironman-only.
  const levelItems = LEVELED_SHARDS.filter((item) => form.ironManView || !item.ironmanOnly);

  // Materials Only mode state
  const [isMultiSelectModalOpen, setIsMultiSelectModalOpen] = React.useState(false);
  const [allShards, setAllShards] = React.useState<Shard[]>([]);

  const handleOpenMultiSelect = React.useCallback(async () => {
    if (allShards.length === 0) {
      const dataService = DataService.getInstance();
      const shards = await dataService.loadShards();
      // Filter out Chameleon shard (L4) as it's only used for fusions
      const filteredShards = shards.filter(shard => shard.id !== 'L4');
      setAllShards(filteredShards);
    }
    setIsMultiSelectModalOpen(true);
  }, [allShards]);

  const handleMultiSelectDone = React.useCallback(
    (selectedData: Array<{ shard: Shard; quantity: number }>) => {
      const selectedKeys = selectedData.map((item) => item.shard.id);
      const updated = { ...latestFormRef.current, selectedShardKeys: selectedKeys, shardQuantities: selectedData };
      setForm(updated);
      setIsMultiSelectModalOpen(false);
      onSubmitRef.current(updated);
    },
    [setForm]
  );

  return (
    <div className="bg-slate-800/40 border border-slate-600/30 rounded-md p-3 space-y-3">
      <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
        {/* Profile Mode Buttons */}
        <div className="flex space-x-2">
          <button
            type="button"
            className={`px-3 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex-1 border cursor-pointer ${
              form.ironManView ? "bg-white/20 text-white border-white/30" : "bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 border-slate-600/50 hover:border-slate-500/50"
            }`}
            onClick={() => handleInputChange("ironManView", true)}
          >
            Ironman Profile
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex-1 border cursor-pointer ${
              !form.ironManView ? "bg-blue-500/30 text-blue-200 border-blue-400/50" : "bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 border-slate-600/50 hover:border-slate-500/50"
            }`}
            onClick={() => handleInputChange("ironManView", false)}
          >
            Normal Profile
          </button>
        </div>

        {/* Use Inventory + Auto Save toggles */}
        <div className="flex justify-between gap-6 mb-3">
          {onUseInventoryChange && (
            <ToggleSwitch
              size="sm"
              accent="purple"
              label="Use Inventory"
              tooltip="Enable inventory-aware calculations. When enabled, your imported inventory shards will be factored into the optimal fusion path. Does not work with material only mode yet. This is very experimental, so let me know on Discord or GitHub if it isn't working properly"
              checked={useInventory ?? false}
              onChange={onUseInventoryChange}
            />
          )}
          <ToggleSwitch
            size="sm"
            accent="emerald"
            label="Auto Save"
            tooltip="Automatically saves all your settings (fortune, shard levels, etc.) in your browser. Data is restored when the page reloads."
            checked={saveEnabled}
            onChange={setSaveEnabledState}
          />
        </div>

        {/* Target Shard or Select Shards */}
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                {form.materialsOnly ? "Select Shards" : "Target Shard"}
              </div>
              <ToggleSwitch
                size="sm"
                accent="blue"
                label="Multi-Shard Mode"
                labelClassName="text-white"
                tooltip="Calculate combined materials for multiple shards. Does not work with use inventory"
                checked={form.materialsOnly}
                onChange={(checked) => handleInputChange("materialsOnly", checked)}
              />
            </div>
            {form.materialsOnly && form.ironManView ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleOpenMultiSelect}
                  className="flex-1 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 hover:border-blue-500/40 rounded-md text-blue-300 font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <Layers className="w-4 h-4" />
                  <span>{form.selectedShardKeys && form.selectedShardKeys.length > 0 ? `${form.selectedShardKeys.length} Shard${form.selectedShardKeys.length > 1 ? 's' : ''} Selected` : 'Select Shards'}</span>
                </button>
                {form.selectedShardKeys && form.selectedShardKeys.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...form, selectedShardKeys: [], shardQuantities: [] };
                      setForm(updated);
                      onSubmit(updated);
                    }}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/20 hover:border-red-500/30 rounded-md text-red-400 font-medium transition-colors flex items-center justify-center cursor-pointer text-sm"
                    title="Clear selection"
                  >
                    Clear
                  </button>
                )}
              </div>
            ) : (
              <>
                <ShardAutocomplete
                  value={form.shard}
                  onChange={(value: string) => handleInputChange("shard", value)}
                  onSelect={(shard: Shard) => {
                    // Use the rarity directly from the selected shard (provided by autocomplete)
                    let rarityKey = "common";
                    if (shard) {
                      const normalized = shard.rarity.toLowerCase();
                      if (normalized in MAX_QUANTITIES) rarityKey = normalized as keyof typeof MAX_QUANTITIES as string;
                    }
                    const maxQuantity: number = MAX_QUANTITIES[rarityKey as keyof typeof MAX_QUANTITIES];
                    const owned = ownedAttributes?.get(shard.id) ?? 0;
                    const remaining = owned >= maxQuantity ? maxQuantity : Math.max(1, maxQuantity - owned);
                    const updated = { ...form, shard: shard.name, quantity: remaining };
                    setForm(updated);
                    onSubmit(updated);
                  }}
                  onFocus={handleShardInputFocus}
                  placeholder="Search for a shard..."
                  searchMode="name-only"
                />
              </>
            )}
          </div>
        {!form.materialsOnly && (
            <div className="flex gap-1.5">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-300 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={form.quantity === 0 ? "" : form.quantity}
                  placeholder="1"
                  onChange={(e) => handleInputChange("quantity", Number(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className="w-full px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors duration-200"
                />
              </div>
              {(() => {
                const selectedShard = form.shard ? shards.find((s) => s.name === form.shard) : null;
                if (!selectedShard) return null;
                const rarityKey = selectedShard.rarity.toLowerCase() as keyof typeof MAX_QUANTITIES;
                const maxQty = MAX_QUANTITIES[rarityKey] ?? MAX_QUANTITIES.common;
                return (
                  <div className="flex flex-col justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...form, quantity: maxQty };
                        setForm(updated);
                        onSubmit(updated);
                      }}
                      className="px-2.5 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-md text-slate-300 hover:text-white transition-colors duration-200 cursor-pointer"
                      title={`Set to max (${maxQty})`}
                    >
                      Max
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Multi-Select Shard Modal */}
        <MultiSelectShardModal
          isOpen={isMultiSelectModalOpen}
          onClose={() => setIsMultiSelectModalOpen(false)}
          shards={allShards}
          onDone={handleMultiSelectDone}
          initialSelections={
            new Map(
              (form.shardQuantities || []).map((item) => [item.shard.id, item.quantity])
            )
          }
          ownedAttributes={ownedAttributes}
        />

        {/* Settings */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-400" />
              Settings
            </h3>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleMaxStats}
                className="
                  px-2 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 
                  text-amber-400 font-medium rounded-md text-xs
                  border border-amber-500/20 hover:border-amber-500/30
                  transition-colors duration-200 flex items-center space-x-1 cursor-pointer
                "
              >
                <Zap className="w-3 h-3" />
                <span>Max Stats</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="
                  px-2 py-1.5 bg-red-500/20 hover:bg-red-500/30 
                  text-red-400 font-medium rounded-md text-xs
                  border border-red-500/20 hover:border-red-500/30
                  transition-colors duration-200 flex items-center space-x-1 cursor-pointer
                "
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Stats</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {/* Hunter Fortune */}
            {form.ironManView && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-fuchsia-300 mb-2">
                  <div className="w-2 h-2 bg-fuchsia-500 rounded-full"></div>
                  <span>Hunter Fortune</span>
                  <div className="-mb-[5px]">
                  <Tooltip
                    shardName="Hunter Fortune"
                    rarity="legendary"
                    title=""
                    showRomanNumerals={false}
                    content={
                      <div className="space-y-2">
                        <div className="text-slate-200 font-semibold">Sources</div>
                        <ul className="space-y-0.5">
                          <li><span className="font-semibold">+50</span> <span className="text-slate-300">HotF 3 perk</span></li>
                          <li><span className="font-semibold">+50</span> <span className="text-slate-300">Hunting level 50</span></li>
                          <li><span className="font-semibold">+30</span> <span className="text-slate-300">David's Cloak (Attribute Stacks 30)</span></li>
                          <li><span className="font-semibold">+30</span> <span className="text-slate-300">Safari Belt (Max Haunted Biome Milestone)</span></li>
                          <li><span className="font-semibold">+13</span> <span className="text-slate-300">Megalith (Sea Serpent + Tiamat max)</span></li>
                          <li><span className="font-semibold">+4</span> <span className="text-slate-300">Safari Belt Mythic Reforge</span></li>
                          <li><span className="font-semibold">+3</span> <span className="text-slate-300">Infernal Kuudra Core</span></li>
                          <li><span className="font-semibold">+1</span> <span className="text-slate-300">Starborn Century Cake </span></li>
                        </ul>
                        <div className="h-px bg-white/10"></div>
                        <div className="text-slate-300">Universal fortune total: <span className="text-amber-300 font-semibold">181</span></div>

                        <div className="text-slate-200 font-semibold pt-1">Rarity bonuses</div>
                        <ul className="pl-0 space-y-0.5 text-xs">
                          <li className="flex items-center justify-between"><span><span className="font-semibold text-white">+26</span> <span className="text-white">Common</span></span><span className="text-slate-400">Newt</span></li>
                          <li className="flex items-center justify-between"><span><span className="font-semibold text-green-400">+26</span> <span className="text-green-400">Uncommon</span></span><span className="text-slate-400">Salamander</span></li>
                          <li className="flex items-center justify-between"><span><span className="font-semibold text-blue-400">+13</span> <span className="text-blue-400">Rare</span></span><span className="text-slate-400">Lizard King</span></li>
                          <li className="flex items-center justify-between"><span><span className="font-semibold text-purple-400">+13</span> <span className="text-purple-400">Epic</span></span><span className="text-slate-400">Leviathan</span></li>
                          <li className="flex items-center justify-between"><span><span className="font-semibold text-yellow-400">+0</span> <span className="text-yellow-400">Legendary</span></span><span className="text-slate-500"></span></li>
                        </ul>

                        <div className="text-slate-200 font-semibold pt-1">Totals</div>
                        <ul className="pl-0 space-y-0.5 text-xs">
                          <li className="flex items-center justify-between"><span className="text-white">Common</span><span className="text-white font-semibold">207</span></li>
                          <li className="flex items-center justify-between"><span className="text-green-400">Uncommon</span><span className="text-green-400 font-semibold">207</span></li>
                          <li className="flex items-center justify-between"><span className="text-blue-400">Rare</span><span className="text-blue-400 font-semibold">194</span></li>
                          <li className="flex items-center justify-between"><span className="text-purple-400">Epic</span><span className="text-purple-400 font-semibold">194</span></li>
                          <li className="flex items-center justify-between"><span className="text-yellow-400">Legendary</span><span className="text-yellow-400 font-semibold">181</span></li>
                        </ul>

                      </div>
                    }
                  />
                  </div>
                </div>
              <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.hunterFortune === 0 ? "" : form.hunterFortune}
                  placeholder="0"
                  onChange={(e) => handleInputChange("hunterFortune", Number(e.target.value))}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className="
                  w-full px-3 py-2 text-sm
                  bg-white/5 border border-white/10 rounded-md
                  text-white placeholder-slate-400
                  focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500/50
                  transition-colors duration-200
                "
                />
              </div>
            )}

            {/* Checkboxes */}
            <div className="space-y-0">
              {form.ironManView && (
                <>
                  {/* Exclude Chameleon Switch */}
                  <ToggleSwitch id="excludeChameleon" label="Exclude Chameleon" checked={form.excludeChameleon} onChange={(checked) => handleInputChange("excludeChameleon", checked)} />
                  {/* Exclude Wooden Bait Switch */}
                  <ToggleSwitch id="excludeWoodenBait" label="Exclude Wooden Bait" checked={form.noWoodenBait} onChange={(checked) => handleInputChange("noWoodenBait", checked)} />
                </>
              )}
              {/* Instant Buy Prices Switch */}
              {!form.ironManView && (
                <ToggleSwitch id="instantBuyPrices" label="Use Instant Buy Prices" checked={form.instantBuyPrices} onChange={(checked) => handleInputChange("instantBuyPrices", checked)} />
              )}
            </div>
          </div>
        </div>

        {/* Shard Levels */}
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-medium text-blue-300">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Shard Levels
          </h3>
          <div className="grid grid-cols-3 gap-1.5">
            {levelItems.map(({ key, label, shardId }) => {
              const shard = shards.find((s) => s.id === shardId);
              const shardDesc = SHARD_DESCRIPTIONS[shardId as keyof typeof SHARD_DESCRIPTIONS];
              return (
                <LevelDropdown
                  key={key}
                  value={form[key] as number}
                  onChange={handleLevelChange(key)}
                  label={label}
                  tooltipTitle={shardDesc?.title}
                  tooltipContent={<ShardDescription record={shardDesc} />}
                  tooltipShardName={label}
                  tooltipShardIcon={shardId}
                  tooltipRarity={shard?.rarity}
                  tooltipFamily={shard?.family}
                  tooltipType={shard?.type}
                  tooltipWarning={key === "crocodileLevel" ? "Warning: May slow calculations significantly" : undefined}
                />
              );
            })}
          </div>
        </div>

        {/* Craft Penalty Input */}
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-medium text-yellow-300">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            Craft Penalty
            <Tooltip
              content={
                form.ironManView
                  ? "Craft Penalty is the time (in seconds) added for each fusion. Higher values will make the algorithm favor doing less crafts."
                  : "Craft Penalty is the coin cost added for each fusion. Higher values will make the algorithm favor doing less crafts."
              }
            />
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={craftPenaltyInput}
              onChange={(e) => {
                const value = e.target.value;
                setCraftPenaltyInput(value);
                // If empty, use default for calculation
                if (value.trim() === "") {
                  handleInputChange("craftPenalty", (form.ironManView ? 0.8 : 1000));
                } else {
                  const num = Number(value);
                  if (!isNaN(num) && num >= 0) {
                    handleInputChange("craftPenalty", num);
                  }
                }
              }}
              placeholder={form.ironManView ? "0.8" : "1000"}
              className="w-32 px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-colors duration-200"
            />
            <span className="text-xs text-slate-400">{form.ironManView ? "seconds per craft" : "coins per craft"}</span>
          </div>
        </div>

        {/* Kraken Shard */}
        {form.ironManView && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-medium text-orange-300">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              Kraken Shard
            </h3>
            <div className="space-y-2">
              <KuudraDropdown
                value={(form.kuudraTier ?? "none")}
                onChange={(value) => handleInputChange("kuudraTier", value)}
                label="Kuudra Tier"
              />
              <MoneyInput
                value={moneyInput}
                onChange={(value: string) => {
                  setMoneyInput(value);
                  if (value.trim() === "") {
                    handleInputChange("moneyPerHour", Infinity); // Infinity means ignore key cost
                    onSubmit({ ...form, moneyPerHour: Infinity }); // force update tree
                  } else {
                    const parsed = parseShorthandNumber(value);
                    handleInputChange("moneyPerHour", parsed);
                  }
                }}
                placeholder="200k, 2.5m, 2b..."
              />
              <div>
                <ToggleSwitch
                  id="customKuudraTime"
                  label="Custom Kuudra Completion Time"
                  checked={form.customKuudraTime || false}
                  onChange={(checked) => {
                    handleInputChange("customKuudraTime", checked);
                    if (!checked) {
                      // Reset time input when disabling custom time
                      handleInputChange("kuudraTimeSeconds", null);
                      setKuudraTimeInput("");
                    }
                    // handleInputChange does not submit for customKuudraTime, so do it here.
                    const updatedForm = { ...form, customKuudraTime: checked };
                    if (!checked) {
                      updatedForm.kuudraTimeSeconds = null;
                    }
                    onSubmit(updatedForm);
                  }}
                />
                {form.customKuudraTime && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <label className="block text-xs font-medium text-gray-300">Time per Run</label>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={kuudraTimeInput}
                        onChange={(e) => {
                          const value = e.target.value;
                          setKuudraTimeInput(value);
                          if (value.trim() === "") {
                            handleInputChange("kuudraTimeSeconds", null);
                          } else {
                            const parsed = parseInt(value);
                            if (!isNaN(parsed) && parsed > 0) {
                              handleInputChange("kuudraTimeSeconds", parsed);
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                        placeholder={form.kuudraTier === "none" ? "0" : form.kuudraTier === "t5" ? "100" : "60"}
                        className="w-full px-3 py-2 pr-16 text-sm bg-white/5 border border-white/10 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 hover:border-white/20 hover:bg-white/10 transition-all duration-200"
                      />
                      <div className="absolute right-3 top-2.5 text-xs text-slate-500 pointer-events-none">s / run</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Are you sure you want to restart everything? This will clear all saved data and reload the page.")) {
                localStorage.clear();
                const url = window.location.href.split("?")[0];
                window.location.href = url + "?nocache=" + Date.now();
              }
            }}
            className="px-2 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-md text-xs border border-red-500/20 hover:border-red-500/30 transition-colors duration-200 flex items-center space-x-1.5 cursor-pointer"
          >
            <TriangleAlert className="w-3 h-3" />
            <span>Reset Everything</span>
          </button>
        </div>
      </form>
    </div>
  );
};
