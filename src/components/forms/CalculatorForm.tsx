import React from "react";
import { Zap, RotateCcw, Settings, TriangleAlert, Layers } from "lucide-react";
import { type CalculationFormData } from "../../schemas";
import { ShardAutocomplete, MoneyInput } from "./inputs";
import { useCalculatorState } from "../../hooks";
import { LevelDropdown, KuudraDropdown } from "../calculator";
import { MAX_QUANTITIES, SHARD_DESCRIPTIONS } from "../../constants";
import { isValidShardName, formatShardDescription } from "../../utilities";
import { Tooltip, ToggleSwitch } from "../ui";
import type { ShardWithKey } from "../../types/types";
import { MultiSelectShardModal } from "../modals";
import { DataService } from "../../services";

interface CalculatorFormProps {
  onSubmit: (data: CalculationFormData) => void;
}

type LevelKey = keyof Pick<
  CalculationFormData,
  "newtLevel" | "salamanderLevel" | "lizardKingLevel" | "leviathanLevel" | "pythonLevel" | "kingCobraLevel" | "seaSerpentLevel" | "tiamatLevel" | "crocodileLevel"
>;

export const CalculatorForm: React.FC<CalculatorFormProps> = ({ onSubmit }) => {
  const { form, setForm, saveEnabled, setSaveEnabledState } = useCalculatorState();

  // Keep a ref of the latest form to use inside effects without depending on the whole object
  const latestFormRef = React.useRef<CalculationFormData>(form);
  React.useEffect(() => {
    latestFormRef.current = form;
  }, [form]);

  React.useEffect(() => {
    const checkAndSubmit = async () => {
      if (form.shard && form.shard.trim() !== "") {
        const isValid = await isValidShardName(form.shard);
        if (isValid) {
          onSubmit({ ...form, frogBonus: false });
        }
      }
    };
    checkAndSubmit().catch(console.error);
  }, [form.shard, form.quantity]);

  // Only call onSubmit immediately for non-shard/quantity fields
  const handleInputChange = <K extends keyof CalculationFormData>(field: K, value: CalculationFormData[K]) => {
    const updatedForm = { ...form, [field]: value } as CalculationFormData;
    setForm(updatedForm);
    if (field !== "shard" && field !== "quantity" && field !== "customKuudraTime") {
      onSubmit(updatedForm);
    }
  };

  const handleLevelChange =
    <K extends LevelKey>(key: K) =>
    (value: number) => {
      handleInputChange(key, value as CalculationFormData[K]);
    };

  const handleMaxStats = () => {
    const updatedForm = {
      ...form,
      hunterFortune: 121,
      newtLevel: 10,
      salamanderLevel: 10,
      lizardKingLevel: 10,
      leviathanLevel: 10,
      pythonLevel: 10,
      kingCobraLevel: 10,
      seaSerpentLevel: 10,
      tiamatLevel: 10,
      crocodileLevel: 10,
      kuudraTier: "t5" as CalculationFormData["kuudraTier"], // Set Kuudra to t5 on max stats, type-safe
    } as CalculationFormData;
    setForm(updatedForm);
    setTimeout(() => {
      onSubmit(updatedForm);
    }, 0);
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
    setTimeout(() => {
      onSubmit(resetFormData);
    }, 0);
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
      const updated = { ...latestFormRef.current, moneyPerHour: Infinity } as CalculationFormData;
      setForm(updated);
      onSubmit(updated);
    }
  }, [form.moneyPerHour, moneyInput, onSubmit, setForm]);

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
      handleInputChange("shard", "" as CalculationFormData["shard"]);
    }
  };

  // Handle craftPenalty default and mode switching
  React.useEffect(() => {
    const desiredDefault = form.ironManView ? 0.8 : 1000;
    const isNullish = form.craftPenalty === undefined || form.craftPenalty === null;

    if (isNullish) {
      const updated = { ...form, craftPenalty: desiredDefault } as CalculationFormData;
      setForm(updated);
      onSubmit(updated);
    } else if (form.ironManView && form.craftPenalty === 1000) {
      const updated = { ...form, craftPenalty: 0.8 } as CalculationFormData;
      setForm(updated);
      onSubmit(updated);
    } else if (!form.ironManView && form.craftPenalty === 0.8) {
      const updated = { ...form, craftPenalty: 1000 } as CalculationFormData;
      setForm(updated);
      onSubmit(updated);
    }
  }, [form.ironManView, form.craftPenalty, form, onSubmit, setForm]);

  // For craftPenalty, keep a local string state for user input
  const [craftPenaltyInput, setCraftPenaltyInput] = React.useState<string>("");

  // On mode switch, reset input to empty only; craft penalty default handled above
  React.useEffect(() => {
    setCraftPenaltyInput("");
  }, [form.ironManView]);

  // Build level items with strict typing for keys
  const levelItems: Array<{ key: LevelKey; label: string; shardId: string }> = [
    ...(form.ironManView
      ? ([
          { key: "newtLevel", label: "Newt", shardId: "C35" },
          { key: "salamanderLevel", label: "Salamander", shardId: "U8" },
          { key: "lizardKingLevel", label: "Lizard King", shardId: "R8" },
          { key: "leviathanLevel", label: "Leviathan", shardId: "E5" },
          { key: "pythonLevel", label: "Python", shardId: "R9" },
          { key: "kingCobraLevel", label: "King Cobra", shardId: "R54" },
        ] as Array<{ key: LevelKey; label: string; shardId: string }>)
      : []),
    { key: "seaSerpentLevel", label: "Sea Serpent", shardId: "E32" },
    { key: "tiamatLevel", label: "Tiamat", shardId: "L6" },
    { key: "crocodileLevel", label: "Crocodile", shardId: "R45" },
  ];

  // Materials Only mode state
  const [isMultiSelectModalOpen, setIsMultiSelectModalOpen] = React.useState(false);
  const [allShards, setAllShards] = React.useState<ShardWithKey[]>([]);

  const handleOpenMultiSelect = React.useCallback(async () => {
    if (allShards.length === 0) {
      const dataService = DataService.getInstance();
      const shards = await dataService.loadShards();
      setAllShards(shards);
    }
    setIsMultiSelectModalOpen(true);
  }, [allShards]);

  const handleMultiSelectDone = React.useCallback(
    (selectedData: Array<{ shard: ShardWithKey; quantity: number }>) => {
      const selectedKeys = selectedData.map((item) => item.shard.key);
      const updated = { ...form, selectedShardKeys: selectedKeys, shardQuantities: selectedData } as CalculationFormData;
      setForm(updated);
      setIsMultiSelectModalOpen(false);
      setTimeout(() => onSubmit(updated), 0);
    },
    [form, setForm, onSubmit]
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

        {/* Materials Only Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Materials Only</span>
            <Tooltip content="Calculate combined materials for multiple shards without showing the fusion tree."></Tooltip>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.materialsOnly}
            onClick={() => handleInputChange("materialsOnly", !form.materialsOnly)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full border border-white/10 transition-colors duration-200 cursor-pointer
              ${form.materialsOnly ? "bg-blue-600" : "bg-white/5"}
              hover:border-blue-400`}
            style={{ boxShadow: "none" }}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full shadow transition-transform duration-200 border border-white/10
              ${form.materialsOnly ? "bg-blue-400" : "bg-slate-300/70"}
              ${form.materialsOnly ? "translate-x-4" : "translate-x-0.5"}`}
              style={{ paddingLeft: "1px" }}
            />
          </button>
        </div>

        {/* Target Shard or Select Shards */}
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                {form.materialsOnly ? "Select Shards" : "Target Shard"}
              </label>

              <div className="flex items-center gap-5">
                {/* Auto Save Toggle */}
                <div className="flex items-center gap-1.5">
                  <label htmlFor="saveSettings" className="text-xs font-medium text-slate-200 cursor-pointer">
                    Auto Save
                  </label>
                  <Tooltip content="Automatically saves all your settings (fortune, shard levels, etc.) in your browser. Data is restored when the page reloads."></Tooltip>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={saveEnabled}
                    onClick={() => setSaveEnabledState(!saveEnabled)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full border border-white/10 transition-colors duration-200 cursor-pointer
                      ${saveEnabled ? "bg-emerald-600" : "bg-white/5"}
                      hover:border-emerald-400`}
                    style={{ boxShadow: "none" }}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full shadow transition-transform duration-200 border border-white/10
                      ${saveEnabled ? "bg-emerald-400" : "bg-slate-300/70"}
                      ${saveEnabled ? "translate-x-4" : "translate-x-0.5"}`}
                      style={{ paddingLeft: "1px" }}
                    />
                  </button>
                </div>
              </div>
            </div>
            {form.materialsOnly ? (
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
                      const updated = { ...form, selectedShardKeys: [], shardQuantities: [] } as CalculationFormData;
                      setForm(updated);
                      setTimeout(() => onSubmit(updated), 0);
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
                  onSelect={(shard: ShardWithKey) => {
                    // Use the rarity directly from the selected shard (provided by autocomplete)
                    let rarityKey = "common";
                    if (shard) {
                      const normalized = shard.rarity.toLowerCase();
                      if (normalized in MAX_QUANTITIES) rarityKey = normalized as keyof typeof MAX_QUANTITIES as string;
                    }
                    const maxQuantity: number = MAX_QUANTITIES[rarityKey as keyof typeof MAX_QUANTITIES];
                    const updated = { ...form, shard: shard.name, quantity: maxQuantity } as CalculationFormData;
                    setForm(updated);
                    setTimeout(() => onSubmit(updated), 0);
                    // Removed auto-select of quantity input
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
                  onChange={(e) => handleInputChange("quantity", Number(e.target.value) as CalculationFormData["quantity"])}
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
            </div>
          )}
        </div>

        {/* Multi-Select Shard Modal */}
        <MultiSelectShardModal
          isOpen={isMultiSelectModalOpen}
          onClose={() => setIsMultiSelectModalOpen(false)}
          shards={allShards}
          onDone={handleMultiSelectDone}
          initialSelected={form.selectedShardKeys || []}
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
                <label className="flex items-center gap-2 text-sm font-medium text-fuchsia-300 mb-2">
                  <div className="w-2 h-2 bg-fuchsia-500 rounded-full"></div>
                  Hunter Fortune
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.hunterFortune === 0 ? "" : form.hunterFortune}
                  placeholder="0"
                  onChange={(e) => handleInputChange("hunterFortune", Number(e.target.value) as CalculationFormData["hunterFortune"])}
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
              const shardDesc = SHARD_DESCRIPTIONS[shardId as keyof typeof SHARD_DESCRIPTIONS];
              return (
                <LevelDropdown
                  key={key}
                  value={form[key] as number}
                  onChange={handleLevelChange(key)}
                  label={label}
                  tooltipTitle={shardDesc?.title}
                  tooltipContent={formatShardDescription(shardDesc?.description || "No description available.")}
                  tooltipShardName={label}
                  tooltipShardIcon={shardId}
                  tooltipRarity={shardDesc?.rarity?.toLowerCase() || "common"}
                  tooltipFamily={shardDesc?.family}
                  tooltipType={shardDesc?.type}
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
                  handleInputChange("craftPenalty", (form.ironManView ? 0.8 : 1000) as CalculationFormData["craftPenalty"]);
                } else {
                  const num = Number(value);
                  if (!isNaN(num) && num >= 0) {
                    handleInputChange("craftPenalty", num as CalculationFormData["craftPenalty"]);
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
                value={(form.kuudraTier ?? "none") as CalculationFormData["kuudraTier"]}
                onChange={(value: string) => handleInputChange("kuudraTier", value as CalculationFormData["kuudraTier"])}
                label="Kuudra Tier"
              />
              <MoneyInput
                value={moneyInput}
                onChange={(value: string) => {
                  setMoneyInput(value);
                  if (value.trim() === "") {
                    handleInputChange("moneyPerHour", Infinity as CalculationFormData["moneyPerHour"]); // Infinity means ignore key cost
                    onSubmit({ ...form, moneyPerHour: Infinity }); // force update tree
                  } else {
                    const parsed = parseShorthandNumber(value);
                    handleInputChange("moneyPerHour", parsed as CalculationFormData["moneyPerHour"]);
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
                    handleInputChange("customKuudraTime", checked as CalculationFormData["customKuudraTime"]);
                    if (!checked) {
                      // Reset time input when disabling custom time
                      handleInputChange("kuudraTimeSeconds", null as CalculationFormData["kuudraTimeSeconds"]);
                      setKuudraTimeInput("");
                    }
                    // Manually trigger calculation after state update
                    setTimeout(() => {
                      const updatedForm = { ...form, customKuudraTime: checked } as CalculationFormData;
                      if (!checked) {
                        updatedForm.kuudraTimeSeconds = null;
                      }
                      onSubmit(updatedForm);
                    }, 0);
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
                            handleInputChange("kuudraTimeSeconds", null as CalculationFormData["kuudraTimeSeconds"]);
                          } else {
                            const parsed = parseInt(value);
                            if (!isNaN(parsed) && parsed > 0) {
                              handleInputChange("kuudraTimeSeconds", parsed as CalculationFormData["kuudraTimeSeconds"]);
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
            <span>Restart Everything</span>
          </button>
        </div>
      </form>
    </div>
  );
};
