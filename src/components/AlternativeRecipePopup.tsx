import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Clock, Star, Search, ChevronDown, Plus, Equal } from "lucide-react";
import { getRarityColor, formatTime } from "../utils";
import type { AlternativeRecipePopupProps, Recipe, AlternativeRecipeOption } from "../types";

export const AlternativeRecipePopup: React.FC<AlternativeRecipePopupProps> = ({ isOpen, onClose, alternatives, onSelect, shardName, data, loading }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<{ [firstInput: string]: string }>({});
  const [dropdownOpen, setDropdownOpen] = useState<{ [firstInput: string]: boolean }>({});
  const dropdownRefs = useRef<{ [firstInput: string]: HTMLDivElement | null }>({});

  // Reset search query when popup closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedPartner({});
      setDropdownOpen({});
    }
  }, [isOpen]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      let shouldCloseAll = false;

      Object.entries(dropdownOpen).forEach(([firstInput, isOpen]) => {
        if (isOpen && dropdownRefs.current[firstInput] && !dropdownRefs.current[firstInput]?.contains(target)) {
          shouldCloseAll = true;
        }
      });

      if (shouldCloseAll) {
        setDropdownOpen({});
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const toggleDropdown = (firstInput: string) => {
    setDropdownOpen((prev) => ({ ...prev, [firstInput]: !prev[firstInput] }));
  };

  const setRef = (firstInput: string, ref: HTMLDivElement | null) => {
    dropdownRefs.current[firstInput] = ref;
  };

  // Find the output shard from the data
  const outputShard = useMemo(() => {
    if (!data?.shards) return null;
    return Object.values(data.shards).find((shard) => shard.name === shardName);
  }, [data?.shards, shardName]);

  // Group alternatives by first input shard and filter based on search query
  const groupedAlternatives = useMemo(() => {
    if (!alternatives || !data?.shards) return { direct: null, groups: [] };

    let directOption: AlternativeRecipeOption | null = null;
    const groups: { [firstInput: string]: AlternativeRecipeOption[] } = {};

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

    // Group by first input shard
    filtered.forEach((option) => {
      if (option.recipe === null) {
        directOption = option;
      } else {
        const firstInputId = option.recipe.inputs[0];
        if (!groups[firstInputId]) {
          groups[firstInputId] = [];
        }
        groups[firstInputId].push(option);
      }
    });

    // Sort groups by efficiency of best option in each group
    const sortedGroups = Object.entries(groups)
      .map(([firstInput, options]) => {
        // Sort options within group by efficiency
        const sortedOptions = options.sort((a, b) => a.timePerShard - b.timePerShard);
        return { firstInput, options: sortedOptions };
      })
      .sort((a, b) => a.options[0].timePerShard - b.options[0].timePerShard);

    return { direct: directOption, groups: sortedGroups };
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
        className={`w-full p-4 rounded-lg border text-left transition-all duration-200 ${
          isCurrent ? "bg-blue-500/20 border-blue-500/50 ring-2 ring-blue-500/30" : "bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50 hover:border-slate-500"
        }`}
        disabled={isCurrent}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            <span className="text-green-400 font-medium">Direct Collection</span>
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

  const renderGroupedOption = (group: { firstInput: string; options: AlternativeRecipeOption[] }) => {
    const firstInputShard = data?.shards?.[group.firstInput];
    if (!firstInputShard) return null;

    const hasMultipleOptions = group.options.length > 1;
    const selectedPartnerId = selectedPartner[group.firstInput] || group.options[0].recipe?.inputs[1];
    const selectedOption = group.options.find((opt) => opt.recipe?.inputs[1] === selectedPartnerId) || group.options[0];
    const isOpen = dropdownOpen[group.firstInput] || false;

    return (
      <button
        key={group.firstInput}
        onClick={() => (hasMultipleOptions || selectedOption.isCurrent ? undefined : handleSelect(selectedOption.recipe))}
        className={`w-full p-4 rounded-lg border text-left transition-all duration-200 ${
          selectedOption.isCurrent ? "bg-blue-500/20 border-blue-500/50 ring-2 ring-blue-500/30" : "bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50 hover:border-slate-500"
        } ${hasMultipleOptions || selectedOption.isCurrent ? "cursor-default" : "cursor-pointer"}`}
        disabled={false}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-2 h-2 bg-purple-400 rounded-full" />
            <span className="text-purple-400 font-medium text-sm">Fusion Recipe</span>
            {selectedOption.isCurrent && <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Current</span>}
          </div>
          <div className="flex items-center gap-1 text-slate-400 text-sm">
            <Clock className="w-4 h-4" />
            <span>{formatTime(selectedOption.timePerShard)}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm">
          {/* First input shard */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400">{firstInputShard.fuse_amount}x</span>
            <img src={`${import.meta.env.BASE_URL}shardIcons/${group.firstInput}.png`} alt={firstInputShard.name} className="w-4 h-4 object-contain" loading="lazy" />
            <span className={getRarityColor(firstInputShard.rarity)}>{firstInputShard.name}</span>
          </div>

          <Plus className="w-3 h-3 text-purple-400" />

          {/* Second input shard with dropdown */}
          {hasMultipleOptions && selectedPartnerId ? (
            <div className="relative" ref={(el) => setRef(group.firstInput, el)}>
              <button
                type="button"
                className="flex items-center gap-1 px-2 py-1 text-slate-200 rounded shadow-sm border cursor-pointer bg-slate-800 border-slate-700 hover:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDropdown(group.firstInput);
                }}
              >
                <span className="text-slate-400 text-xs">{data?.shards?.[selectedPartnerId]?.fuse_amount}x</span>
                <img src={`${import.meta.env.BASE_URL}shardIcons/${selectedPartnerId}.png`} alt={data?.shards?.[selectedPartnerId]?.name} className="w-4 h-4 object-contain" loading="lazy" />
                <span className={getRarityColor(data?.shards?.[selectedPartnerId]?.rarity || "common")}>{data?.shards?.[selectedPartnerId]?.name}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="absolute z-50 top-full mt-1 left-0 bg-slate-900 border border-slate-600 rounded shadow-xl max-h-40 overflow-auto min-w-max">
                  {group.options.map((option) => {
                    const secondInputId = option.recipe?.inputs[1];
                    const secondInputShard = data?.shards?.[secondInputId || ""];
                    if (!secondInputShard) return null;

                    const isCurrent = option.isCurrent;
                    const isSelected = selectedPartnerId === secondInputId;

                    return (
                      <button
                        key={secondInputId}
                        type="button"
                        className={`w-full cursor-pointer flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-700 focus:bg-slate-700 transition-colors duration-150 ${
                          isSelected ? "bg-slate-700 border-l-2 border-blue-400" : "text-slate-200"
                        }`}
                        onClick={() => {
                          setSelectedPartner((prev) => ({ ...prev, [group.firstInput]: secondInputId || "" }));
                          setDropdownOpen((prev) => ({ ...prev, [group.firstInput]: false }));
                          handleSelect(option.recipe);
                        }}
                      >
                        <span className="text-sm text-slate-400 font-medium flex-shrink-0">×{secondInputShard.fuse_amount}</span>
                        <img src={`${import.meta.env.BASE_URL}shardIcons/${secondInputId}.png`} alt={secondInputShard.name} className="w-4 h-4 object-contain flex-shrink-0" loading="lazy" />
                        <span className={`text-sm flex-1 ${isSelected ? "text-blue-300" : getRarityColor(secondInputShard.rarity)}`} title={secondInputShard.name}>
                          {secondInputShard.name}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(option.timePerShard)}</span>
                        </div>
                        {isCurrent && <span className="text-xs bg-blue-500/20 text-blue-300 px-1 py-0.5 rounded">Current</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : selectedPartnerId ? (
            <div className="flex items-center gap-1">
              <span className="text-slate-400">{data?.shards?.[selectedPartnerId]?.fuse_amount}x</span>
              <img src={`${import.meta.env.BASE_URL}shardIcons/${selectedPartnerId}.png`} alt={data?.shards?.[selectedPartnerId]?.name} className="w-4 h-4 object-contain" loading="lazy" />
              <span className={getRarityColor(data?.shards?.[selectedPartnerId]?.rarity || "common")}>{data?.shards?.[selectedPartnerId]?.name}</span>
            </div>
          ) : null}

          <Equal className="w-3 h-3 text-slate-400" />

          {/* Output shard */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400">{selectedOption.recipe?.outputQuantity}x</span>
            {outputShard && <img src={`${import.meta.env.BASE_URL}shardIcons/${outputShard.id}.png`} alt={outputShard.name} className="w-4 h-4 object-contain" loading="lazy" />}
            <span className={outputShard ? getRarityColor(outputShard.rarity) : "text-slate-300"}>{shardName}</span>
          </div>
        </div>
      </button>
    );
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">Alternative Recipes</h2>
              <span className="text-slate-400">for {shardName}</span>
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : groupedAlternatives.direct === null && groupedAlternatives.groups.length === 0 ? (
            <div className="text-center py-12 text-slate-400">{searchQuery ? `No alternatives found matching "${searchQuery}"` : "No alternatives found"}</div>
          ) : (
            <div className="space-y-3">
              {/* Direct collection option */}
              {groupedAlternatives.direct && renderDirectOption(groupedAlternatives.direct)}

              {/* Grouped fusion recipes */}
              {groupedAlternatives.groups.map((group) => renderGroupedOption(group))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>Grouped by first input shard with dropdowns for second input options</span>
            <span>
              {groupedAlternatives.direct ? "1 direct + " : ""}
              {groupedAlternatives.groups.length} fusion group{groupedAlternatives.groups.length !== 1 ? "s" : ""}({alternatives.length} total alternatives)
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
