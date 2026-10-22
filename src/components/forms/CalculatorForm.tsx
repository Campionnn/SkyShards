import { type KeyboardEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState, type WheelEvent } from "react";
import { Zap, RotateCcw, Settings, TriangleAlert, Layers } from "lucide-react";
import type { CalculationFormData } from "../../schemas";
import { ShardAutocomplete, MoneyInput } from "./inputs";
import { useCalculatorState, useShards } from "../../hooks";
import { LevelDropdown, KuudraDropdown, remainingToMax } from "../calculator";
import { LEVELED_SHARDS, SHARD_DESCRIPTIONS, maxQuantityForRarity, type ShardLevelKey } from "../../constants";
import { clearAllStorage } from "../../utilities";
import { ShardDescription } from "../ui/ShardDescription";
import { Tooltip, ToggleSwitch } from "../ui";
import type { Shard } from "../../types/types";
import { MultiSelectShardModal } from "../modals";
import { DataService } from "../../services";
import { HunterFortuneTooltip, MAX_HUNTER_FORTUNE } from "./HunterFortuneTooltip";

interface CalculatorFormProps {
  onSubmit: (data: CalculationFormData) => void;
  ownedAttributes?: Map<string, number>;
  useInventory?: boolean;
  onUseInventoryChange?: (enabled: boolean) => void;
}

/** Ironman craft penalty is seconds per fusion; normal is coins per fusion. */
const defaultCraftPenalty = (ironManView: boolean) => (ironManView ? 0.8 : 1000);

const allLevels = (level: number) => Object.fromEntries(LEVELED_SHARDS.map(({ key }) => [key, level])) as Record<ShardLevelKey, number>;

/** Parse shorthand like 10k, 53m, 2.5b. */
const parseShorthandNumber = (value: string): number => {
  if (!value) return 0;
  const match = value
    .trim()
    .toLowerCase()
    .match(/^([\d,.]+)([kmb])?$/);
  if (!match) return Number(value.replace(/,/g, "")) || 0;
  const multiplier = { k: 1_000, m: 1_000_000, b: 1_000_000_000 }[match[2] as "k" | "m" | "b"] ?? 1;
  return Math.round(parseFloat(match[1].replace(/,/g, "")) * multiplier);
};

const blurOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter") {
    e.preventDefault();
    e.currentTarget.blur();
  }
};

// A focused number input would otherwise change value as the page scrolls.
const blurOnWheel = (e: WheelEvent<HTMLInputElement>) => e.currentTarget.blur();

// Full class strings: Tailwind only emits classes it finds verbatim.
const SECTION_COLORS = {
  emerald: { text: "text-emerald-300", dot: "bg-emerald-500" },
  fuchsia: { text: "text-fuchsia-300", dot: "bg-fuchsia-500" },
  blue: { text: "text-blue-300", dot: "bg-blue-500" },
  yellow: { text: "text-yellow-300", dot: "bg-yellow-500" },
  orange: { text: "text-orange-300", dot: "bg-orange-500" },
} as const;

const SectionTitle = ({ color, className = "", children }: { color: keyof typeof SECTION_COLORS; className?: string; children: ReactNode }) => (
  <h3 className={`flex items-center gap-2 text-sm font-medium ${SECTION_COLORS[color].text} ${className}`}>
    <div className={`w-2 h-2 ${SECTION_COLORS[color].dot} rounded-full`}></div>
    {children}
  </h3>
);

