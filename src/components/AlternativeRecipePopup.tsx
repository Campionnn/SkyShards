import React from "react";
import { createPortal } from "react-dom";
import { X, Clock, Star, ChevronRight } from "lucide-react";
import { getRarityColor } from "../utils";
import type { AlternativeRecipePopupProps, Recipe, AlternativeRecipeOption } from "../types";

export const AlternativeRecipePopup: React.FC<AlternativeRecipePopupProps> = ({ isOpen, onClose, alternatives, onSelect, shardName, data, loading }) => {
  if (!isOpen) return null;

  const handleSelect = (recipe: Recipe | null) => {
    onSelect(recipe);
    onClose();
  };

  const formatTime = (timePerShard: number) => {
    if (timePerShard === Infinity) return "∞";
    if (timePerShard === 0) return "0s";

    const hours = Math.floor(timePerShard);
    const minutes = Math.floor((timePerShard - hours) * 60);
    const seconds = Math.floor(((timePerShard - hours) * 60 - minutes) * 60);

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const renderRecipeOption = (option: AlternativeRecipeOption, key: string | number, index: number) => {
    const isDirect = option.recipe === null;
    const isCurrent = option.isCurrent;

    return (
      <button
        key={key}
        onClick={() => handleSelect(option.recipe)}
        className={`w-full p-4 rounded-lg border text-left transition-all duration-200 ${
          isCurrent ? "bg-blue-500/20 border-blue-500/50 ring-2 ring-blue-500/30" : "bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50 hover:border-slate-500"
        }`}
        disabled={isCurrent}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {isDirect ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-green-400 font-medium">Direct Collection</span>
                {isCurrent && <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Current</span>}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full" />
                  <span className="text-purple-400 font-medium">Fusion Recipe</span>
                  {isCurrent && <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Current</span>}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {option.recipe!.inputs.map((inputId: string, inputIndex: number) => {
                    const inputShard = data.shards[inputId];
                    if (!inputShard) return null;

                    return (
                      <React.Fragment key={inputId}>
                        {inputIndex > 0 && <span className="text-slate-400">+</span>}
                        <div className="flex items-center gap-1">
                          <img src={`${import.meta.env.BASE_URL}shardIcons/${inputId}.png`} alt={inputShard.name} className="w-4 h-4 object-contain" loading="lazy" />
                          <span className={getRarityColor(inputShard.rarity)}>{inputShard.name}</span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">
                    {option.recipe!.outputQuantity}x {shardName}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1 text-slate-400">
              <Clock className="w-4 h-4" />
              <span>{formatTime(option.timePerShard)}</span>
            </div>
            {index === 0 && !isCurrent && (
              <div className="flex items-center gap-1 text-emerald-400">
                <Star className="w-4 h-4" />
                <span className="text-xs">Best</span>
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">Alternative Recipes</h2>
            <p className="text-slate-400 text-sm mt-1">
              Choose how to obtain <span className="text-white font-medium">{shardName}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : alternatives.length === 0 ? (
            <div className="text-center py-8 text-slate-400">No alternatives available for this shard.</div>
          ) : (
            <div className="space-y-3">
              {alternatives.map((option, index) => {
                // Create a unique key that includes recipe inputs and output to handle duplicates
                const uniqueKey = option.recipe ? `${option.recipe.inputs.join("-")}-${option.recipe.outputQuantity}-${index}` : `direct-${index}`;
                return renderRecipeOption(option, uniqueKey, index);
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>Options are sorted by efficiency (time per shard)</span>
            <span>{alternatives.length} alternatives found</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
