import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings, Zap, RotateCcw } from "lucide-react";
import { calculationSchema, type CalculationFormData } from "../schemas/validation";
import { ShardAutocomplete } from "./ShardAutocomplete";
import { KUUDRA_TIERS, MAX_QUANTITIES } from "../constants";
import { DataService } from "../services/dataService";
import type { ShardWithKey } from "../types";

interface PetLevelDropdownProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
}

const PetLevelDropdown: React.FC<PetLevelDropdownProps> = React.memo(({ value, onChange, label }) => {
  const levels = useMemo(() => Array.from({ length: 11 }, (_, i) => i), []); // 0-10

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-slate-300 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 appearance-none cursor-pointer hover:border-slate-500 transition-colors"
      >
        {levels.map((level) => (
          <option key={level} value={level} className="bg-slate-800 text-white">
            Level {level}
          </option>
        ))}
      </select>
    </div>
  );
});

interface KuudraDropdownProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

const KuudraDropdown: React.FC<KuudraDropdownProps> = React.memo(({ value, onChange, label }) => {
  return (
    <div className="relative">
      <label className="block text-xs font-medium text-slate-300 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 appearance-none cursor-pointer hover:border-slate-500 transition-colors"
      >
        {KUUDRA_TIERS.map((tier) => (
          <option key={tier.value} value={tier.value} className="bg-slate-800 text-white">
            {tier.label}
          </option>
        ))}
      </select>
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
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center space-x-2 pb-3 border-b border-slate-700">
        <div className="w-7 h-7 bg-purple-500/20 rounded flex items-center justify-center">
          <Settings className="w-4 h-4 text-purple-400" />
        </div>
        <h2 className="text-base font-medium text-white">Configuration</h2>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        {/* Target Shard */}
        <div className="space-y-3">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-200 mb-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Target Shard
            </label>
            <ShardAutocomplete value={selectedShard} onChange={(value) => setValue("shard", value)} onSelect={handleShardSelect} placeholder="Search for a shard..." />
            {errors.shard && <p className="mt-1 text-sm text-red-400">{errors.shard.message}</p>}
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-3">
              <label className="block text-xs font-medium text-slate-300 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                {...register("quantity", { valueAsNumber: true })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className="w-full px-3 py-2.5 text-sm bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 hover:border-slate-500 transition-colors"
              />
              {errors.quantity && <p className="mt-1 text-sm text-red-400">{errors.quantity.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">&nbsp;</label>
              <button
                type="button"
                onClick={handleMaxQuantity}
                className="w-full h-[42px] text-sm bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
              >
                Max
              </button>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-200">Settings</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleMaxStats}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-md transition-colors flex items-center space-x-1"
              >
                <Zap className="w-3 h-3" />
                <span>Max Stats</span>
              </button>

              <button type="button" onClick={handleReset} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md transition-colors flex items-center space-x-1">
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Hunter Fortune */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
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
                    e.currentTarget.blur();
                  }
                }}
                className="w-full px-3 py-2.5 text-sm bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-slate-900/50 border border-slate-600/50 rounded-lg hover:bg-slate-900/70 transition-colors">
                <input id="excludeChameleon" type="checkbox" {...register("excludeChameleon")} className="w-4 h-4 rounded bg-slate-600 border border-slate-500 text-indigo-500 focus:ring-indigo-500" />
                <label htmlFor="excludeChameleon" className="text-sm font-medium text-white cursor-pointer flex-1">
                  Exclude Chameleon
                </label>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-slate-900/50 border border-slate-600/50 rounded-lg hover:bg-slate-900/70 transition-colors">
                <input id="excludeWoodenBait" type="checkbox" {...register("noWoodenBait")} className="w-4 h-4 rounded bg-slate-600 border border-slate-500 text-indigo-500 focus:ring-indigo-500" />
                <label htmlFor="excludeWoodenBait" className="text-sm font-medium text-white cursor-pointer flex-1">
                  Exclude Wooden Bait
                </label>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-slate-900/50 border border-slate-600/50 rounded-lg hover:bg-slate-900/70 transition-colors">
                <input id="frogPet" type="checkbox" {...register("frogPet")} className="w-4 h-4 rounded bg-slate-600 border border-slate-500 text-indigo-500 focus:ring-indigo-500" />
                <label htmlFor="frogPet" className="text-sm font-medium text-white cursor-pointer flex-1">
                  No Frog Pet
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Shard Levels */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-200">Shard Levels</h3>
          <div className="grid grid-cols-2 gap-2">
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
              <PetLevelDropdown key={key} value={watch(key as any) || 0} onChange={(value) => setValue(key as any, value)} label={label} />
            ))}
          </div>
        </div>

        {/* Kraken Shard */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-200">Kraken Shard</h3>
          <div className="space-y-3">
            <KuudraDropdown value={watch("kuudraTier") || "t5"} onChange={(value) => setValue("kuudraTier", value as any)} label="Kuudra Tier" />

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Coins/hour</label>
              <input
                type="number"
                min="0"
                placeholder="40000000"
                {...register("moneyPerHour", { valueAsNumber: true })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className="w-full px-3 py-2.5 text-sm bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-slate-400">Empty to ignore key cost</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
