import { useState, useEffect } from "react";
import { ShardAutocomplete, RecipeCountBadge, SearchFilterInput, ShardDisplay, DropdownButton } from "../components";
import { getRarityColor } from "../utilities";
import { useRecipeState } from "../context";
import { useFusionData, useDropdownManager } from "../hooks";
import {
  processInputRecipes,
  processOutputRecipes,
  filterGroups,
  categorizeAndGroupRecipes,
  filterCategorizedRecipes,
  type OutputGroup,
  type Recipe,
  type CategorizedRecipes,
  type GroupedRecipe,
} from "../utilities";
import type { ShardWithKey } from "../types/types";

export const RecipePage = () => {
  const { selectedShard, setSelectedShard, selectedOutputShard, setSelectedOutputShard } = useRecipeState();
  const { fusionData, loading } = useFusionData();

  // Input side state
  const [searchValue, setSearchValue] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [outputGroups, setOutputGroups] = useState<OutputGroup[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<{ [output: string]: string }>({});

  // Output side state
  const [outputSearchValue, setOutputSearchValue] = useState("");
  const [outputFilterValue, setOutputFilterValue] = useState("");
  const [outputRecipes, setOutputRecipes] = useState<Recipe[]>([]);
  const [categorizedRecipes, setCategorizedRecipes] = useState<CategorizedRecipes>({ special: [], id: [], chameleon: [] });
  const [groupSelectionIndex, setGroupSelectionIndex] = useState<{ [groupKey: string]: number }>({});

  const inputDropdowns = useDropdownManager();
  const outputGroupDropdowns = useDropdownManager();

  // Load input (what can I make with X?) data
  useEffect(() => {
    if (!selectedShard || !fusionData) {
      setOutputGroups([]);
      return;
    }
    setOutputGroups(processInputRecipes(selectedShard, fusionData));
  }, [selectedShard, fusionData]);

  // Load output (how to make X?) data and categorize
  useEffect(() => {
    if (!selectedOutputShard || !fusionData) {
      setOutputRecipes([]);
      setCategorizedRecipes({ special: [], id: [], chameleon: [] });
      return;
    }
    const recipes = processOutputRecipes(selectedOutputShard, fusionData);
    setOutputRecipes(recipes);
    setCategorizedRecipes(categorizeAndGroupRecipes(recipes, fusionData));
  }, [selectedOutputShard, fusionData]);

  // Handlers
  const handleShardSelect = (shard: ShardWithKey) => {
    setSelectedShard(shard);
    setSelectedOutputShard(null);
    setOutputSearchValue("");
    setOutputFilterValue("");
  };
  const handleSearchInputFocus = () => searchValue && setSearchValue("");
  const handleOutputShardSelect = (shard: ShardWithKey) => {
    setSelectedOutputShard(shard);
    setSelectedShard(null);
    setSearchValue("");
    setFilterValue("");
  };
  const handleOutputSearchInputFocus = () => outputSearchValue && setOutputSearchValue("");

  if (loading && !fusionData) {
    return (
      <div className="min-h-screen">
        <div className="w-full border-b border-slate-700/30">
          <div className="px-4 py-4 flex justify-center">
            <div className="w-full max-w-lg">
              <ShardAutocomplete
                value={searchValue}
                onChange={setSearchValue}
                onSelect={handleShardSelect}
                onFocus={handleSearchInputFocus}
                placeholder="Search for a shard..."
                className="w-full text-sm py-2 px-3"
                searchMode="name-only"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }
  if (!fusionData) return null;

  // Filter input-side groups
  const filteredInputGroups = filterGroups(outputGroups, filterValue, fusionData);

  // Filter output categories (respect search filter)
  const filteredCategories = filterCategorizedRecipes(categorizedRecipes, outputFilterValue, fusionData);
  const totalCategoryGroupBlocks = filteredCategories.special.length + filteredCategories.id.length + filteredCategories.chameleon.length;

  // Render helpers for grouped categories
  const renderCategory = (
    groups: GroupedRecipe[],
    fusionType: "special" | "id" | "chameleon",
    heading: string,
    sub: string,
    colorClass: string
  ) => {
    if (!groups.length) return null;
    return (
      <div className="space-y-3">
        <div className="text-center">
          <h3 className={`text-lg font-semibold ${colorClass} mb-1`}>{heading}</h3>
          <p className="text-sm text-slate-400">{sub}</p>
        </div>
        <div className="inline-grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-x-6 bg-slate-700/50 border border-slate-600/50 rounded-md p-2 lg:p-3 w-full max-w-fit mx-auto">
          {groups.map((group, idx) => {
            const gKey = `${fusionType}-${idx}`;
            if (group.isGroup) {
              const selectedIdx = groupSelectionIndex[gKey] || 0;
              const active = group.recipes[selectedIdx];
              const leftCommon = group.commonPosition === "input1";
              const rightCommon = group.commonPosition === "input2";

              const renderVariantDropdown = (side: "left" | "right") => {
                const list = [...new Set(group.recipes.map(r => side === "left" ? r.input1 : r.input2))];
                const dropdownId = `${gKey}-${side}`;
                const currentShard = side === "left" ? active.input1 : active.input2;
                return (
                  <div className="relative" ref={el => outputGroupDropdowns.setRef(dropdownId, el)}>
                    <DropdownButton
                      isOpen={outputGroupDropdowns.dropdownOpen[dropdownId]}
                      onClick={() => outputGroupDropdowns.toggleDropdown(dropdownId)}
                      className="min-w-[120px] bg-slate-600 border-slate-500 text-white"
                    >
                      <ShardDisplay shardId={currentShard} fusionData={fusionData} />
                    </DropdownButton>
                    {outputGroupDropdowns.dropdownOpen[dropdownId] && (
                      <div className="absolute z-50 top-full mt-1 left-0 bg-slate-900 border border-slate-600 rounded shadow-xl max-h-48 overflow-auto min-w-max">
                        {list.map(shardId => {
                          const recipeIdx = group.recipes.findIndex(r => (side === "left" ? r.input1 : r.input2) === shardId);
                          return (
                            <button
                              key={shardId}
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-600 text-sm"
                              onClick={() => {
                                setGroupSelectionIndex(p => ({ ...p, [gKey]: recipeIdx }));
                                outputGroupDropdowns.closeDropdown(dropdownId);
                              }}
                            >
                              <ShardDisplay shardId={shardId} fusionData={fusionData} />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <div key={gKey} className="px-2">
                  <div className="flex flex-wrap items-center gap-2 lg:gap-3 min-w-0 min-h-[40px]">
                    {leftCommon ? <ShardDisplay shardId={group.commonShard} fusionData={fusionData} /> : renderVariantDropdown("left")}
                    <span className="text-purple-400">+</span>
                    {rightCommon ? <ShardDisplay shardId={group.commonShard} fusionData={fusionData} /> : renderVariantDropdown("right")}
                    <span className="text-purple-400">=</span>
                    <ShardDisplay shardId={selectedOutputShard!.key} quantity={active.quantity} fusionData={fusionData} />
                  </div>
                </div>
              );
            }
            // Single recipe (not a group)
            const r = group.recipes[0];
            return (
              <div key={gKey} className="px-2">
                <div className="flex items-center gap-2 lg:gap-3 min-w-0 min-h-[40px]">
                  <ShardDisplay shardId={r.input1} fusionData={fusionData} />
                  <span className="text-purple-400">+</span>
                  <ShardDisplay shardId={r.input2} fusionData={fusionData} />
                  <span className="text-purple-400">=</span>
                  <ShardDisplay shardId={selectedOutputShard!.key} quantity={r.quantity} fusionData={fusionData} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <div className="px-2 sm:px-4 py-4">
        <div className="flex flex-col lg:flex-row justify-center gap-3 lg:gap-6 mb-4 lg:mb-6">
          {/* Input panel */}
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-md p-3 lg:p-4 flex flex-col gap-2 w-full lg:max-w-lg">
            <div className="w-full">
              <label className="flex items-center gap-2 text-sm font-medium text-green-300 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Input Shard
              </label>
              <ShardAutocomplete
                value={searchValue}
                onChange={setSearchValue}
                onSelect={handleShardSelect}
                onFocus={handleSearchInputFocus}
                placeholder="Search for a shard..."
                className="w-full"
                searchMode="name-only"
              />
            </div>
            {selectedShard && (
              <div className="flex items-center justify-center gap-2 lg:gap-3">
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-slate-300">What can you make with</span>
                  <img src={`${import.meta.env.BASE_URL}shardIcons/${selectedShard.key}.png`} alt={selectedShard.name} className="w-5 h-5 object-contain" loading="lazy" />
                  <span className={`font-semibold ${getRarityColor(selectedShard.rarity)}`}>{selectedShard.name}</span>
                  <span className="text-slate-400">?</span>
                </div>
              </div>
            )}
            {!loading && outputGroups.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 lg:gap-4">
                <RecipeCountBadge count={filteredInputGroups.length} label="Available Recipes" variant="green" />
                <SearchFilterInput value={filterValue} onChange={setFilterValue} placeholder="Filter fusions..." variant="green" />
              </div>
            )}
          </div>

            {/* Output panel */}
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-md p-3 lg:p-4 flex flex-col gap-2 w-full lg:max-w-lg">
            <div className="w-full">
              <label className="flex items-center gap-2 text-sm font-medium text-fuchsia-300 mb-2">
                <div className="w-2 h-2 bg-fuchsia-500 rounded-full"></div>
                Output Shard
              </label>
              <ShardAutocomplete
                value={outputSearchValue}
                onChange={setOutputSearchValue}
                onSelect={handleOutputShardSelect}
                onFocus={handleOutputSearchInputFocus}
                placeholder="Search for a shard..."
                className="w-full"
                searchMode="name-only"
              />
            </div>
            {selectedOutputShard && (
              <div className="flex items-center justify-center gap-2 lg:gap-3">
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-slate-300">How to make</span>
                  <img src={`${import.meta.env.BASE_URL}shardIcons/${selectedOutputShard.key}.png`} alt={selectedOutputShard.name} className="w-5 h-5 object-contain" loading="lazy" />
                  <span className={`font-semibold ${getRarityColor(selectedOutputShard.rarity)}`}>{selectedOutputShard.name}</span>
                  <span className="text-slate-400">?</span>
                </div>
              </div>
            )}
            {!loading && outputRecipes.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 lg:gap-4">
                <RecipeCountBadge count={totalCategoryGroupBlocks} label="Groups" variant="fuchsia" />
                <SearchFilterInput value={outputFilterValue} onChange={setOutputFilterValue} placeholder="Filter recipes..." variant="fuchsia" />
              </div>
            )}
          </div>
        </div>

        {(selectedShard || selectedOutputShard) ? (
          <div className="flex justify-center">
            {/* Input side result list */}
            {selectedShard && !selectedOutputShard && !loading && outputGroups.length > 0 && (
              <div className="w-full max-w-fit mx-auto">
                <div className="inline-grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-x-6 bg-slate-700/50 border border-slate-600/50 rounded-md p-2 lg:p-3">
                  {filteredInputGroups
                    .sort((a, b) => {
                      const rarityOrder = ["common", "uncommon", "rare", "epic", "legendary"];
                      const ra = rarityOrder.indexOf((fusionData.shards[a.output]?.rarity || "common").toLowerCase());
                      const rb = rarityOrder.indexOf((fusionData.shards[b.output]?.rarity || "common").toLowerCase());
                      if (ra !== rb) return ra - rb;
                      const na = fusionData.shards[a.output]?.name || "";
                      const nb = fusionData.shards[b.output]?.name || "";
                      return na.localeCompare(nb);
                    })
                    .map((og) => {
                      const partnerId = selectedPartner[og.output] || og.partners[0];
                      const isOpen = inputDropdowns.dropdownOpen[og.output] || false;
                      const pos = og.selectedPosition;
                      return (
                        <div key={og.output} className="px-2">
                          <div className="flex items-center gap-2 lg:gap-3 min-w-0 min-h-[40px]">
                            {/* First position */}
                            <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
                              {pos === "first" ? (
                                <ShardDisplay shardId={selectedShard.key} fusionData={fusionData} />
                              ) : og.partners.length > 1 ? (
                                <div className="relative flex-shrink-0" ref={el => inputDropdowns.setRef(og.output, el)}>
                                  <DropdownButton isOpen={isOpen} onClick={() => inputDropdowns.toggleDropdown(og.output)}>
                                    <ShardDisplay shardId={partnerId} fusionData={fusionData} size="sm" />
                                  </DropdownButton>
                                  {isOpen && (
                                    <div className="absolute z-50 top-full mt-1 left-0 bg-slate-900 border border-slate-600 rounded shadow-xl max-h-40 overflow-auto min-w-max">
                                      {og.partners.map(pid => (
                                        <button
                                          key={pid}
                                          type="button"
                                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${(pid === partnerId) ? "bg-slate-700 border-l-2 border-blue-400" : "text-slate-200"}`}
                                          onClick={() => { setSelectedPartner(p => ({ ...p, [og.output]: pid })); inputDropdowns.closeDropdown(og.output); }}
                                        >
                                          <span className="text-sm text-slate-400 font-medium flex-shrink-0">{fusionData.shards[pid]?.fuse_amount || 2}x</span>
                                          <img src={`${import.meta.env.BASE_URL}shardIcons/${pid}.png`} alt={fusionData.shards[pid]?.name} className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
                                          <span className={`text-sm flex-1 ${(pid === partnerId) ? "text-blue-300" : getRarityColor(fusionData.shards[pid]?.rarity || "common")}`}>{fusionData.shards[pid]?.name}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <ShardDisplay shardId={partnerId} fusionData={fusionData} />
                              )}
                            </div>
                            <span className="text-purple-400">+</span>
                            {/* Second position */}
                            <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
                              {pos === "second" ? (
                                <ShardDisplay shardId={selectedShard.key} fusionData={fusionData} />
                              ) : og.partners.length > 1 ? (
                                <div className="relative flex-shrink-0" ref={el => inputDropdowns.setRef(og.output + "-second", el)}>
                                  <DropdownButton isOpen={inputDropdowns.dropdownOpen[og.output + "-second"]} onClick={() => inputDropdowns.toggleDropdown(og.output + "-second")}>
                                    <ShardDisplay shardId={partnerId} fusionData={fusionData} size="sm" />
                                  </DropdownButton>
                                  {inputDropdowns.dropdownOpen[og.output + "-second"] && (
                                    <div className="absolute z-50 top-full mt-1 left-0 bg-slate-900 border border-slate-600 rounded shadow-xl max-h-40 overflow-auto min-w-max">
                                      {og.partners.map(pid => (
                                        <button
                                          key={pid}
                                          type="button"
                                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${(pid === partnerId) ? "bg-slate-700 border-l-2 border-blue-400" : "text-slate-200"}`}
                                          onClick={() => { setSelectedPartner(p => ({ ...p, [og.output]: pid })); inputDropdowns.closeDropdown(og.output + "-second"); }}
                                        >
                                          <span className="text-sm text-slate-400 font-medium flex-shrink-0">{fusionData.shards[pid]?.fuse_amount || 2}x</span>
                                          <img src={`${import.meta.env.BASE_URL}shardIcons/${pid}.png`} alt={fusionData.shards[pid]?.name} className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
                                          <span className={`text-sm flex-1 ${(pid === partnerId) ? "text-blue-300" : getRarityColor(fusionData.shards[pid]?.rarity || "common")}`}>{fusionData.shards[pid]?.name}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <ShardDisplay shardId={partnerId} fusionData={fusionData} />
                              )}
                            </div>
                            <span className="text-purple-400">=</span>
                            <ShardDisplay shardId={og.output} quantity={og.quantities.get(partnerId) || 1} fusionData={fusionData} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Output categorized list */}
            {selectedOutputShard && !selectedShard && !loading && outputRecipes.length > 0 && (
              <div className="w-full max-w-fit mx-auto space-y-8">
                {renderCategory(filteredCategories.special, "special", "Special Fusions (2x Output)", "Produce 2 of the output shard", "text-yellow-400")}
                {renderCategory(filteredCategories.id, "id", "ID Fusions (1x Output)", "Produce 1 of the output shard", "text-blue-400")}
                {renderCategory(filteredCategories.chameleon, "chameleon", "Chameleon Fusions", "Recipes involving L4 (Chameleon)", "text-purple-400")}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 lg:py-20">
            <div className="text-slate-400 text-lg lg:text-xl">Select an input shard or output shard to see recipes</div>
            <div className="text-slate-500 text-xs lg:text-sm mt-2 lg:mt-3 px-4">Choose a shard on the left to see outputs, or on the right to see how to make it.</div>
          </div>
        )}

        {!loading && selectedShard && !selectedOutputShard && outputGroups.length === 0 && (
          <div className="text-center py-12 lg:py-16">
            <div className="text-slate-400 text-base lg:text-lg">No fusion recipes found using this shard.</div>
            <div className="text-slate-500 text-xs lg:text-sm mt-2">This shard might not be used in any fusion recipes.</div>
          </div>
        )}

        {!loading && selectedOutputShard && !selectedShard && outputRecipes.length === 0 && (
          <div className="text-center py-12 lg:py-16">
            <div className="text-slate-400 text-base lg:text-lg">No recipes found to create this shard.</div>
            <div className="text-slate-500 text-xs lg:text-sm mt-2">This shard might be obtained directly or not fuseable.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipePage;
