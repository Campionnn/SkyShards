import React from "react";
import { Zap, RotateCcw, Settings } from "lucide-react";
import { type CalculationFormData } from "../schemas/validation";
import { ShardAutocomplete } from "./ShardAutocomplete";
import { useCalculatorState } from "../context/CalculatorStateContext";
import { PetLevelDropdown } from "./calculator/PetLevelDropdown";
import { KuudraDropdown } from "./calculator/KuudraDropdown";
import { MAX_QUANTITIES } from "../constants";
import { isValidShardName } from "../utils";

interface CalculatorFormProps {
  onSubmit: (data: CalculationFormData) => void;
}

export const CalculatorForm: React.FC<CalculatorFormProps> = ({ onSubmit }) => {
  const { form, setForm } = useCalculatorState();

  React.useEffect(() => {
    console.log("[CalculatorForm] Mounted");
    return () => {
      console.log("[CalculatorForm] Unmounted");
    };
  }, []);

  // Calculation trigger based on valid shard name (instant, no debounce)
  React.useEffect(() => {
    const checkAndSubmit = async () => {
      if (form.shard && form.shard.trim() !== "") {
        const isValid = await isValidShardName(form.shard);
        if (isValid) {
          onSubmit({ ...form, frogPet: false });
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
    if (field !== "shard" && field !== "quantity") {
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
    // Reset to default, then immediately restore shard and quantity
    const resetFormData: CalculationFormData = {
      shard: currentShard,
      quantity: currentQuantity,
      hunterFortune: 0,
      excludeChameleon: false,
      frogPet: false,
      newtLevel: 0,
      salamanderLevel: 0,
      lizardKingLevel: 0,
      leviathanLevel: 0,
      pythonLevel: 0,
      kingCobraLevel: 0,
      seaSerpentLevel: 0,
      tiamatLevel: 0,
      crocodileLevel: 0,
      kuudraTier: "t5", // must be a valid enum value
      moneyPerHour: 0,
      noWoodenBait: false,
    };
    setForm(resetFormData);
    setTimeout(() => {
      onSubmit(resetFormData);
    }, 0);
  };

  return (
    <div className="bg-slate-800/40 border border-slate-600/30 rounded-md p-3 space-y-3">
      <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
        {/* Target Shard */}
        <div className="space-y-2">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-emerald-300 mb-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              Target Shard
            </label>
            <ShardAutocomplete
              value={form.shard}
              onChange={(value) => handleInputChange("shard", value)}
              onSelect={(shard) => {
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
                setTimeout(() => {
                  const input = document.querySelector<HTMLInputElement>('input[placeholder="1"]');
                  if (input) input.select();
                }, 0);
              }}
              placeholder="Search for a shard..."
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

            {/* Checkboxes */}
            <div className="space-y-0">
              {/* Exclude Chameleon Switch */}
              <div className="flex items-center justify-between py-1">
                <label htmlFor="excludeChameleon" className="text-sm font-medium text-slate-200 flex-1 cursor-pointer">
                  Exclude Chameleon
                </label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.excludeChameleon}
                  onClick={() => handleInputChange("excludeChameleon", !form.excludeChameleon)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full border border-white/10 transition-colors duration-200 cursor-pointer
                    ${form.excludeChameleon ? "bg-fuchsia-600" : "bg-white/5"}
                    hover:border-fuchsia-400`}
                  style={{ boxShadow: "none" }}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full shadow transition-transform duration-200 border border-white/10
                    ${form.excludeChameleon ? "bg-fuchsia-400" : "bg-slate-300/70"}
                    ${form.excludeChameleon ? "translate-x-5" : "translate-x-0.5"}`}
                    style={{ paddingLeft: "1px" }}
                  />
                </button>
              </div>
              {/* Exclude Wooden Bait Switch */}
              <div className="flex items-center justify-between py-1">
                <label htmlFor="excludeWoodenBait" className="text-sm font-medium text-slate-200 flex-1 cursor-pointer">
                  Exclude Wooden Bait
                </label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.noWoodenBait}
                  onClick={() => handleInputChange("noWoodenBait", !form.noWoodenBait)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full border border-white/10 transition-colors duration-200 cursor-pointer
                    ${form.noWoodenBait ? "bg-fuchsia-600" : "bg-white/5"}
                    hover:border-fuchsia-400`}
                  style={{ boxShadow: "none" }}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full shadow transition-transform duration-200 border border-white/10
                    ${form.noWoodenBait ? "bg-fuchsia-400" : "bg-slate-300/70"}
                    ${form.noWoodenBait ? "translate-x-5" : "translate-x-0.5"}`}
                    style={{ paddingLeft: "1px" }}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Shard Levels */}
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-medium text-blue-300">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Shard Levels
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { key: "newtLevel", label: "Newt" },
              { key: "salamanderLevel", label: "Salamander" },
              { key: "lizardKingLevel", label: "Lizard King" },
              { key: "leviathanLevel", label: "Leviathan" },
              { key: "pythonLevel", label: "Python" },
              { key: "kingCobraLevel", label: "King Cobra" },
              { key: "seaSerpentLevel", label: "Sea Serpent" },
              { key: "tiamatLevel", label: "Tiamat" },
              { key: "crocodileLevel", label: "Crocodile" },
            ].map(({ key, label }) => (
              <PetLevelDropdown
                key={key}
                value={(form[key as keyof CalculationFormData] as number) || 0}
                onChange={(value) => handleInputChange(key as keyof CalculationFormData, value)}
                label={label}
              />
            ))}
          </div>
        </div>

        {/* Kraken Shard */}
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-medium text-orange-300">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            Kraken Shard
          </h3>
          <div className="space-y-2">
            <KuudraDropdown value={form.kuudraTier || "t5"} onChange={(value) => handleInputChange("kuudraTier", value)} label="Kuudra Tier" />
            <div className="relative">
              <input
                type="number"
                min="0"
                placeholder="0"
                value={form.moneyPerHour === 0 ? "" : form.moneyPerHour}
                onChange={(e) => handleInputChange("moneyPerHour", Number(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className="w-full px-3 py-2 pr-20 text-sm bg-white/5 border border-white/10 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 hover:border-white/20 hover:bg-white/10 transition-all duration-200"
              />
              <div className="absolute right-3 top-2.5 text-xs text-slate-500 pointer-events-none">coins/hour</div>
              <p className="mt-1 text-xs text-slate-400">Empty to ignore key cost</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
