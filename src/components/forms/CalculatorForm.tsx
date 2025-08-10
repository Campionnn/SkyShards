import React from "react";
import { Zap, RotateCcw, Settings } from "lucide-react";
import { type CalculationFormData } from "../../schemas";
import { ShardAutocomplete, MoneyInput } from "./inputs";
import { useCalculatorState } from "../../context";
import { LevelDropdown, KuudraDropdown } from "../calculator";
import { MAX_QUANTITIES, SHARD_DESCRIPTIONS } from "../../constants";
import { isValidShardName, formatShardDescription } from "../../utilities";
import { Tooltip, ToggleSwitch } from "../ui";

interface CalculatorFormProps {
  onSubmit: (data: CalculationFormData) => void;
}

export const CalculatorForm: React.FC<CalculatorFormProps> = ({ onSubmit }) => {
  const { form, setForm, saveEnabled, setSaveEnabledState } = useCalculatorState();

  // Removed debug logs

  // Calculation trigger based on valid shard name (instant, no debounce)
  React.useEffect(() => {
    const checkAndSubmit = async () => {
      if (form.shard && form.shard.trim() !== "") {
        const isValid = await isValidShardName(form.shard);
        if (isValid) {
          onSubmit({ ...form, frogBonus: false });
        }
      }
    };
    checkAndSubmit();
  }, [form.shard, form.quantity]);

  // Only call onSubmit immediately for non-shard/quantity fields
  const handleInputChange = (field: keyof CalculationFormData, value: any) => {
    const updatedForm = { ...form, [field]: value };
    setForm(updatedForm);
    // Only trigger immediate submit for fields that are not 'shard' and 'quantity'
    // Also exclude customKuudraTime to prevent re-render cycles
    if (field !== "shard" && field !== "quantity" && field !== "customKuudraTime") {
      onSubmit(updatedForm);
    }
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
    };
    setForm(updatedForm);
    setTimeout(() => {
      onSubmit(updatedForm);
    }, 0);
  };

  const handleReset = () => {
    // Preserve current shard and quantity values
    const currentShard = form.shard;
    const currentQuantity = form.quantity;
    const currentIronManView = form.ironManView;
    const currentInstantBuyPrices = form.instantBuyPrices;
    // Reset to default, then immediately restore shard and quantity
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
  React.useEffect(() => {
    if ((form.moneyPerHour === undefined || form.moneyPerHour === null || form.moneyPerHour === 0) && moneyInput === "") {
      handleInputChange("moneyPerHour", Infinity);
      // Also force update tree if needed
      onSubmit({ ...form, moneyPerHour: Infinity });
    }
    // eslint-disable-next-line
  }, [form.shard]);

  // Only clear the input when moneyPerHour is reset to null
  React.useEffect(() => {
    if ((form.moneyPerHour === null || form.moneyPerHour === undefined) && moneyInput !== "") setMoneyInput("");
    // Do not sync for numbers, so user input (e.g. 50m) is preserved
    // eslint-disable-next-line
  }, [form.moneyPerHour]);

  // Clear shard input on focus if a shard is already selected
  const handleShardInputFocus = () => {
    if (form.shard) {
      handleInputChange("shard", "");
    }
  };

  // Handle craftPenalty default and mode switching
  React.useEffect(() => {
    if (form.craftPenalty === undefined || form.craftPenalty === null) {
      handleInputChange("craftPenalty", form.ironManView ? 0.8 : 1000);
    } else {
      // If switching modes, update default only if current value matches previous default
      if (form.ironManView && form.craftPenalty === 1000) {
        handleInputChange("craftPenalty", 0.8);
      } else if (!form.ironManView && form.craftPenalty === 0.8) {
        handleInputChange("craftPenalty", 1000);
      }
    }
    // eslint-disable-next-line
  }, [form.ironManView]);

  // For craftPenalty, keep a local string state for user input
  const [craftPenaltyInput, setCraftPenaltyInput] = React.useState<string>("");

  // On mode switch, reset input to empty and set default in form state, but do NOT set input value
  React.useEffect(() => {
    setCraftPenaltyInput(""); // keep input empty
    handleInputChange("craftPenalty", form.ironManView ? 0.8 : 1000);
    // eslint-disable-next-line
  }, [form.ironManView]);

  return (
    <div className="bg-slate-800/40 border border-slate-600/30 rounded-md p-3 space-y-3">
      <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
        {/* Ironman Mode Toggle */}
        <div>
          <button
            className={`px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer border ${
              form.ironManView
                ? "bg-white/20 hover:bg-white/30 text-white border-white/20 hover:border-white/30"
                : "bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/20 hover:border-blue-500/30"
            }`}
            onClick={() => handleInputChange("ironManView", !form.ironManView)}
          >
            <img src={`${import.meta.env.BASE_URL}IronChestplate.webp`} alt="Ironman view" className="w-3 h-3 object-contain flex-shrink-0" loading="lazy" />
            <span>{form.ironManView ? "Ironman Profile Mode" : "Normal Profile Mode"}</span>
          </button>
        </div>

        {/* Target Shard */}
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                Target Shard
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
            <ShardAutocomplete
              value={form.shard}
              onChange={(value: string) => handleInputChange("shard", value)}
              onSelect={(shard: any) => {
                // Use the rarity directly from the selected shard (provided by autocomplete)
                let rarityKey = "common";
                if (shard && typeof shard.rarity === "string") {
                  const normalized = shard.rarity.toLowerCase();
                  if (normalized in MAX_QUANTITIES) rarityKey = normalized;
                }
                const maxQuantity: number = MAX_QUANTITIES[rarityKey as keyof typeof MAX_QUANTITIES];
                const updated = { ...form, shard: shard.name, quantity: maxQuantity };
                setForm(updated);
                setTimeout(() => onSubmit(updated), 0);
                // Removed auto-select of quantity input
              }}
              onFocus={handleShardInputFocus}
              placeholder="Search for a shard..."
              searchMode="name-only"
            />
          </div>
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
                className="w-full px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors duration-200"
              />
            </div>
          </div>
        </div>

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
                <span>Reset</span>
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
                  onChange={(e) => handleInputChange("hunterFortune", Number(e.target.value))}
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
            {[
              ...(form.ironManView
                ? [
                    { key: "newtLevel", label: "Newt", shardId: "C35" },
                    { key: "salamanderLevel", label: "Salamander", shardId: "U8" },
                    { key: "lizardKingLevel", label: "Lizard King", shardId: "R8" },
                    { key: "leviathanLevel", label: "Leviathan", shardId: "E5" },
                    { key: "pythonLevel", label: "Python", shardId: "R9" },
                    { key: "kingCobraLevel", label: "King Cobra", shardId: "R54" },
                  ]
                : []),
              { key: "seaSerpentLevel", label: "Sea Serpent", shardId: "E32" },
              { key: "tiamatLevel", label: "Tiamat", shardId: "L6" },
              { key: "crocodileLevel", label: "Crocodile", shardId: "R45" },
            ].map(({ key, label, shardId }) => {
              const shardDesc = SHARD_DESCRIPTIONS[shardId as keyof typeof SHARD_DESCRIPTIONS];
              return (
                <LevelDropdown
                  key={key}
                  value={(form[key as keyof CalculationFormData] as number) || 0}
                  onChange={(value: number) => handleInputChange(key as keyof CalculationFormData, value)}
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
              onChange={e => {
                const value = e.target.value;
                setCraftPenaltyInput(value);
                // If empty, use default for calculation
                if (value.trim() === "") {
                  handleInputChange("craftPenalty", form.ironManView ? 0.8 : 1000);
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
            <span className="text-xs text-slate-400">
              {form.ironManView ? "seconds per craft" : "coins per craft"}
            </span>
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
              <KuudraDropdown value={form.kuudraTier || "none"} onChange={(value) => handleInputChange("kuudraTier", value)} label="Kuudra Tier" />
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
                    // Manually trigger calculation after state update
                    setTimeout(() => {
                      const updatedForm = { ...form, customKuudraTime: checked };
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
      </form>
    </div>
  );
};
