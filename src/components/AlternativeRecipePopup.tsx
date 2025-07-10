import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Clock, Star, ChevronRight, Search } from "lucide-react";
import { getRarityColor, formatTime } from "../utils";
import type { AlternativeRecipePopupProps, Recipe, AlternativeRecipeOption } from "../types";

export const AlternativeRecipePopup: React.FC<AlternativeRecipePopupProps> = ({ isOpen, onClose, alternatives, onSelect, shardName, data, loading }) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Reset search query when popup closes
  React.useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Filter alternatives based on search query
  const filteredAlternatives = useMemo(() => {
    if (!searchQuery.trim()) {
      return alternatives; // Show all alternatives when no search
    }

    const query = searchQuery.toLowerCase();
    const filtered = alternatives.filter((option) => {
      if (option.recipe === null) {
        // Direct collection - always include if searching for "direct" or "collection"
        return "direct collection".includes(query);
      } else {
        // Fusion recipe - search in input shard names
        return option.recipe.inputs.some((inputId) => {
          const inputShard = data.shards[inputId];
          return inputShard?.name.toLowerCase().includes(query);
        });
      }
    });

    return filtered; // Return all filtered results
  }, [alternatives, searchQuery, data.shards]);

  if (!isOpen) return null;

  const handleSelect = (recipe: Recipe | null) => {
    onSelect(recipe);
    onClose();
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
            {index === 0 && !isCurrent && !searchQuery && (
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
      <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 flex-shrink-0">
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

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-700 flex-shrink-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for shards in recipes..."
              className="w-full pl-10 pr-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-colors text-sm"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="mt-2 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Clear search
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
              </div>
            ) : filteredAlternatives.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                {searchQuery ? "No alternatives match your search." : "No alternatives available for this shard."}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAlternatives.map((option, index) => {
                  // Create a unique key that includes recipe inputs and output to handle duplicates
                  const uniqueKey = option.recipe ? `${option.recipe.inputs.join("-")}-${option.recipe.outputQuantity}-${index}` : `direct-${index}`;
                  return renderRecipeOption(option, uniqueKey, index);
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>
              {searchQuery 
                ? `${filteredAlternatives.length} of ${alternatives.length} alternatives shown` 
                : "Options are sorted by efficiency (time per shard)"
              }
            </span>
            <span>
              {searchQuery 
                ? `Showing ${filteredAlternatives.length} filtered results`
                : `Showing all ${alternatives.length} alternatives`
              }
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
