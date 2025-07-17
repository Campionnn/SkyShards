import React from "react";
import { Zap, RotateCcw, Settings } from "lucide-react";
import { type CalculationFormData } from "../../schemas";
import { ShardAutocomplete } from "./inputs";
import { useCalculatorState } from "../../context";
import { LevelDropdown } from "../calculator";
import { MAX_QUANTITIES, SHARD_DESCRIPTIONS } from "../../constants";
import { isValidShardName, formatShardDescription } from "../../utilities";

interface CalculatorFormProps {
    onSubmit: (data: CalculationFormData) => void;
}

export const CostCalculatorForm: React.FC<CalculatorFormProps> = ({ onSubmit }) => {
    const { form, setForm } = useCalculatorState();
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
        if (field !== "shard" && field !== "quantity") {
            onSubmit(updatedForm);
        }
    };

    const handleMaxStats = () => {
        const updatedForm = {
            ...form,
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
            noWoodenBait: false,
        };
        setForm(resetFormData);
        setTimeout(() => {
            onSubmit(resetFormData);
        }, 0);
    };

    // Clear shard input on focus if a shard is already selected
    const handleShardInputFocus = () => {
        if (form.shard) {
            handleInputChange("shard", "");
        }
    };

    return (
        <div className="bg-slate-800/40 border border-slate-600/30 rounded-md p-3 space-y-3">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
                {/* Target Shard */}
                <div className="space-y-2">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                Target Shard
                            </label>
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
                </div>

                {/* Shard Levels */}
                <div className="space-y-2">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-blue-300">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        Shard Levels
                    </h3>
                    <div className="grid grid-cols-3 gap-1.5">
                        {[
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
            </form>
        </div>
    );
};