const ProfileButton = ({ active, activeClass, onClick, children }: { active: boolean; activeClass: string; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    className={`px-3 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex-1 border cursor-pointer ${
      active ? activeClass : "bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 border-slate-600/50 hover:border-slate-500/50"
    }`}
    onClick={onClick}
  >
    {children}
  </button>
);

const STAT_BUTTON = "px-2 py-1.5 font-medium rounded-md text-xs border transition-colors duration-200 flex items-center space-x-1 cursor-pointer";

/**
 * The calculator settings. Edits are written to the shared form (CalculatorStateContext)
 * and handed to `onSubmit`, which recalculates. Shard and quantity edits are the
 * exception: they submit from an effect, and only once the shard name is a real shard.
 */
export const CalculatorForm = ({ onSubmit, ownedAttributes, useInventory, onUseInventoryChange }: CalculatorFormProps) => {
  const { form, setForm, saveEnabled, setSaveEnabledState } = useCalculatorState();
  const { shards } = useShards();

  // Raw text of the inputs that parse into a form field.
  const [moneyInput, setMoneyInput] = useState("");
  const [kuudraTimeInput, setKuudraTimeInput] = useState("");
  const [craftPenaltyInput, setCraftPenaltyInput] = useState("");

  const [isMultiSelectModalOpen, setIsMultiSelectModalOpen] = useState(false);
  const [allShards, setAllShards] = useState<Shard[]>([]);

  // Latest form and onSubmit, for effects that must not re-run when they change.
  const latestFormRef = useRef(form);
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    latestFormRef.current = form;
    onSubmitRef.current = onSubmit;
  });

  const submit = (updated: CalculationFormData) => {
    setForm(updated);
    onSubmit(updated);
  };
  const update = (patch: Partial<CalculationFormData>) => submit({ ...form, ...patch });

  /** Effects patch the latest form, not the one from their render. */
  const submitLatest = useCallback(
    (patch: Partial<CalculationFormData>) => {
      const updated = { ...latestFormRef.current, ...patch };
      setForm(updated);
      onSubmitRef.current(updated);
    },
    [setForm],
  );

  useEffect(() => {
    const checkAndSubmit = async () => {
      const current = latestFormRef.current;
      if (current.shard.trim() === "") return;
      const nameToKey = await DataService.getInstance().getShardNameToKeyMap();
      if (nameToKey[current.shard.trim().toLowerCase()]) onSubmitRef.current({ ...current, frogBonus: false });
    };
    checkAndSubmit().catch(console.error);
  }, [form.shard, form.quantity]);

  // An empty Money per Hour field means "ignore key cost", stored as Infinity.
  useEffect(() => {
    const moneyUnset = form.moneyPerHour === undefined || form.moneyPerHour === null || form.moneyPerHour === 0;
    if (moneyUnset && moneyInput === "") submitLatest({ moneyPerHour: Infinity });
  }, [form.moneyPerHour, moneyInput, submitLatest]);

  useEffect(() => {
    if (form.moneyPerHour === null || form.moneyPerHour === undefined) setMoneyInput("");
  }, [form.moneyPerHour]);

  // Fill in a missing craft penalty, and swap the other mode's default for this one's.
  useEffect(() => {
    if (form.craftPenalty === undefined || form.craftPenalty === null) submitLatest({ craftPenalty: defaultCraftPenalty(form.ironManView) });
    else if (form.craftPenalty === defaultCraftPenalty(!form.ironManView)) submitLatest({ craftPenalty: defaultCraftPenalty(form.ironManView) });
  }, [form.ironManView, form.craftPenalty, submitLatest]);

  useEffect(() => setCraftPenaltyInput(""), [form.ironManView]);

  const handleMaxStats = () => update({ hunterFortune: MAX_HUNTER_FORTUNE, ...allLevels(10), kuudraTier: "t5" });

  // Keeps the target, the profile mode and its price source, and the multi-shard selection.
  const handleReset = () => {
    update({
      hunterFortune: 0,
      excludeChameleon: false,
      frogBonus: false,
      ...allLevels(0),
      kuudraTier: "none",
      moneyPerHour: Infinity,
      customKuudraTime: false,
      kuudraTimeSeconds: null,
      noWoodenBait: false,
      craftPenalty: defaultCraftPenalty(form.ironManView),
      shardQuantities: form.shardQuantities || [],
    });
    setMoneyInput("");
    setKuudraTimeInput("");
  };

  const handleResetEverything = () => {
    if (window.confirm("Are you sure you want to restart everything? This will clear all saved data and reload the page.")) {
      clearAllStorage();
      window.location.href = window.location.href.split("?")[0] + "?nocache=" + Date.now();
    }
  };

  const handleOpenMultiSelect = async () => {
    if (allShards.length === 0) {
      const loaded = await DataService.getInstance().loadShards();
      // Chameleon (L4) is only ever a fusion input.
      setAllShards(loaded.filter((shard) => shard.id !== "L4"));
    }
    setIsMultiSelectModalOpen(true);
  };

  // Stable identity: the modal resets its picks whenever this prop changes while open.
  const initialSelections = useMemo(() => new Map((form.shardQuantities || []).map((item) => [item.shard.id, item.quantity])), [form.shardQuantities]);

  const handleMultiSelectDone = (selected: Array<{ shard: Shard; quantity: number }>) => {
    submitLatest({ selectedShardKeys: selected.map((item) => item.shard.id), shardQuantities: selected });
    setIsMultiSelectModalOpen(false);
  };

  const handleCraftPenaltyChange = (value: string) => {
    setCraftPenaltyInput(value);
    if (value.trim() === "") return update({ craftPenalty: defaultCraftPenalty(form.ironManView) });
    const num = Number(value);
    if (!isNaN(num) && num >= 0) update({ craftPenalty: num });
  };

  const handleMoneyChange = (value: string) => {
    setMoneyInput(value);
    update({ moneyPerHour: value.trim() === "" ? Infinity : parseShorthandNumber(value) });
  };

  const handleCustomKuudraTimeChange = (checked: boolean) => {
    update(checked ? { customKuudraTime: true } : { customKuudraTime: false, kuudraTimeSeconds: null });
    if (!checked) setKuudraTimeInput("");
  };

  const handleKuudraTimeChange = (value: string) => {
    setKuudraTimeInput(value);
    if (value.trim() === "") return update({ kuudraTimeSeconds: null });
    const parsed = parseInt(value);
    if (!isNaN(parsed) && parsed > 0) update({ kuudraTimeSeconds: parsed });
  };

  // Only Crocodile is shown on a normal profile; the rest are ironman-only.
  const levelItems = LEVELED_SHARDS.filter((item) => form.ironManView || !item.ironmanOnly);
  const selectedCount = form.selectedShardKeys?.length ?? 0;
  const selectedShard = form.shard ? shards.find((s) => s.name === form.shard) : undefined;

  return (
    <div className="bg-slate-800/40 border border-slate-600/30 rounded-md p-3 space-y-3">
      <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
        <div className="flex space-x-2">
          <ProfileButton active={form.ironManView} activeClass="bg-white/20 text-white border-white/30" onClick={() => update({ ironManView: true })}>
            Ironman Profile
          </ProfileButton>
          <ProfileButton
            active={!form.ironManView}
            activeClass="bg-blue-500/30 text-blue-200 border-blue-400/50"
            onClick={() => update({ ironManView: false })}
          >
            Normal Profile
          </ProfileButton>
        </div>

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
              <SectionTitle color="emerald">{form.materialsOnly ? "Select Shards" : "Target Shard"}</SectionTitle>
              <ToggleSwitch
                size="sm"
                accent="blue"
                label="Multi-Shard Mode"
                labelClassName="text-white"
                tooltip="Calculate combined materials for multiple shards. Does not work with use inventory"
                checked={form.materialsOnly}
                onChange={(checked) => update({ materialsOnly: checked })}
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
                  <span>{selectedCount > 0 ? `${selectedCount} Shard${selectedCount > 1 ? "s" : ""} Selected` : "Select Shards"}</span>
                </button>
                {selectedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => update({ selectedShardKeys: [], shardQuantities: [] })}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/20 hover:border-red-500/30 rounded-md text-red-400 font-medium transition-colors flex items-center justify-center cursor-pointer text-sm"
                    title="Clear selection"
                  >
                    Clear
                  </button>
                )}
              </div>
            ) : (
              <ShardAutocomplete
                value={form.shard}
                onChange={(value) => setForm({ ...form, shard: value })}
                onSelect={(shard) => update({ shard: shard.name, quantity: remainingToMax(shard.rarity, ownedAttributes?.get(shard.id)) })}
                // Clear a selected shard on focus so typing starts a fresh search.
                onFocus={() => form.shard && setForm({ ...form, shard: "" })}
                placeholder="Search for a shard..."
                searchMode="name-only"
              />
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
                  onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                  onKeyDown={blurOnEnter}
                  onWheel={blurOnWheel}
                  className="w-full px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors duration-200"
                />
              </div>
              {selectedShard && (
                <div className="flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={() => update({ quantity: maxQuantityForRarity(selectedShard.rarity) })}
                    className="px-2.5 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-md text-slate-300 hover:text-white transition-colors duration-200 cursor-pointer"
                    title={`Set to max (${maxQuantityForRarity(selectedShard.rarity)})`}
                  >
                    Max
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <MultiSelectShardModal
          isOpen={isMultiSelectModalOpen}
          onClose={() => setIsMultiSelectModalOpen(false)}
          shards={allShards}
          onDone={handleMultiSelectDone}
          initialSelections={initialSelections}
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
                className={`${STAT_BUTTON} bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border-amber-500/20 hover:border-amber-500/30`}
              >
                <Zap className="w-3 h-3" />
                <span>Max Stats</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className={`${STAT_BUTTON} bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/20 hover:border-red-500/30`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Stats</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {form.ironManView && (
              <div>
                <SectionTitle color="fuchsia" className="mb-2">
                  <span>Hunter Fortune</span>
                  <div className="-mb-[5px]">
                    <HunterFortuneTooltip />
                  </div>
                </SectionTitle>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.hunterFortune === 0 ? "" : form.hunterFortune}
                  placeholder="0"
                  onChange={(e) => update({ hunterFortune: Number(e.target.value) })}
                  onWheel={blurOnWheel}
                  className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500/50 transition-colors duration-200"
                />
              </div>
            )}

            <div className="space-y-0">
              {form.ironManView ? (
                <>
                  <ToggleSwitch
                    id="excludeChameleon"
                    label="Exclude Chameleon"
                    checked={form.excludeChameleon}
                    onChange={(checked) => update({ excludeChameleon: checked })}
                  />
                  <ToggleSwitch
                    id="excludeWoodenBait"
                    label="Exclude Wooden Bait"
                    checked={form.noWoodenBait}
                    onChange={(checked) => update({ noWoodenBait: checked })}
                  />
                </>
              ) : (
                <ToggleSwitch
                  id="instantBuyPrices"
                  label="Use Instant Buy Prices"
                  checked={form.instantBuyPrices}
                  onChange={(checked) => update({ instantBuyPrices: checked })}
                />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <SectionTitle color="blue">Shard Levels</SectionTitle>
          <div className="grid grid-cols-3 gap-1.5">
            {levelItems.map(({ key, label, shardId }) => {
              const shard = shards.find((s) => s.id === shardId);
              const shardDesc = SHARD_DESCRIPTIONS[shardId];
              return (
                <LevelDropdown
                  key={key}
                  value={form[key]}
                  onChange={(value) => update({ [key]: value })}
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

        <div className="space-y-2">
          <SectionTitle color="yellow">
            Craft Penalty
            <Tooltip
              content={`Craft Penalty is the ${form.ironManView ? "time (in seconds)" : "coin cost"} added for each fusion. Higher values will make the algorithm favor doing less crafts.`}
            />
          </SectionTitle>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={craftPenaltyInput}
              onChange={(e) => handleCraftPenaltyChange(e.target.value)}
              placeholder={String(defaultCraftPenalty(form.ironManView))}
              className="w-32 px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-colors duration-200"
            />
            <span className="text-xs text-slate-400">{form.ironManView ? "seconds per craft" : "coins per craft"}</span>
          </div>
        </div>

        {form.ironManView && (
          <div className="space-y-2">
            <SectionTitle color="orange">Kraken Shard</SectionTitle>
            <div className="space-y-2">
              <KuudraDropdown value={form.kuudraTier ?? "none"} onChange={(value) => update({ kuudraTier: value })} label="Kuudra Tier" />
              <MoneyInput value={moneyInput} onChange={handleMoneyChange} placeholder="200k, 2.5m, 2b..." />
              <div>
                <ToggleSwitch
                  id="customKuudraTime"
                  label="Custom Kuudra Completion Time"
                  checked={form.customKuudraTime || false}
                  onChange={handleCustomKuudraTimeChange}
                />
                {form.customKuudraTime && (
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-300">Time per Run</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={kuudraTimeInput}
                        onChange={(e) => handleKuudraTimeChange(e.target.value)}
                        onKeyDown={blurOnEnter}
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
            onClick={handleResetEverything}
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
