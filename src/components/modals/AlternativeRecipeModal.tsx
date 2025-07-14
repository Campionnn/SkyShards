import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Star, Search, Plus, Equal, ChevronDown } from "lucide-react";
import { getRarityColor, formatTime } from "../../utilities";
import type { AlternativeRecipeModalProps, Recipe, AlternativeRecipeOption } from "../../types/types";

export const AlternativeRecipeModal: React.FC<
  AlternativeRecipeModalProps & {
    alternatives: { direct: AlternativeRecipeOption | null; grouped: Record<string, AlternativeRecipeOption[]> };
  }
> = ({ isOpen, onClose, alternatives, onSelect, shardName, data, loading, requiredQuantity = 1, crocodileLevel, seaSerpentLevel, tiamatLevel }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndices, setSelectedIndices] = useState<Record<string, number>>({});
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [dropdownSearchQueries, setDropdownSearchQueries] = useState<Record<string, string>>({});

  const calculateTotalTime = (option: AlternativeRecipeOption, requiredQuantity: number) => {
    if (!option.recipe || !option.recipe.isReptile) {
      return option.timePerShard * requiredQuantity;
    }

    const tiamatMultiplier = 1 + (5 * tiamatLevel) / 100;
    const seaSerpentMultiplier = 1 + ((2 * seaSerpentLevel) / 100) * tiamatMultiplier;
    const crocodileMultiplier = 1 + ((2 * crocodileLevel) / 100) * seaSerpentMultiplier;

    const outputPerCraft = option.recipe.outputQuantity * crocodileMultiplier;
    const craftsNeeded = Math.ceil(requiredQuantity / outputPerCraft);
    const totalShardsProduced = craftsNeeded * outputPerCraft;

    return option.timePerShard * totalShardsProduced;
  };

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedIndices({});
      setOpenDropdowns({});
      setDropdownSearchQueries({});
    }
  }, [isOpen]);

  // Reset selectedIndices when alternatives change (new current recipe)
  useEffect(() => {
    setSelectedIndices({});
    setDropdownSearchQueries({});
  }, [alternatives]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      const isClickInsideDropdown = target.closest("[data-dropdown-container]");
      if (!isClickInsideDropdown) {
        setOpenDropdowns({});
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Find the output shard from the data
  const outputShard = useMemo(() => {
    if (!data?.shards) return null;
    return Object.values(data.shards).find((shard) => shard.name === shardName);
  }, [data?.shards, shardName]);

  const processedAlternatives = useMemo(() => {
    if (!alternatives || !data?.shards) return { direct: null, grouped: {} };

    let { direct, grouped } = alternatives;

    // First, flatten all recipes to deduplicate mirrored ones globally
    const allRecipes: AlternativeRecipeOption[] = [];
    for (const group of Object.values(grouped)) {
      allRecipes.push(...group);
    }

    // Remove mirrored recipes globally (same inputs in different order, same output, same time)
    const dedupedRecipes: AlternativeRecipeOption[] = [];
    const seen = new Set<string>();

    for (const option of allRecipes) {
      if (!option.recipe) continue;

      // Create a normalized key for deduplication
      const inputs = [...option.recipe.inputs].sort();
      const key = `${inputs[0]}-${inputs[1]}-${option.recipe.outputQuantity}-${option.timePerShard}`;

      if (!seen.has(key)) {
        seen.add(key);
        dedupedRecipes.push(option);
      }
    }

    // Re-group the deduplicated recipes by the most common shard
    const shardCount: Record<string, number> = {};
    for (const option of dedupedRecipes) {
      if (option.recipe) {
        for (const shard of option.recipe.inputs) {
          shardCount[shard] = (shardCount[shard] || 0) + 1;
        }
      }
    }

    // Normalize recipes to put most common shard first
    const normalizedRecipes = dedupedRecipes.map((option) => {
      if (!option.recipe) return option;
      const [a, b] = option.recipe.inputs;
      if ((shardCount[b] ?? 0) > (shardCount[a] ?? 0)) {
        return {
          ...option,
          recipe: {
            ...option.recipe,
            inputs: [b, a] as [string, string],
          },
        };
      }
      return option;
    });

    // Re-group by first input shard
    const newGrouped: Record<string, AlternativeRecipeOption[]> = {};
    for (const option of normalizedRecipes) {
      if (!option.recipe) continue;
      const first = option.recipe.inputs[0];
      if (!newGrouped[first]) newGrouped[first] = [];
      newGrouped[first].push(option);
    }

    // Filter grouped fusion options by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filteredGrouped: typeof newGrouped = {};
      for (const [firstShard, group] of Object.entries(newGrouped)) {
        const filteredGroup = group.filter((option) => {
          if (!option.recipe) return false;
          return option.recipe.inputs.some((inputId) => {
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
    } else {
      grouped = newGrouped;
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

    // Don't show direct option if it has infinity time
    if (option.timePerShard === Infinity) return null;

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
            {isCurrent && <span className="px-1 py-0.4 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md flex-shrink-0">Current</span>}
          </div>
          <div className="flex items-center gap-1 text-slate-400 text-sm">
            <div className="text-right">
              <div>{formatTime(option.timePerShard)}</div>
              {requiredQuantity && requiredQuantity > 0 && <div className="text-xs text-blue-400">Total: {formatTime(calculateTotalTime(option, requiredQuantity))}</div>}
            </div>
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
        className={`w-full p-3 rounded-lg border text-left transition-all duration-200 cursor-pointer ${
          isCurrent ? "bg-blue-500/20 border-blue-500/50 ring-2 ring-blue-500/30" : "bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50 hover:border-slate-500"
        }`}
        disabled={isCurrent}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full" />
            <div className="flex items-center gap-1 text-sm">
              <span className="text-slate-400 text-xs">{firstInputShard.fuse_amount}x</span>
              <img src={`${import.meta.env.BASE_URL}shardIcons/${firstInput}.png`} alt={firstInputShard.name} className="w-4 h-4 object-contain" loading="lazy" />
              <span className={getRarityColor(firstInputShard.rarity)}>{firstInputShard.name}</span>
              <Plus className="w-3 h-3 text-slate-400 mx-1" />
              <span className="text-slate-400 text-xs">{partnerShard.fuse_amount}x</span>
              <img src={`${import.meta.env.BASE_URL}shardIcons/${partner}.png`} alt={partnerShard.name} className="w-4 h-4 object-contain" loading="lazy" />
              <span className={getRarityColor(partnerShard.rarity)}>{partnerShard.name}</span>
              <Equal className="w-3 h-3 text-slate-400 mx-1" />
              <span className="text-slate-400 text-xs">{option.recipe.outputQuantity}x</span>
              {outputShard && <img src={`${import.meta.env.BASE_URL}shardIcons/${outputShard.id}.png`} alt={outputShard.name} className="w-4 h-4 object-contain" loading="lazy" />}
              <span className={outputShard ? getRarityColor(outputShard.rarity) : "text-slate-300"}>{shardName}</span>
            </div>
            {isCurrent && <span className="px-1 py-0.4 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md flex-shrink-0">Current</span>}
          </div>
          <div className="flex items-center gap-1 text-slate-400 text-sm">
            <div className="text-right">
              <div>{formatTime(option.timePerShard)}</div>
              {requiredQuantity && requiredQuantity > 0 && <div className="text-xs text-blue-400">Total: {formatTime(calculateTotalTime(option, requiredQuantity))}</div>}
            </div>
          </div>
        </div>
      </button>
    );
  };

  // Render grouped fusion options as custom dropdowns
  const renderGroupedFusionOptions = (grouped: Record<string, AlternativeRecipeOption[]>) => {
    // Sort groups by the fastest time in each group (ascending)
    const groupKeys = Object.keys(grouped);
    groupKeys.sort((a, b) => {
      const groupA = grouped[a];
      const groupB = grouped[b];

      // Find the fastest time in each group
      const fastestTimeA = Math.min(...groupA.map((option) => option.timePerShard));
      const fastestTimeB = Math.min(...groupB.map((option) => option.timePerShard));

      return fastestTimeA - fastestTimeB;
    });

    return groupKeys.map((firstShard) => {
      // Get all options for this group and sort by cost (lowest first)
      const group = [...grouped[firstShard]].sort((a, b) => {
        // First sort by time (ascending - fastest first)
        const timeDiff = a.timePerShard - b.timePerShard;
        if (timeDiff !== 0) return timeDiff;

        // If times are equal, put current recipe first
        if (a.isCurrent && !b.isCurrent) return -1;
        if (!a.isCurrent && b.isCurrent) return 1;

        return 0;
      });
      const firstShardObj = data?.shards?.[firstShard];

      // Get selected index - find current recipe or default to 0 (best option)
      let selectedIndex = selectedIndices[firstShard];

      // If no manual selection, try to find the current recipe
      if (selectedIndex === undefined) {
        const currentIndex = group.findIndex((option) => option.isCurrent);
        selectedIndex = currentIndex >= 0 ? currentIndex : 0;
      }

      const selectedOption = group[selectedIndex] || group[0];
      const isOpen = openDropdowns[firstShard] || false;
      const dropdownSearchQuery = dropdownSearchQueries[firstShard] || "";

      // Filter group options based on dropdown search query
      const filteredGroup = dropdownSearchQuery.trim()
        ? group.filter((option) => {
            if (!option.recipe) return false;
            const [, partnerShard] = option.recipe.inputs;
            const partner = data?.shards?.[partnerShard];
            return partner?.name.toLowerCase().includes(dropdownSearchQuery.toLowerCase());
          })
        : group;

      const processedGroup = dropdownSearchQuery.trim()
        ? filteredGroup
        : (() => {
            // Define reptile family groups
            const reptileFamilyGroups = {
              Turtle: ["Shellwise", "Leatherback", "Tortoise", "Megalith"],
              Amphibian: ["Newt", "Salamander", "Lizard king", "Leviathan"],
              Snake: ["Viper", "Python", "King cobra", "Basilisk"],
              Lizard: ["Gecko", "Iguana", "Komodo dragon", "Wyvern"],
              Crocodilian: ["Crocodile", "Alligator", "Caiman", "Tiamat"],
            };

            // Separate reptiles by family and non-reptiles
            const reptileFamilies: Record<string, AlternativeRecipeOption[]> = {};
            const nonReptiles: AlternativeRecipeOption[] = [];

            for (const option of filteredGroup) {
              if (!option.recipe) continue;
              const [, partnerShard] = option.recipe.inputs;
              const partner = data?.shards?.[partnerShard];

              if (partner?.family?.includes("Reptile")) {
                // Find which reptile family this belongs to
                let familyGroup = "Other";
                for (const [groupName, families] of Object.entries(reptileFamilyGroups)) {
                  if (families.some((family) => partner.name.toLowerCase().includes(family.toLowerCase()))) {
                    familyGroup = groupName;
                    break;
                  }
                }

                if (!reptileFamilies[familyGroup]) {
                  reptileFamilies[familyGroup] = [];
                }
                reptileFamilies[familyGroup].push(option);
              } else {
                nonReptiles.push(option);
              }
            }

            // For each reptile family, find the most efficient one (keep) and others (push to bottom)
            const keptReptiles: AlternativeRecipeOption[] = [];
            const bottomReptiles: AlternativeRecipeOption[] = [];

            for (const familyOptions of Object.values(reptileFamilies)) {
              if (familyOptions.length === 0) continue;

              // Sort by efficiency: current first, then by time, then by rarity (lower is better)
              familyOptions.sort((a, b) => {
                if (a.isCurrent && !b.isCurrent) return -1;
                if (!a.isCurrent && b.isCurrent) return 1;

                const timeDiff = a.timePerShard - b.timePerShard;
                if (timeDiff !== 0) return timeDiff;

                // If times are the same, prefer lower rarity
                if (!a.recipe || !b.recipe) return 0;
                const [, partnerA] = a.recipe.inputs;
                const [, partnerB] = b.recipe.inputs;
                const shardA = data?.shards?.[partnerA];
                const shardB = data?.shards?.[partnerB];

                if (shardA?.rarity && shardB?.rarity) {
                  const rarityOrder: Record<string, number> = {
                    Common: 1,
                    Uncommon: 2,
                    Rare: 3,
                    Epic: 4,
                    Legendary: 5,
                  };

                  const rarityA = rarityOrder[shardA.rarity] || 999;
                  const rarityB = rarityOrder[shardB.rarity] || 999;

                  return rarityA - rarityB;
                }

                return 0;
              });

              // Keep the most efficient one, push the rest to bottom
              keptReptiles.push(familyOptions[0]);
              if (familyOptions.length > 1) {
                bottomReptiles.push(...familyOptions.slice(1));
              }
            }

            // Sort all groups
            const allMainOptions = [...nonReptiles, ...keptReptiles];
            allMainOptions.sort((a, b) => {
              if (a.isCurrent && !b.isCurrent) return -1;
              if (!a.isCurrent && b.isCurrent) return 1;
              return a.timePerShard - b.timePerShard;
            });

            bottomReptiles.sort((a, b) => {
              if (a.isCurrent && !b.isCurrent) return -1;
              if (!a.isCurrent && b.isCurrent) return 1;
              return a.timePerShard - b.timePerShard;
            });

            // Combine: main options (sorted by time with kept reptiles in their correct positions), then bottom reptiles
            return [...allMainOptions, ...bottomReptiles];
          })();

      const toggleDropdown = () => {
        setOpenDropdowns((prev) => {
          const newState = {
            ...prev,
            [firstShard]: !prev[firstShard],
          };

          // Auto-scroll to show the full dropdown when opening
          if (!prev[firstShard] && newState[firstShard]) {
            setTimeout(() => {
              const dropdownButton = document.querySelector(`[data-dropdown-button="${firstShard}"]`);
              const popupContent = document.querySelector(".overflow-y-auto.flex-1.min-h-0") as HTMLElement;

              if (dropdownButton && popupContent) {
                const buttonRect = dropdownButton.getBoundingClientRect();
                const popupRect = popupContent.getBoundingClientRect();
                const dropdownHeight = 260; // Max height of dropdown

                // Calculate how much space we need below the button
                const spaceNeeded = buttonRect.bottom - popupRect.top + dropdownHeight;
                const availableSpace = popupRect.height;

                // If we need more space, scroll down to make room
                if (spaceNeeded > availableSpace) {
                  const scrollAmount = spaceNeeded - availableSpace + 20; // 20px padding
                  popupContent.scrollBy({
                    top: scrollAmount,
                  });
                }
              }
            }, 50);
          }

          return newState;
        });
      };

      const selectOption = (index: number) => {
        setSelectedIndices((prev) => ({
          ...prev,
          [firstShard]: index,
        }));
        setOpenDropdowns((prev) => ({
          ...prev,
          [firstShard]: false,
        }));
      };

      return (
        <div key={firstShard} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            {firstShardObj && (
              <>
                <img src={`${import.meta.env.BASE_URL}shardIcons/${firstShard}.png`} alt={firstShardObj.name} className="w-5 h-5 object-contain" loading="lazy" />
                <span className={getRarityColor(firstShardObj.rarity) + " font-semibold text-base"}>{firstShardObj.name}</span>
                <span className="text-xs text-slate-400">
                  ({group.length} recipe{group.length !== 1 ? "s" : ""})
                </span>
              </>
            )}
          </div>

          {/* Render selected recipe first */}
          {selectedOption && renderFusionOption(selectedOption)}

          {/* Custom Dropdown below recipe - only if more than one option */}
          {group.length > 1 && (
            <div className="mt-3" data-dropdown-container>
              <button
                type="button"
                onClick={toggleDropdown}
                data-dropdown-button={firstShard}
                className="w-full px-4 py-3 bg-slate-800/95 border border-slate-600/70 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 hover:border-slate-500/80 hover:bg-slate-700/80 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedOption?.recipe &&
                      (() => {
                        const [, partnerShard] = selectedOption.recipe.inputs;
                        const partner = data?.shards?.[partnerShard];
                        return (
                          <>
                            <Plus className="w-4 h-4 text-fuchsia-400" />
                            <span className="text-slate-400 text-xs">{partner?.fuse_amount || 2}x</span>
                            <img src={`${import.meta.env.BASE_URL}shardIcons/${partnerShard}.png`} alt={partner?.name} className="w-4 h-4 object-contain" loading="lazy" />
                            <span className={`text-xs ${partner ? getRarityColor(partner.rarity) : "text-slate-300"}`}>{partner?.name || partnerShard}</span>
                            {partner?.family?.includes("Reptile") && (
                              <span className="px-1 py-0.4 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md flex-shrink-0">Reptile</span>
                            )}
                            {selectedOption.isCurrent && <span className="px-1 py-0.4 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md flex-shrink-0">Current</span>}
                          </>
                        );
                      })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <div className="text-right">
                        <div>{selectedOption ? formatTime(selectedOption.timePerShard) : ""}</div>
                        {selectedOption && requiredQuantity && requiredQuantity > 0 && (
                          <div className="text-xs text-blue-400">Total: {formatTime(calculateTotalTime(selectedOption, requiredQuantity))}</div>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                </div>
              </button>

              {/* Dropdown Menu */}
              {isOpen && (
                <div className="w-full mt-1 bg-slate-900/98 backdrop-blur-sm border border-slate-700/80 rounded-lg shadow-xl max-h-64 overflow-hidden">
                  {/* Search bar in dropdown */}
                  <div className="p-2 border-b border-slate-700/50">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search shard..."
                        value={dropdownSearchQuery}
                        onChange={(e) =>
                          setDropdownSearchQueries((prev) => ({
                            ...prev,
                            [firstShard]: e.target.value,
                          }))
                        }
                        className="w-full pl-7 pr-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  {/* Options list */}
                  <div className="max-h-52 overflow-y-auto pb-1">
                    {processedGroup.length === 0 ? (
                      <div className="px-4 py-3 text-center text-slate-400 text-xs">No shards found</div>
                    ) : (
                      processedGroup.map((option, idx) => {
                        if (!option.recipe) return null;
                        const [, partnerShard] = option.recipe.inputs;
                        const partner = data?.shards?.[partnerShard];
                        const originalIndex = group.findIndex((groupOption) => groupOption === option);
                        const isSelected = originalIndex === selectedIndex;

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectOption(originalIndex)}
                            className={`w-full px-4 py-3 text-left hover:bg-slate-800/90 transition-colors duration-150 border-b border-slate-700/40 last:border-b-0 cursor-pointer ${
                              isSelected ? "bg-purple-500/20 text-purple-200" : "text-white"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                <Plus className="w-4 h-4 text-fuchsia-400" />
                                <span className="text-slate-400 text-xs">{partner?.fuse_amount || 2}x</span>
                                <img src={`${import.meta.env.BASE_URL}shardIcons/${partnerShard}.png`} alt={partner?.name} className="w-4 h-4 object-contain" loading="lazy" />
                                <span className={`text-xs ${partner ? getRarityColor(partner.rarity) : "text-slate-300"}`}>{partner?.name || partnerShard}</span>
                                {partner?.family?.includes("Reptile") && (
                                  <span className="px-1 py-0.4 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md flex-shrink-0">Reptile</span>
                                )}
                                {option.isCurrent && <span className="px-1 py-0.4 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md flex-shrink-0">Current</span>}
                              </div>
                              <div className="flex items-center gap-1 text-slate-400 text-xs">
                                <div className="text-right">
                                  <div>{formatTime(option.timePerShard)}</div>
                                  {requiredQuantity && requiredQuantity > 0 && <div className="text-xs text-blue-400">Total: {formatTime(calculateTotalTime(option, requiredQuantity))}</div>}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    });
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Alternative Recipe Modal</h2>
              <span className="text-slate-400 text-sm">for {shardName}</span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer">
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
        <div className="p-4 overflow-y-auto flex-1 min-h-0">
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
        <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>Recipes grouped by most common input • Best options shown first</span>
            <span>
              {processedAlternatives.direct && processedAlternatives.direct.timePerShard !== Infinity ? "1 direct + " : ""}
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
