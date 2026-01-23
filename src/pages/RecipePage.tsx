import { useState, useEffect } from "react";
import { ShardAutocomplete, RecipeCountBadge, SearchFilterInput, ShardDisplay, DropdownButton } from "../components";
import { getRarityColor } from "../utilities";
import { useFusionData, useDropdownManager, useRecipeState } from "../hooks";
import { processOutputRecipes, categorizeAndGroupRecipes, filterCategorizedRecipes, type Recipe, type CategorizedRecipes, type GroupedRecipe, type FusionData } from "../utilities";
import type { ShardWithKey } from "../types/types";

type RecipeMode = "input" | "output" | null;

export const RecipePage = () => {
  const { selectedShard, setSelectedShard, selectedOutputShard, setSelectedOutputShard } = useRecipeState();
  const { fusionData, loading } = useFusionData();

  const [searchValue, setSearchValue] = useState("");
  const [outputSearchValue, setOutputSearchValue] = useState("");
  const [filterValue, setFilterValue] = useState("");

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categorizedRecipes, setCategorizedRecipes] = useState<CategorizedRecipes>({
    special: [],
    id: [],
    chameleon: [],
  });
  const [mode, setMode] = useState<RecipeMode>(null);

  const [groupSelectionIndex, setGroupSelectionIndex] = useState<{ [groupKey: string]: number }>({});
  const [dropdownSearch, setDropdownSearch] = useState<{ [dropdownId: string]: string }>({});
  const groupDropdowns = useDropdownManager();

  const getInputRecipes = (shard: ShardWithKey, fusionData: FusionData): Recipe[] => {
    const recipes: Recipe[] = [];
    Object.entries(fusionData.recipes).forEach(([outputShardId, recipeData]) => {
      Object.entries(recipeData).forEach(([quantityStr, recipeList]) => {
        const outputQuantity = parseInt(quantityStr, 10);
        recipeList.forEach((recipe) => {
          if (recipe.length === 2) {
            const [input1, input2] = recipe;
            if (input1 === shard.key || input2 === shard.key) {
              recipes.push({ input1, input2, quantity: outputQuantity, output: outputShardId });
            }
          }
        });
      });
    });
    return recipes;
  };

  useEffect(() => {
    if (!fusionData) {
      setRecipes([]);
      setCategorizedRecipes({ special: [], id: [], chameleon: [] });
      setMode(null);
      return;
    }

    let newRecipes: Recipe[] = [];
    let newMode: RecipeMode = null;

    if (selectedShard && !selectedOutputShard) {
      newRecipes = getInputRecipes(selectedShard, fusionData);
      newMode = "input";
    } else if (selectedOutputShard && !selectedShard) {
      newRecipes = processOutputRecipes(selectedOutputShard, fusionData);
      newMode = "output";
    }

    setRecipes(newRecipes);
    setMode(newMode);

    if (newRecipes.length > 0) {
      setCategorizedRecipes(categorizeAndGroupRecipes(newRecipes, fusionData));
    } else {
      setCategorizedRecipes({ special: [], id: [], chameleon: [] });
    }
  }, [selectedShard, selectedOutputShard, fusionData]);

  const handleShardSelect = (shard: ShardWithKey) => {
    setMode("input");
    setSelectedShard(shard);
    setSelectedOutputShard(null);
    setOutputSearchValue("");
    setFilterValue("");
  };

  const handleOutputShardSelect = (shard: ShardWithKey) => {
    setMode("output");
    setSelectedOutputShard(shard);
    setSelectedShard(null);
    setSearchValue("");
    setFilterValue("");
  };

  const handleSearchInputFocus = () => searchValue && setSearchValue("");
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

  const filteredCategories = filterCategorizedRecipes(categorizedRecipes, filterValue, fusionData);
  const totalGroupBlocks = filteredCategories.special.length + filteredCategories.id.length + filteredCategories.chameleon.length;

  const renderCategory = (groups: GroupedRecipe[], fusionType: "special" | "id" | "chameleon", heading: string, sub: string, colorClass: string) => {
    if (!groups.length) return null;

    return (
      <div className="space-y-3 flex justify-center flex-col">
        <div className="text-center">
          <h3 className={`text-lg font-semibold ${colorClass} mb-1`}>{heading}</h3>
          <p className="text-sm text-slate-400">{sub}</p>
        </div>
        <div
          className={
            `inline-grid gap-5 bg-slate-700/50 border border-slate-600/50 rounded-md p-2 lg:p-3 max-w-fit mx-auto truncate` +
            (groups.length === 1 ? "grid-cols-1 w-fit" : "grid-cols-1 lg:grid-cols-2 lg:gap-x-10 w-full")
          }
        >
          {groups.map((group, idx) => {
            const gKey = `${fusionType}-${idx}`;

            // Matrix group (both sides variable, all combinations present)
            if (group.matrix && group.variantLeft && group.variantRight) {
              const outputId = group.output || group.recipes[0].output;

              // Get unique quantities in this matrix group
              const quantities = [...new Set(group.recipes.map((r) => r.quantity))];
              const hasMultipleQuantities = quantities.length > 1;

              // Matrix group uses dropdowns for both sides
              const leftDropdownId = `${gKey}-left`;
              const rightDropdownId = `${gKey}-right`;
              const selectedLeftIndex = groupSelectionIndex[`${gKey}-left`] || 0;
              const selectedRightIndex = groupSelectionIndex[`${gKey}-right`] || 0;
              const currentLeft = group.variantLeft[selectedLeftIndex];
              const currentRight = group.variantRight[selectedRightIndex];
              // Search state for dropdowns
              const leftSearch = dropdownSearch[leftDropdownId] || "";
              const rightSearch = dropdownSearch[rightDropdownId] || "";
              const filteredLeft = group.variantLeft!.filter((id) => !leftSearch || fusionData.shards[id]?.name.toLowerCase().includes(leftSearch.toLowerCase()));
              const filteredRight = group.variantRight!.filter((id) => !rightSearch || fusionData.shards[id]?.name.toLowerCase().includes(rightSearch.toLowerCase()));

              return (
                <div key={gKey} className="px-2">
                  <div className="flex flex-wrap items-center gap-2 lg:gap-3 min-w-0 min-h-[40px]">
                    {/* Left side dropdown */}
                    <div className="relative" ref={(el) => groupDropdowns.setRef(leftDropdownId, el)}>
                      <DropdownButton
                        isOpen={groupDropdowns.dropdownOpen[leftDropdownId]}
                        onClick={() => groupDropdowns.toggleDropdown(leftDropdownId)}
                        className="min-w-[120px] bg-slate-600 border-slate-500 text-white"
                      >
                        <ShardDisplay shardId={currentLeft} fusionData={fusionData} tooltipVisible={false} />
                      </DropdownButton>
                      {groupDropdowns.dropdownOpen[leftDropdownId] && (
                        <div className="absolute z-50 top-full mt-1 left-0 bg-slate-900 border border-slate-600 rounded shadow-xl max-h-64 min-w-max flex flex-col">
                          <input
                            type="text"
                            className="bg-slate-800 text-white px-3 py-2 text-sm border-b border-slate-700 outline-none"
                            placeholder="Search..."
                            value={leftSearch}
                            onChange={(e) => setDropdownSearch((s) => ({ ...s, [leftDropdownId]: e.target.value }))}
                            autoFocus
                          />
                          <div className="overflow-auto max-h-48">
                            {filteredLeft.map((shardId) => (
                              <button
                                key={shardId}
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-600 text-sm"
                                onClick={() => {
                                  setGroupSelectionIndex((p) => ({
                                    ...p,
                                    [`${gKey}-left`]: group.variantLeft!.indexOf(shardId),
                                  }));
                                  groupDropdowns.closeDropdown(leftDropdownId);
                                  setDropdownSearch((s) => ({ ...s, [leftDropdownId]: "" }));
                                }}
                              >
                                <ShardDisplay shardId={shardId} fusionData={fusionData} tooltipVisible={false} />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <span className="text-purple-400">+</span>

                    {/* Right side dropdown */}
                    <div className="relative" ref={(el) => groupDropdowns.setRef(rightDropdownId, el)}>
                      <DropdownButton
                        isOpen={groupDropdowns.dropdownOpen[rightDropdownId]}
                        onClick={() => groupDropdowns.toggleDropdown(rightDropdownId)}
                        className="min-w-[120px] bg-slate-600 border-slate-500 text-white"
                      >
                        <ShardDisplay shardId={currentRight} fusionData={fusionData} tooltipVisible={false} />
                      </DropdownButton>
                      {groupDropdowns.dropdownOpen[rightDropdownId] && (
                        <div className="absolute z-50 top-full mt-1 left-0 bg-slate-900 border border-slate-600 rounded shadow-xl max-h-64 min-w-max flex flex-col">
                          <input
                            type="text"
                            className="bg-slate-800 text-white px-3 py-2 text-sm border-b border-slate-700 outline-none"
                            placeholder="Search..."
                            value={rightSearch}
                            onChange={(e) => setDropdownSearch((s) => ({ ...s, [rightDropdownId]: e.target.value }))}
                            autoFocus
                          />
                          <div className="overflow-auto max-h-48">
                            {filteredRight.map((shardId) => (
                              <button
                                key={shardId}
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-600 text-sm"
                                onClick={() => {
                                  setGroupSelectionIndex((p) => ({
                                    ...p,
                                    [`${gKey}-right`]: group.variantRight!.indexOf(shardId),
                                  }));
                                  groupDropdowns.closeDropdown(rightDropdownId);
                                  setDropdownSearch((s) => ({ ...s, [rightDropdownId]: "" }));
                                }}
                              >
                                <ShardDisplay shardId={shardId} fusionData={fusionData} tooltipVisible={false} />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <span className="text-purple-400">=</span>

                    {/* Output display */}
                    {hasMultipleQuantities ? (
                      <div className="flex items-center gap-1">
                        <ShardDisplay shardId={outputId} fusionData={fusionData} tooltipVisible={false} />
                        <span className="text-xs text-slate-400">({quantities.sort((a, b) => b - a).join("/")})x</span>
                      </div>
                    ) : (
                      <ShardDisplay shardId={outputId} quantity={quantities[0]} fusionData={fusionData} />
                    )}

                    <span className="text-xs text-slate-400 ml-1">({group.recipes.length} recipes)</span>
                  </div>
                </div>
              );
            }

            if (group.isGroup) {
              const selectedIdx = groupSelectionIndex[gKey] || 0;
              const activeRecipe = group.recipes[selectedIdx];
              const leftCommon = group.commonPosition === "input1";
              const rightCommon = group.commonPosition === "input2";

              const renderVariantDropdown = (side: "left" | "right") => {
                const shardList = [...new Set(group.recipes.map((r) => (side === "left" ? r.input1 : r.input2)))];
                const dropdownId = `${gKey}-${side}`;
                const currentShard = side === "left" ? activeRecipe.input1 : activeRecipe.input2;
                const search = dropdownSearch[dropdownId] || "";
                const filteredList = shardList.filter((id) => !search || fusionData.shards[id]?.name.toLowerCase().includes(search.toLowerCase()));
                return (
                  <div className="relative" ref={(el) => groupDropdowns.setRef(dropdownId, el)}>
                    <DropdownButton
                      isOpen={groupDropdowns.dropdownOpen[dropdownId]}
                      onClick={() => groupDropdowns.toggleDropdown(dropdownId)}
                      className="min-w-[120px] bg-slate-600 border-slate-500 text-white"
                    >
                      <ShardDisplay shardId={currentShard} fusionData={fusionData} tooltipVisible={false} />
                    </DropdownButton>
                    {groupDropdowns.dropdownOpen[dropdownId] && (
                      <div className="absolute z-50 top-full mt-1 left-0 bg-slate-900 border border-slate-600 rounded shadow-xl max-h-64 min-w-max flex flex-col">
                        <input
                          type="text"
                          className="bg-slate-800 text-white px-3 py-2 text-sm border-b border-slate-700 outline-none"
                          placeholder="Search..."
                          value={search}
                          onChange={(e) => setDropdownSearch((s) => ({ ...s, [dropdownId]: e.target.value }))}
                          autoFocus
                        />
                        <div className="overflow-auto max-h-48">
                          {filteredList.map((shardId) => {
                            const recipeIdx = group.recipes.findIndex((r) => (side === "left" ? r.input1 : r.input2) === shardId);
                            return (
                              <button
                                key={shardId}
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-600 text-sm"
                                onClick={() => {
                                  setGroupSelectionIndex((p) => ({ ...p, [gKey]: recipeIdx }));
                                  groupDropdowns.closeDropdown(dropdownId);
                                  setDropdownSearch((s) => ({ ...s, [dropdownId]: "" }));
                                }}
                              >
                                <ShardDisplay shardId={shardId} fusionData={fusionData} tooltipVisible={false} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              };

              let actualOutput = "";
              if (mode === "output" && selectedOutputShard) {
                actualOutput = selectedOutputShard.key;
              } else if (mode === "input") {
                actualOutput = activeRecipe.output;
              } else if (activeRecipe.output) {
                actualOutput = activeRecipe.output;
              }

              return (
                <div key={gKey} className="px-2">
                  <div className="flex flex-wrap items-center gap-2 lg:gap-3 min-w-0 min-h-[40px]">
                    {leftCommon ? <ShardDisplay shardId={group.commonShard} fusionData={fusionData} tooltipVisible={false} /> : renderVariantDropdown("left")}
                    <span className="text-purple-400">+</span>
                    {rightCommon ? <ShardDisplay shardId={group.commonShard} fusionData={fusionData} tooltipVisible={false} /> : renderVariantDropdown("right")}
                    <span className="text-purple-400">=</span>
                    <ShardDisplay shardId={actualOutput} quantity={activeRecipe.quantity} fusionData={fusionData} />
                  </div>
                </div>
              );
            }

            const recipe = group.recipes[0];

            let actualOutput = "";
            if (mode === "output" && selectedOutputShard) {
              actualOutput = selectedOutputShard.key;
            } else if (mode === "input") {
              actualOutput = recipe.output;
            } else if (recipe.output) {
              actualOutput = recipe.output;
            }

            return (
              <div key={gKey} className={groups.length === 1 ? "" : "px-2"}>
                <div className="flex items-center gap-2 lg:gap-3 min-w-0 min-h-[40px]">
                  <ShardDisplay shardId={recipe.input1} fusionData={fusionData} tooltipVisible={false} />
                  <span className="text-purple-400">+</span>
                  <ShardDisplay shardId={recipe.input2} fusionData={fusionData} tooltipVisible={false} />
                  <span className="text-purple-400">=</span>
                  <ShardDisplay shardId={actualOutput} quantity={recipe.quantity} fusionData={fusionData} />
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
            {!loading && mode === "input" && recipes.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 lg:gap-4">
                <RecipeCountBadge count={totalGroupBlocks} label="Recipe Groups" variant="green" />
                <SearchFilterInput value={filterValue} onChange={setFilterValue} placeholder="Filter recipes..." variant="green" />
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
            {!loading && mode === "output" && recipes.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 lg:gap-4">
                <RecipeCountBadge count={totalGroupBlocks} label="Recipe Groups" variant="fuchsia" />
                <SearchFilterInput value={filterValue} onChange={setFilterValue} placeholder="Filter recipes..." variant="fuchsia" />
              </div>
            )}
          </div>
        </div>

        {/* Results section */}
        {mode && recipes.length > 0 ? (
          <div className="flex justify-center">
            <div className="w-full max-w-fit mx-auto space-y-8">
              {renderCategory(filteredCategories.special, "special", "Special Fusions", "Produces 2 shards", "text-yellow-400")}
              {renderCategory(filteredCategories.id, "id", "ID Fusions", "Produces 1 shard", "text-blue-400")}
              {renderCategory(filteredCategories.chameleon, "chameleon", "Chameleon Fusions", "Produces 1 shard", "text-green-400")}
            </div>
          </div>
        ) : mode && recipes.length === 0 ? (
          <div className="text-center py-12 lg:py-16">
            <div className="text-slate-400 text-base lg:text-lg">{mode === "input" ? "No fusion recipes found using this shard." : "No recipes found to create this shard."}</div>
            <div className="text-slate-500 text-xs lg:text-sm mt-2">
              {mode === "input" ? "This shard might not be used in any fusion recipes." : "This shard might be obtained directly or not fuseable."}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 lg:py-20">
            <div className="text-slate-400 text-lg lg:text-xl">Select an input shard or output shard to see recipes</div>
            <div className="text-slate-500 text-xs lg:text-sm mt-2 lg:mt-3 px-4">Choose a shard on the left to see what you can make, or on the right to see how to make it.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipePage;
