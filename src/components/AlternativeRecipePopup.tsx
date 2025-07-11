import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Clock, Star, ChevronDown, Plus, Equal } from "lucide-react";
import { getRarityColor, formatTime } from "../utils";
import { SHARD_DESCRIPTIONS } from "../constants";
import type { AlternativeRecipePopupProps, Recipe, AlternativeRecipeOption } from "../types";

export const AlternativeRecipePopup: React.FC<AlternativeRecipePopupProps> = ({ isOpen, onClose, alternatives, onSelect, shardName, data, loading }) => {
  const [dropdownOpen, setDropdownOpen] = useState<{ [family: string]: boolean }>({});
  const dropdownRefs = useRef<{ [family: string]: HTMLDivElement | null }>({});

  // Find the output shard from the data
  const outputShard = useMemo(() => {
    if (!data?.shards) return null;
    return Object.values(data.shards).find((shard) => shard.name === shardName);
  }, [data?.shards, shardName]);

  // Group alternatives by family and sort by efficiency (time per shard)
  const groupedAlternatives = useMemo(() => {
    if (!alternatives || !data?.shards) return {};

    const groups: { [family: string]: AlternativeRecipeOption[] } = {};

    alternatives.forEach((option) => {
      let family = "Other";

      if (option.recipe === null) {
        // Direct collection - use the output shard's family
        if (outputShard?.id) {
          const shardDesc = SHARD_DESCRIPTIONS[outputShard.id as keyof typeof SHARD_DESCRIPTIONS];
          family = shardDesc?.family || "Other";
        }
      } else {
        // Fusion recipe - use the first input shard's family
        const firstInputId = option.recipe.inputs[0];
        const shardDesc = SHARD_DESCRIPTIONS[firstInputId as keyof typeof SHARD_DESCRIPTIONS];
        family = shardDesc?.family || "Other";
      }

      if (!groups[family]) {
        groups[family] = [];
      }
      groups[family].push(option);
    });

    // Sort options within each family by efficiency (time per shard)
    Object.keys(groups).forEach((family) => {
      groups[family].sort((a, b) => {
        // Direct collection always goes first
        if (a.recipe === null && b.recipe !== null) return -1;
        if (a.recipe !== null && b.recipe === null) return 1;

        // Then sort by time per shard (ascending - best first)
        return a.timePerShard - b.timePerShard;
      });
    });

    return groups;
  }, [alternatives, data?.shards, outputShard]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      let shouldCloseAll = false;

      Object.entries(dropdownOpen).forEach(([family, isOpen]) => {
        if (isOpen && dropdownRefs.current[family] && !dropdownRefs.current[family]?.contains(target)) {
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

  const toggleDropdown = (family: string) => {
    setDropdownOpen((prev) => ({ ...prev, [family]: !prev[family] }));
  };

  const setRef = (family: string, ref: HTMLDivElement | null) => {
    dropdownRefs.current[family] = ref;
  };

  if (!isOpen) return null;

  const handleSelect = (recipe: Recipe | null) => {
    onSelect(recipe);
    onClose();
  };

  const renderRecipeOption = (option: AlternativeRecipeOption, index: number) => {
    const isDirect = option.recipe === null;
    const isCurrent = option.isCurrent;

    return (
      <button
        key={index}
        onClick={() => handleSelect(option.recipe)}
        className={`w-full px-3 py-2 text-sm hover:bg-slate-700 focus:bg-slate-700 transition-colors duration-150 flex items-center justify-between ${
          isCurrent ? "bg-slate-700 border-l-2 border-blue-400" : "text-slate-200"
        }`}
        disabled={isCurrent}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isDirect ? (
            <>
              <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />
              <span className="text-green-400 font-medium">Direct</span>
              {isCurrent && <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Current</span>}
            </>
          ) : (
            <>
              <div className="flex items-center gap-1">
                {option.recipe!.inputs.map((inputId: string, inputIndex: number) => {
                  const inputShard = data?.shards?.[inputId];
                  if (!inputShard) return null;

                  return (
                    <React.Fragment key={`${inputId}-${inputIndex}`}>
                      {inputIndex > 0 && <Plus className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-xs">{inputShard.fuse_amount}x</span>
                        <img src={`${import.meta.env.BASE_URL}shardIcons/${inputId}.png`} alt={inputShard.name} className="w-4 h-4 object-contain flex-shrink-0" loading="lazy" />
                        <span className={`${getRarityColor(inputShard.rarity)} text-xs truncate`} title={inputShard.name}>
                          {inputShard.name}
                        </span>
                      </div>
                    </React.Fragment>
                  );
                })}
                <Equal className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-xs">{option.recipe!.outputQuantity}x</span>
                  {outputShard && <img src={`${import.meta.env.BASE_URL}shardIcons/${outputShard.id}.png`} alt={outputShard.name} className="w-4 h-4 object-contain flex-shrink-0" loading="lazy" />}
                </div>
              </div>
              {isCurrent && <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded flex-shrink-0">Current</span>}
            </>
          )}
        </div>
        <div className="flex items-center gap-1 text-slate-400 text-xs flex-shrink-0">
          <Clock className="w-3 h-3" />
          <span>{formatTime(option.timePerShard)}</span>
        </div>
      </button>
    );
  };

  const familyEntries = Object.entries(groupedAlternatives);
  const hasFamilies = familyEntries.length > 0;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Alternative Recipes</h2>
            <span className="text-slate-400 text-sm">for {shardName}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-8rem)]">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading alternatives...</p>
            </div>
          ) : !hasFamilies ? (
            <div className="p-8 text-center text-slate-400">
              <Star className="w-8 h-8 mx-auto mb-4 text-slate-500" />
              <p>No alternative recipes found for {shardName}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {familyEntries.map(([family, options]) => {
                const isOpen = dropdownOpen[family] || false;
                const currentOption = options.find((option) => option.isCurrent);
                const bestOption = options[0]; // First option is the best (sorted by time)
                const displayOption = currentOption || bestOption;

                return (
                  <div key={family} className="border-b border-slate-700/50 last:border-b-0">
                    <div className="relative" ref={(el) => setRef(family, el)}>
                      <button
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-slate-800/50 transition-colors duration-150 flex items-center justify-between"
                        onClick={() => toggleDropdown(family)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0" />
                            <span className="text-purple-400 font-medium text-sm">{family}</span>
                            <span className="text-slate-500 text-xs">({options.length})</span>
                          </div>
                          {displayOption && (
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <span>Best:</span>
                              <Clock className="w-3 h-3" />
                              <span>{formatTime(displayOption.timePerShard)}</span>
                              {displayOption.isCurrent && <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Current</span>}
                            </div>
                          )}
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && <div className="bg-slate-800/30 border-t border-slate-700/50">{options.map((option, index) => renderRecipeOption(option, index))}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>Families are sorted by best efficiency (time per shard)</span>
            <span>{hasFamilies ? `${familyEntries.length} families, ${alternatives.length} total options` : "No alternatives available"}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
