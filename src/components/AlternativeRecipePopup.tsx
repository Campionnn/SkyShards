import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Clock, Star, Search, Plus, Equal } from "lucide-react";
import { getRarityColor, formatTime } from "../utils";
import type { AlternativeRecipePopupProps, Recipe, AlternativeRecipeOption } from "../types";

export const AlternativeRecipePopup: React.FC<AlternativeRecipePopupProps> = ({ isOpen, onClose, alternatives, onSelect, shardName, data, loading }) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Reset state when popup closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Find the output shard from the data
  const outputShard = useMemo(() => {
    if (!data?.shards) return null;
    return Object.values(data.shards).find((shard) => shard.name === shardName);
  }, [data?.shards, shardName]);

  // Process alternatives with filtering and deduplication
  const processedAlternatives = useMemo(() => {
    if (!alternatives || !data?.shards) return { direct: null, fusion: [] };

    let directOption: AlternativeRecipeOption | null = null;
    const allFusionOptions: AlternativeRecipeOption[] = [];

    // Filter alternatives based on search query
    let filtered = alternatives;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = alternatives.filter((option) => {
        if (option.recipe === null) {
          return "direct collection".includes(query);
        } else {
          return option.recipe.inputs.some((inputId) => {
            const inputShard = data?.shards?.[inputId];
            return inputShard?.name.toLowerCase().includes(query);
          });
        }
      });
    }

    // Separate direct and fusion options
    filtered.forEach((option) => {
      if (option.recipe === null) {
        directOption = option;
      } else {
        allFusionOptions.push(option);
      }
    });

    // Remove duplicate recipes with same inputs in different orders
    const uniqueFusionOptions: AlternativeRecipeOption[] = [];
    const seenRecipes = new Set<string>();

    allFusionOptions.forEach((option) => {
      if (option.recipe) {
        // Create a sorted key to identify duplicate recipes regardless of input order
        const sortedInputs = [...option.recipe.inputs].sort();
        const recipeKey = `${sortedInputs.join("-")}-${option.recipe.outputQuantity}`;

        if (!seenRecipes.has(recipeKey)) {
          seenRecipes.add(recipeKey);
          uniqueFusionOptions.push(option);
        }
      }
    });

    // Sort by efficiency (time per shard)
    uniqueFusionOptions.sort((a, b) => a.timePerShard - b.timePerShard);

    return { direct: directOption, fusion: uniqueFusionOptions };
  }, [alternatives, searchQuery, data?.shards]);

  if (!isOpen) return null;

  const handleSelect = (recipe: Recipe | null) => {
    onSelect(recipe);
    onClose();
  };

  const renderDirectOption = (option: AlternativeRecipeOption) => {
    const isCurrent = option.isCurrent;

    return (
      <button
        key="direct"
        onClick={() => handleSelect(option.recipe)}
        className={`w-full p-3 rounded-lg border text-left transition-all duration-200 ${
          isCurrent ? "bg-blue-500/20 border-blue-500/50 ring-2 ring-blue-500/30" : "bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50 hover:border-slate-500"
        }`}
        disabled={isCurrent}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            <span className="text-green-400 font-medium text-sm">Direct Collection</span>
            {isCurrent && <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Current</span>}
          </div>
          <div className="flex items-center gap-1 text-slate-400 text-sm">
            <Clock className="w-4 h-4" />
            <span>{formatTime(option.timePerShard)}</span>
          </div>
        </div>
      </button>
    );
  };

  const renderFusionOption = (option: AlternativeRecipeOption, index: number) => {
    if (!option.recipe) return null;

    const [firstInput, partner] = option.recipe.inputs;
    const firstInputShard = data?.shards?.[firstInput];
    const partnerShard = data?.shards?.[partner];

    if (!firstInputShard || !partnerShard) return null;

    const isCurrent = option.isCurrent;

    return (
      <button
        key={`${firstInput}-${partner}-${index}`}
        onClick={() => handleSelect(option.recipe)}
        className={`w-full p-3 rounded-lg border text-left transition-all duration-200 ${
          isCurrent ? "bg-blue-500/20 border-blue-500/50 ring-2 ring-blue-500/30" : "bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50 hover:border-slate-500"
        }`}
        disabled={isCurrent}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full" />
            <div className="flex items-center gap-1 text-sm">
              <span className="text-slate-400 text-xs">×{firstInputShard.fuse_amount}</span>
              <img src={`${import.meta.env.BASE_URL}shardIcons/${firstInput}.png`} alt={firstInputShard.name} className="w-4 h-4 object-contain" loading="lazy" />
              <span className={getRarityColor(firstInputShard.rarity)}>{firstInputShard.name}</span>
              <Plus className="w-3 h-3 text-slate-400 mx-1" />
              <span className="text-slate-400 text-xs">×{partnerShard.fuse_amount}</span>
              <img src={`${import.meta.env.BASE_URL}shardIcons/${partner}.png`} alt={partnerShard.name} className="w-4 h-4 object-contain" loading="lazy" />
              <span className={getRarityColor(partnerShard.rarity)}>{partnerShard.name}</span>
              <Equal className="w-3 h-3 text-slate-400 mx-1" />
              <span className="text-slate-400 text-xs">×{option.recipe.outputQuantity}</span>
              {outputShard && <img src={`${import.meta.env.BASE_URL}shardIcons/${outputShard.id}.png`} alt={outputShard.name} className="w-4 h-4 object-contain" loading="lazy" />}
              <span className={outputShard ? getRarityColor(outputShard.rarity) : "text-slate-300"}>{shardName}</span>
            </div>
            {isCurrent && <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Current</span>}
          </div>
          <div className="flex items-center gap-1 text-slate-400 text-sm">
            <Clock className="w-4 h-4" />
            <span>{formatTime(option.timePerShard)}</span>
          </div>
        </div>
      </button>
    );
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Alternative Recipes</h2>
              <span className="text-slate-400 text-sm">for {shardName}</span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by input shard name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-10rem)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : processedAlternatives.direct === null && processedAlternatives.fusion.length === 0 ? (
            <div className="text-center py-12 text-slate-400">{searchQuery ? `No alternatives found matching "${searchQuery}"` : "No alternatives found"}</div>
          ) : (
            <div className="space-y-2">
              {/* Direct collection option */}
              {processedAlternatives.direct && renderDirectOption(processedAlternatives.direct)}

              {/* All fusion recipes */}
              {processedAlternatives.fusion.map((option, index) => renderFusionOption(option, index))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>All recipes displayed • Sorted by efficiency</span>
            <span>
              {processedAlternatives.direct ? "1 direct + " : ""}
              {processedAlternatives.fusion.length} fusion recipe{processedAlternatives.fusion.length !== 1 ? "s" : ""}
              {searchQuery && ` (filtered)`}
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
