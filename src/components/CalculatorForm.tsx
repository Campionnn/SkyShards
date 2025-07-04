import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings, Zap, RotateCcw, ChevronDown } from "lucide-react";
import { calculationSchema, type CalculationFormData } from "../schemas/validation";
import { ShardAutocomplete } from "./ShardAutocomplete";
import { KUUDRA_TIERS, MAX_QUANTITIES } from "../constants";
import { DataService } from "../services/dataService";
import { usePerformance } from "../contexts/PerformanceContext";
import type { ShardWithKey } from "../types";

interface PetLevelDropdownProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  isUltraPerformance?: boolean;
}

const PetLevelDropdown: React.FC<PetLevelDropdownProps> = React.memo(({ value, onChange, label, isUltraPerformance = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const levels = useMemo(() => Array.from({ length: 11 }, (_, i) => i), []); // 0-10

  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as Element;
    if (!target.closest(".pet-level-dropdown")) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, handleClickOutside]);

  const handleToggle = useCallback(() => {
    if (!isUltraPerformance) setIsOpen(!isOpen);
  }, [isUltraPerformance]);

  const handleLevelSelect = useCallback(
    (level: number) => {
      onChange(level);
      setIsOpen(false);
    },
    [onChange]
  );

  // Ultra performance mode uses native select
  if (isUltraPerformance) {
    return (
      <div className="relative">
        <label className="block text-xs font-medium text-slate-300 mb-0.5">{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
        >
          {levels.map((level) => (
            <option key={level} value={level}>
              Level {level}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="relative pet-level-dropdown">
      <label className="block text-xs font-medium text-slate-300 mb-0.5">{label}</label>
      <button
        type="button"
        onClick={handleToggle}
        className="
          w-full px-2 py-1.5 text-xs
          bg-white/5 backdrop-blur-performance
          border border-white/10 
          rounded-lg text-white
          focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50
          hover:bg-white/10 transition-colors-only
          flex items-center justify-between
        "
      >
        <span>{value}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          className="
            absolute z-50 w-full mt-1
            bg-slate-800/95 backdrop-blur-performance
            border border-white/10 
            rounded-lg shadow-2xl
            max-h-48 overflow-y-auto
            contain-paint
          "
        >
          {levels.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => handleLevelSelect(level)}
              className={`
                w-full px-2 py-1.5 text-xs text-left
                hover:bg-purple-500/20 transition-colors-only
                ${value === level ? "bg-purple-500/30 text-purple-300" : "text-white"}
                ${level !== levels.length - 1 ? "border-b border-white/5" : ""}
              `}
            >
              Level {level}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

interface KuudraDropdownProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

const KuudraDropdown: React.FC<KuudraDropdownProps> = React.memo(({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as Element;
    if (!target.closest(".kuudra-dropdown")) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, handleClickOutside]);

  const handleToggle = useCallback(() => setIsOpen(!isOpen), []);

  const handleTierSelect = useCallback(
    (tierValue: string) => {
      onChange(tierValue);
      setIsOpen(false);
    },
    [onChange]
  );

  const currentTier = useMemo(() => KUUDRA_TIERS.find((tier) => tier.value === value), [value]);

  return (
    <div className="relative kuudra-dropdown">
      <label className="block text-xs font-medium text-slate-300 mb-1">{label}</label>
      <button
        type="button"
        onClick={handleToggle}
        className="
          w-full px-2 py-1.5 text-sm
          bg-white/5 backdrop-blur-performance
          border border-white/10 
          rounded-lg text-white
          focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50
          hover:bg-white/10 transition-colors-only
          flex items-center justify-between
        "
      >
        <span>{currentTier?.label || value}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          className="
            absolute z-50 w-full mt-1
            bg-slate-800/95 backdrop-blur-performance
            border border-white/10 
            rounded-lg shadow-2xl
            max-h-48 overflow-y-auto
            contain-paint
          "
        >
          {KUUDRA_TIERS.map((tier) => (
            <button
              key={tier.value}
              type="button"
              onClick={() => handleTierSelect(tier.value)}
              className={`
                w-full px-2 py-1.5 text-xs text-left
                hover:bg-purple-500/20 transition-colors-only
                ${value === tier.value ? "bg-purple-500/30 text-purple-300" : "text-white"}
                ${tier !== KUUDRA_TIERS[KUUDRA_TIERS.length - 1] ? "border-b border-white/5" : ""}
              `}
            >
              {tier.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

interface CalculatorFormProps {
  onSubmit: (data: CalculationFormData) => void;
}

export const CalculatorForm: React.FC<CalculatorFormProps> = ({ onSubmit }) => {
  const {
    register,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CalculationFormData>({
    resolver: zodResolver(calculationSchema),
    defaultValues: {
      shard: "",
      quantity: 1,
      hunterFortune: 0,
      excludeChameleon: false,
      frogPet: false, // Default to false so "No Frog Pet" is unchecked by default
      newtLevel: 0,
      salamanderLevel: 0,
      lizardKingLevel: 0,
      leviathanLevel: 0,
      pythonLevel: 0,
      kingCobraLevel: 0,
      seaSerpentLevel: 0,
      tiamatLevel: 0,
      kuudraTier: "t5",
      moneyPerHour: 0,
      noWoodenBait: false,
    },
  });

  const selectedShard = watch("shard");
  const formData = watch();
  const { isUltraPerformanceMode } = usePerformance();

  // Auto-submit when form data changes (but only if we have a valid shard)
  useEffect(() => {
    const isValidShardName = async (shardName: string): Promise<boolean> => {
      if (!shardName || shardName.trim() === "") return false;

      try {
        const dataService = DataService.getInstance();
        const nameToKeyMap = await dataService.getShardNameToKeyMap();
        return !!nameToKeyMap[shardName.toLowerCase()];
      } catch {
        return false;
      }
    };

    if (selectedShard && selectedShard.trim() !== "" && formData.shard && formData.shard.trim() !== "") {
      const timeoutId = setTimeout(async () => {
        // Only trigger calculation if the shard name is valid and complete
        const isValid = await isValidShardName(formData.shard);
        if (isValid) {
          const currentValues = formData;
          const transformedData = {
            ...currentValues,
            frogPet: !currentValues.frogPet, // Invert because checkbox is "No Frog Pet"
          };
          onSubmit(transformedData);
        }
      }, 1000); // Increased delay to give more time for typing

      return () => clearTimeout(timeoutId);
    }
  }, [formData, onSubmit, selectedShard]);

  const handleShardSelect = (shard: ShardWithKey) => {
    setValue("shard", shard.name);
    // Trigger calculation after a brief delay
    setTimeout(() => {
      const currentValues = watch();
      const transformedData = {
        ...currentValues,
        shard: shard.name, // Ensure we use the selected shard name
        frogPet: !currentValues.frogPet, // Invert because checkbox is "No Frog Pet"
      };
      onSubmit(transformedData);
    }, 100);
  };

  const handleMaxStats = () => {
    setValue("hunterFortune", 121);
    setValue("newtLevel", 10);
    setValue("salamanderLevel", 10);
    setValue("lizardKingLevel", 10);
    setValue("leviathanLevel", 10);
    setValue("pythonLevel", 10);
    setValue("kingCobraLevel", 10);
    setValue("seaSerpentLevel", 10);
    setValue("tiamatLevel", 10);
  };

  const handleReset = () => {
    // Preserve current shard and quantity values
    const currentShard = watch("shard");
    const currentQuantity = watch("quantity");

    // Reset all form values to defaults
    reset();

    // Restore the preserved values
    setValue("shard", currentShard);
    setValue("quantity", currentQuantity);
  };

  const handleMaxQuantity = async () => {
    const shardName = selectedShard;
    if (!shardName || shardName.trim() === "") {
      setValue("quantity", MAX_QUANTITIES.common); // Default to common max if no shard selected
      return;
    }

    try {
      // Get the shard data to determine rarity
      const dataService = DataService.getInstance();
      const shard = await dataService.getShardByName(shardName);

      if (shard) {
        // Set max quantity based on rarity
        const maxQuantity = MAX_QUANTITIES[shard.rarity as keyof typeof MAX_QUANTITIES] || MAX_QUANTITIES.common;
        setValue("quantity", maxQuantity);
      } else {
        setValue("quantity", MAX_QUANTITIES.common); // Default to common if shard not found
      }
    } catch (error) {
      console.error("Failed to get shard rarity:", error);
      setValue("quantity", MAX_QUANTITIES.common); // Default to common on error
    }
  };

  return (
    <div
      className="
      bg-gradient-to-br from-slate-800/90 to-slate-900/90 
      backdrop-blur-xl border-2 border-slate-700/50 
      rounded-2xl p-6 shadow-2xl
      hover:border-slate-600/70 transition-all duration-300
      ring-1 ring-white/5
    "
    >
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* Shard Search Section */}
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Target Shard
              </label>
              <ShardAutocomplete value={selectedShard} onChange={(value) => setValue("shard", value)} onSelect={handleShardSelect} placeholder="Search for a shard..." />
              {errors.shard && <p className="mt-2 text-sm text-red-400">{errors.shard.message}</p>}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Quantity</label>
                <input
                  type="number"
                  min="1"
                  {...register("quantity", { valueAsNumber: true })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.currentTarget.blur(); // Remove focus to prevent any further issues
                    }
                  }}
                  className="
                  w-full px-3 py-3 text-sm
                  bg-slate-800/50 border-2 border-slate-600/50 
                  rounded-xl text-white placeholder-slate-400
                  focus:outline-none focus:border-purple-500/70 focus:bg-slate-800/70
                  hover:border-slate-500/70 hover:bg-slate-800/60
                  transition-all duration-200 ease-in-out
                  backdrop-blur-sm
                "
                />
                {errors.quantity && <p className="mt-2 text-sm text-red-400">{errors.quantity.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">&nbsp;</label>
                <button
                  type="button"
                  onClick={handleMaxQuantity}
                  className="
                    w-full h-[46px] text-sm bg-gradient-to-r from-blue-500 to-purple-500 
                    text-white font-semibold rounded-xl flex items-center justify-center
                    hover:from-blue-600 hover:to-purple-600
                    transition-all duration-200 ease-in-out cursor-pointer
                    hover:scale-[1.02] active:scale-[0.98]
                    shadow-lg hover:shadow-xl
                    ring-1 ring-white/10
                  "
                >
                  Max
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3 pb-2 border-b border-slate-700/50">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Settings className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Settings</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleMaxStats}
              className="
                h-10 px-4 bg-gradient-to-r from-yellow-500 to-orange-500 
                text-white font-semibold rounded-xl text-sm
                hover:from-yellow-600 hover:to-orange-600
                transition-all duration-200 ease-in-out flex items-center justify-center space-x-2 cursor-pointer
                hover:scale-[1.02] active:scale-[0.98]
                shadow-lg hover:shadow-xl
                ring-1 ring-white/10
              "
            >
              <Zap className="w-4 h-4" />
              <span>Max Stats</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="
                h-10 px-4 bg-gradient-to-r from-rose-500 to-pink-500 
                text-white font-semibold rounded-xl text-sm
                hover:from-rose-600 hover:to-pink-600
                transition-all duration-200 ease-in-out flex items-center justify-center space-x-2 cursor-pointer
                hover:scale-[1.02] active:scale-[0.98]
                shadow-lg hover:shadow-xl
                ring-1 ring-white/10
              "
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Hunter Fortune
              </label>
              <input
                type="number"
                min="0"
                {...register("hunterFortune", { valueAsNumber: true })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur(); // Remove focus to prevent any further issues
                  }
                }}
                className="
                  w-full px-3 py-3 text-sm
                  bg-slate-800/50 border-2 border-slate-600/50 
                  rounded-xl text-white placeholder-slate-400
                  focus:outline-none focus:border-purple-500/70 focus:bg-slate-800/70
                  hover:border-slate-500/70 hover:bg-slate-800/60
                  transition-all duration-200 ease-in-out
                  backdrop-blur-sm
                "
              />
            </div>

            <div className="space-y-2">
              <div className="flex gap-2 items-center space-x-2 p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200">
                <input
                  id="excludeChameleon"
                  type="checkbox"
                  {...register("excludeChameleon")}
                  className="
                    w-4 h-4 rounded-md bg-white/5 border-2 border-white/20 
                    text-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500
                    transition-all duration-200 cursor-pointer
                    checked:bg-purple-500 checked:border-purple-500
                  "
                />
                <label htmlFor="excludeChameleon" className="text-xs font-medium text-white cursor-pointer flex-1">
                  Exclude Chameleon
                </label>
              </div>

              <div className="flex gap-2 items-center space-x-2 p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200">
                <input
                  id="excludeWoodenBait"
                  type="checkbox"
                  {...register("noWoodenBait")}
                  className="
                    w-4 h-4 rounded-md bg-white/5 border-2 border-white/20 
                    text-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500
                    transition-all duration-200 cursor-pointer
                    checked:bg-purple-500 checked:border-purple-500
                  "
                />
                <label htmlFor="excludeWoodenBait" className="text-xs font-medium text-white cursor-pointer flex-1">
                  Exclude Wooden Bait
                </label>
              </div>

              <div className="flex gap-2 items-center space-x-2 p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200">
                <input
                  id="frogPet"
                  type="checkbox"
                  {...register("frogPet")}
                  className="
                    w-4 h-4 rounded-md bg-white/5 border-2 border-white/20 
                    text-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500
                    transition-all duration-200 cursor-pointer
                    checked:bg-purple-500 checked:border-purple-500
                  "
                />
                <label htmlFor="frogPet" className="text-xs font-medium text-white cursor-pointer flex-1">
                  No Frog Pet
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Shard Levels */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white">Shard Levels</h3>
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
            ].map(({ key, label }) => (
              <PetLevelDropdown key={key} value={watch(key as any) || 0} onChange={(value) => setValue(key as any, value)} label={label} isUltraPerformance={isUltraPerformanceMode} />
            ))}
          </div>
        </div>

        {/* Kraken Shard */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white">Kraken Shard</h3>
          <div className="space-y-2">
            <KuudraDropdown value={watch("kuudraTier") || "t5"} onChange={(value) => setValue("kuudraTier", value as any)} label="Kuudra Tier" />

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Coins/hour</label>
              <input
                type="number"
                min="0"
                placeholder="40000000"
                {...register("moneyPerHour", { valueAsNumber: true })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur(); // Remove focus to prevent any further issues
                  }
                }}
                className="
                  w-full px-2 py-1.5 text-sm
                  bg-white/5 backdrop-blur-xl 
                  border border-white/10 
                  rounded-lg text-white placeholder-slate-400
                  focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50
                  transition-all duration-200
                "
              />
              <p className="mt-1 text-xs text-slate-400">Empty to ignore key cost</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
