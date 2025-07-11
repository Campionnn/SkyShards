import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Clock, Star, Search, Plus, Equal, ChevronDown } from "lucide-react";
import { getRarityColor, formatTime } from "../utils";
import type { AlternativeRecipePopupProps, Recipe, AlternativeRecipeOption } from "../types";

export const AlternativeRecipePopup: React.FC<AlternativeRecipePopupProps & {
  alternatives: { direct: AlternativeRecipeOption | null, grouped: Record<string, AlternativeRecipeOption[]> }
}> = ({ isOpen, onClose, alternatives, onSelect, shardName, data, loading }) => {
  const [searchQuery, setSearchQuery] = useState("");
  // Track selected recipe index for each group
  const [selectedIndices, setSelectedIndices] = useState<Record<string, number>>({});

  // Reset state when popup closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedIndices({});
    }
  }, [isOpen]);

  // Find the output shard from the data
  const outputShard = useMemo(() => {
    if (!data?.shards) return null;
    return Object.values(data.shards).find((shard) => shard.name === shardName);
  }, [data?.shards, shardName]);

  // Process alternatives with filtering and grouping
  const processedAlternatives = useMemo(() => {
    if (!alternatives || !data?.shards) return { direct: null, grouped: {} };

    let { direct, grouped } = alternatives;

    // Filter grouped fusion options by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filteredGrouped: typeof grouped = {};
      for (const [firstShard, group] of Object.entries(grouped)) {
        const filteredGroup = group.filter(option => {
          if (!option.recipe) return false;
          return option.recipe.inputs.some(inputId => {
            const inputShard = data.shards[inputId];
            return inputShard?.name.toLowerCase().includes(query);
          });
        });
        if (filteredGroup.length > 0) filteredGrouped[firstShard] = filteredGroup;
      }
      grouped = filteredGrouped;
      // Hide direct if searching and it doesn't match
      if (direct && !"direct collection".includes(query)) {
        direct = null;
      }
    }

    return { direct, grouped };
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

  const renderFusionOption = (option: AlternativeRecipeOption) => {
    if (!option.recipe) return null;

    const [firstInput, partner] = option.recipe.inputs;
    const firstInputShard = data?.shards?.[firstInput];
    const partnerShard = data?.shards?.[partner];

    if (!firstInputShard || !partnerShard) return null;

    const isCurrent = option.isCurrent;

    return (
      <button
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

  // Render grouped fusion options as dropdowns
  const renderGroupedFusionOptions = (grouped: Record<string, AlternativeRecipeOption[]>) => {
    // Sort groups by total count descending (most common first)
    const groupKeys = Object.keys(grouped);
    groupKeys.sort((a, b) => grouped[b].length - grouped[a].length);

    return groupKeys.map((firstShard) => {
      // Get all options for this group and sort by cost (lowest first)
      const group = [...grouped[firstShard]].sort((a, b) => a.timePerShard - b.timePerShard);
      const firstShardObj = data?.shards?.[firstShard];

      // Get selected index or default to 0 (best option)
      const selectedIndex = selectedIndices[firstShard] || 0;
      const selectedOption = group[selectedIndex];

      return (
        <div key={firstShard} className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            {firstShardObj && (
              <>
                <img src={`${import.meta.env.BASE_URL}shardIcons/${firstShard}.png`} alt={firstShardObj.name} className="w-4 h-4 object-contain" loading="lazy" />
                <span className={getRarityColor(firstShardObj.rarity) + " font-semibold"}>{firstShardObj.name}</span>
                <span className="text-xs text-slate-400">({group.length} recipe{group.length !== 1 ? "s" : ""})</span>
              </>
            )}
          </div>

          {/* Dropdown for recipe selection */}
          <div className="relative mb-2">
            <select
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white appearance-none"
              value={selectedIndex}
              onChange={(e) => setSelectedIndices({
                ...selectedIndices,
                [firstShard]: parseInt(e.target.value)
              })}
            >
              {group.map((option, idx) => {
                if (!option.recipe) return null;
                const [, partnerShard] = option.recipe.inputs;
                const partner = data?.shards?.[partnerShard];
                return (
                  <option key={idx} value={idx}>
                    + {partner?.name || partnerShard} • {formatTime(option.timePerShard)}
                    {option.isCurrent ? " (current)" : ""}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Render selected recipe */}
          {selectedOption && renderFusionOption(selectedOption)}
        </div>
      );
    });
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
          ) : processedAlternatives.direct === null && Object.keys(processedAlternatives.grouped).length === 0 ? (
            <div className="text-center py-12 text-slate-400">{searchQuery ? `No alternatives found matching "${searchQuery}"` : "No alternatives found"}</div>
          ) : (
            <div className="space-y-4">
              {/* Direct collection option */}
              {processedAlternatives.direct && renderDirectOption(processedAlternatives.direct)}

              {/* Grouped fusion recipes as dropdowns */}
              {renderGroupedFusionOptions(processedAlternatives.grouped)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>Recipes grouped by most common input • Best options shown first</span>
            <span>
              {processedAlternatives.direct ? "1 direct + " : ""}
              {Object.values(processedAlternatives.grouped).reduce((sum, group) => sum + group.length, 0)} fusion recipe
              {Object.values(processedAlternatives.grouped).reduce((sum, group) => sum + group.length, 0) !== 1 ? "s" : ""}
              {searchQuery && ` (filtered)`}
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
