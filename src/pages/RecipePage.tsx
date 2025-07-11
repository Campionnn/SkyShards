import { useState, useEffect } from "react";
import { ShardAutocomplete } from "../components/ShardAutocomplete";
import { RecipeCountBadge } from "../components/RecipeCountBadge";
import { SearchFilterInput } from "../components/SearchFilterInput";
import { ShardDisplay } from "../components/ShardDisplay";
import { getRarityColor } from "../utils";
import { Plus, Equal, ChevronDown } from "lucide-react";
import { useRecipeState } from "../context/RecipeStateContext";
import { useFusionData } from "../hooks/useFusionData";
import { useDropdownManager } from "../hooks/useDropdownManager";
import { processInputRecipes, processOutputRecipes, filterGroups, groupRecipesByInput, filterRecipeGroups, type OutputGroup, type Recipe } from "../utils/recipeUtils";
import type { ShardWithKey } from "../types";

const RecipePage = () => {
  const { selectedShard, setSelectedShard, selectedOutputShard, setSelectedOutputShard } = useRecipeState();
  const { fusionData, loading } = useFusionData();

  const [searchValue, setSearchValue] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [outputGroups, setOutputGroups] = useState<OutputGroup[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<{ [output: string]: string }>({});

  const [outputSearchValue, setOutputSearchValue] = useState("");
  const [outputFilterValue, setOutputFilterValue] = useState("");
  const [outputRecipes, setOutputRecipes] = useState<Recipe[]>([]);
  const [selectedOutputPartner, setSelectedOutputPartner] = useState<{ [key: string]: number }>({});

  const inputDropdowns = useDropdownManager();
  const outputDropdowns = useDropdownManager();

  useEffect(() => {
    if (!selectedShard || !fusionData) {
      setOutputGroups([]);
      return;
    }
    setOutputGroups(processInputRecipes(selectedShard, fusionData));
  }, [selectedShard, fusionData]);

  useEffect(() => {
    if (!selectedOutputShard || !fusionData) {
      setOutputRecipes([]);
      return;
    }
    setOutputRecipes(processOutputRecipes(selectedOutputShard, fusionData));
  }, [selectedOutputShard, fusionData]);

  const handleShardSelect = (shard: ShardWithKey) => {
    setSelectedShard(shard);
    setSelectedOutputShard(null);
    setOutputSearchValue("");
  };

  const handleSearchInputFocus = () => {
    if (searchValue) setSearchValue("");
  };

  const handleOutputShardSelect = (shard: ShardWithKey) => {
    setSelectedOutputShard(shard);
    setSelectedShard(null);
    setSearchValue("");
    setFilterValue("");
  };

  const handleOutputSearchInputFocus = () => {
    if (outputSearchValue) setOutputSearchValue("");
  };

  if (loading && !fusionData) {
    return (
      <div className="min-h-screen">
        <div className="w-full border-b border-slate-700/30">
          <div className="px-4 py-4">
            <div className="flex justify-center">
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
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!fusionData) return null;

  const filteredInputGroups = filterGroups(outputGroups, filterValue, fusionData);
  const groupedOutputRecipes = groupRecipesByInput(outputRecipes);
  const filteredOutputGroups = filterRecipeGroups(groupedOutputRecipes, outputFilterValue, fusionData);

  return (
    <div className="min-h-screen">
      <div className="px-2 sm:px-4 py-4">
        <div className="flex flex-col lg:flex-row justify-center gap-3 lg:gap-6 mb-4 lg:mb-6">
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-md p-3 lg:p-4 flex flex-col gap-2 space-y-2 lg:space-y-3 w-full lg:max-w-lg">
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
                  <span className="text-slate-300 text-sm">What can you make with</span>
                  <img src={`${import.meta.env.BASE_URL}shardIcons/${selectedShard.key}.png`} alt={selectedShard.name} className="w-5 h-5 object-contain" loading="lazy" />
                  <span className={`font-semibold text-sm ${getRarityColor(selectedShard.rarity)}`}>{selectedShard.name}</span>
                  <span className="text-slate-400 text-sm">?</span>
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

          <div className="bg-slate-800/40 border border-slate-600/30 rounded-md p-3 lg:p-4 flex flex-col gap-2 space-y-2 lg:space-y-3 w-full lg:max-w-lg">
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
                  <span className="text-slate-300 text-sm">How to make</span>
                  <img src={`${import.meta.env.BASE_URL}shardIcons/${selectedOutputShard.key}.png`} alt={selectedOutputShard.name} className="w-5 h-5 object-contain" loading="lazy" />
                  <span className={`font-semibold text-sm ${getRarityColor(selectedOutputShard.rarity)}`}>{selectedOutputShard.name}</span>
                  <span className="text-slate-400 text-sm">?</span>
                </div>
              </div>
            )}

            {!loading && outputRecipes.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 lg:gap-4">
                <RecipeCountBadge count={filteredOutputGroups.length} label="Available Recipes" variant="fuchsia" />
                <SearchFilterInput value={outputFilterValue} onChange={setOutputFilterValue} placeholder="Filter recipes..." variant="fuchsia" />
              </div>
            )}
          </div>
        </div>

        {selectedShard || selectedOutputShard ? (
          <div className="flex justify-center">
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
                    .map((outputGroup) => {
                      const partnerId = selectedPartner[outputGroup.output] || outputGroup.partners[0];
                      const isOpen = inputDropdowns.dropdownOpen[outputGroup.output] || false;
                      const position = outputGroup.positions.get(partnerId) || "first";

                      return (
                        <div key={`${outputGroup.output}-${position}`} className="px-2">
                          <div className="flex items-center gap-2 lg:gap-3 min-w-0 min-h-[40px]">
                            {/* First position shard */}
                            <div className="flex items-center gap-1 lg:gap-2 min-w-0 flex-shrink-0">
                              {position === "first" ? (
                                // Selected shard is first, so show it directly
                                <ShardDisplay shardId={selectedShard.key} fusionData={fusionData} />
                              ) : // Partner is first, so show dropdown/partner
                              outputGroup.partners.length > 1 ? (
                                <div className="relative flex-shrink-0" ref={(el) => inputDropdowns.setRef(outputGroup.output, el)}>
                                  <button
                                    type="button"
                                    className="flex items-center gap-1 lg:gap-2 px-1 lg:px-2 py-1 lg:py-2 text-slate-200 rounded shadow-sm border cursor-pointer bg-slate-800 border-slate-700 hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                                    onClick={() => inputDropdowns.toggleDropdown(outputGroup.output)}
                                    tabIndex={0}
                                  >
                                    <ShardDisplay shardId={partnerId} fusionData={fusionData} size="sm" />
                                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                                  </button>
                                  {isOpen && (
                                    <div className="absolute z-50 top-full mt-1 left-0 bg-slate-900 border border-slate-600 rounded shadow-xl max-h-40 overflow-auto min-w-max">
                                      {outputGroup.partners.map((pid) => (
                                        <button
                                          key={pid}
                                          type="button"
                                          className={`w-full cursor-pointer flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-700 focus:bg-slate-700 transition-colors duration-150 ${
                                            pid === partnerId ? "bg-slate-700 border-l-2 border-blue-400" : "text-slate-200"
                                          }`}
                                          onClick={() => {
                                            setSelectedPartner((prev) => ({ ...prev, [outputGroup.output]: pid }));
                                            inputDropdowns.closeDropdown(outputGroup.output);
                                          }}
                                        >
                                          <span className="text-sm text-slate-400 font-medium flex-shrink-0">×{fusionData.shards[pid]?.fuse_amount || 2}</span>
                                          <img
                                            src={`${import.meta.env.BASE_URL}shardIcons/${pid}.png`}
                                            alt={fusionData.shards[pid]?.name}
                                            className="w-5 h-5 object-contain flex-shrink-0"
                                            loading="lazy"
                                          />
                                          <span
                                            className={`text-sm flex-1 ${pid === partnerId ? "text-blue-300" : getRarityColor(fusionData.shards[pid]?.rarity || "common")}`}
                                            title={fusionData.shards[pid]?.name}
                                          >
                                            {fusionData.shards[pid]?.name}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <ShardDisplay shardId={partnerId} fusionData={fusionData} />
                              )}
                            </div>

                            <div className="flex items-center justify-center flex-shrink-0">
                              <Plus className="w-3 h-3 text-purple-400" strokeWidth={2} />
                            </div>

                            {/* Second position shard */}
                            <div className="flex items-center gap-1 lg:gap-2 min-w-0 flex-shrink-0">
                              {position === "second" ? (
                                // Selected shard is second, so show it directly
                                <ShardDisplay shardId={selectedShard.key} fusionData={fusionData} />
                              ) : // Partner is second, so show dropdown/partner
                              outputGroup.partners.length > 1 ? (
                                <div className="relative flex-shrink-0" ref={(el) => inputDropdowns.setRef(outputGroup.output + "-second", el)}>
                                  <button
                                    type="button"
                                    className="flex items-center gap-1 lg:gap-2 px-1 lg:px-2 py-1 lg:py-2 text-slate-200 rounded shadow-sm border cursor-pointer bg-slate-800 border-slate-700 hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                                    onClick={() => inputDropdowns.toggleDropdown(outputGroup.output + "-second")}
                                    tabIndex={0}
                                  >
                                    <ShardDisplay shardId={partnerId} fusionData={fusionData} size="sm" />
                                    <ChevronDown
                                      className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${inputDropdowns.dropdownOpen[outputGroup.output + "-second"] ? "rotate-180" : ""}`}
                                    />
                                  </button>
                                  {inputDropdowns.dropdownOpen[outputGroup.output + "-second"] && (
                                    <div className="absolute z-50 top-full mt-1 left-0 bg-slate-900 border border-slate-600 rounded shadow-xl max-h-40 overflow-auto min-w-max">
                                      {outputGroup.partners.map((pid) => (
                                        <button
                                          key={pid}
                                          type="button"
                                          className={`w-full cursor-pointer flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-700 focus:bg-slate-700 transition-colors duration-150 ${
                                            pid === partnerId ? "bg-slate-700 border-l-2 border-blue-400" : "text-slate-200"
                                          }`}
                                          onClick={() => {
                                            setSelectedPartner((prev) => ({ ...prev, [outputGroup.output]: pid }));
                                            inputDropdowns.closeDropdown(outputGroup.output + "-second");
                                          }}
                                        >
                                          <span className="text-sm text-slate-400 font-medium flex-shrink-0">×{fusionData.shards[pid]?.fuse_amount || 2}</span>
                                          <img
                                            src={`${import.meta.env.BASE_URL}shardIcons/${pid}.png`}
                                            alt={fusionData.shards[pid]?.name}
                                            className="w-5 h-5 object-contain flex-shrink-0"
                                            loading="lazy"
                                          />
                                          <span
                                            className={`text-sm flex-1 ${pid === partnerId ? "text-blue-300" : getRarityColor(fusionData.shards[pid]?.rarity || "common")}`}
                                            title={fusionData.shards[pid]?.name}
                                          >
                                            {fusionData.shards[pid]?.name}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <ShardDisplay shardId={partnerId} fusionData={fusionData} />
                              )}
                            </div>

                            <div className="flex items-center justify-center flex-shrink-0">
                              <Equal className="w-3 h-3 text-purple-400" strokeWidth={2} />
                            </div>

                            <ShardDisplay shardId={outputGroup.output} quantity={outputGroup.quantities.get(partnerId) || 1} fusionData={fusionData} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {selectedOutputShard && !selectedShard && !loading && outputRecipes.length > 0 && (
              <div className="w-full max-w-fit mx-auto">
                <div className="inline-grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-x-6 bg-slate-700/50 border border-slate-600/50 rounded-md p-2 lg:p-3">
                  {filteredOutputGroups.map(([input1, partners], groupIndex) => {
                    const selectedPartnerIndex = selectedOutputPartner[input1] || 0;
                    const selectedPartner = partners[selectedPartnerIndex];
                    const isOpen = outputDropdowns.dropdownOpen[input1] || false;

                    return (
                      <div key={`${input1}-${groupIndex}`} className="px-2">
                        <div className="flex items-center gap-2 lg:gap-3 min-w-0 min-h-[40px]">
                          <ShardDisplay shardId={input1} fusionData={fusionData} />

                          <div className="flex items-center justify-center flex-shrink-0">
                            <Plus className="w-3 h-3 text-purple-400" strokeWidth={2} />
                          </div>

                          <div className="flex items-center gap-1 lg:gap-2 min-w-0 flex-shrink-0">
                            {partners.length > 1 ? (
                              <div className="relative flex-shrink-0" ref={(el) => outputDropdowns.setRef(input1, el)}>
                                <button
                                  type="button"
                                  className="flex items-center gap-1 lg:gap-2 px-1 lg:px-2 py-1 lg:py-2 text-slate-200 rounded shadow-sm border cursor-pointer bg-slate-800 border-slate-700 hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                                  onClick={() => outputDropdowns.toggleDropdown(input1)}
                                  tabIndex={0}
                                >
                                  <ShardDisplay shardId={selectedPartner.input2} fusionData={fusionData} size="sm" />
                                  <ChevronDown className={`w-2 h-2 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                                </button>
                                {isOpen && (
                                  <div className="absolute z-50 top-full mt-1 left-0 bg-slate-900 border border-slate-600 rounded shadow-xl max-h-40 overflow-auto min-w-max">
                                    {partners.map((partner, index) => (
                                      <button
                                        key={`${partner.input2}-${index}`}
                                        type="button"
                                        className={`w-full cursor-pointer flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-700 focus:bg-slate-700 transition-colors duration-150 ${
                                          index === selectedPartnerIndex ? "bg-slate-700 border-l-2 border-blue-400" : "text-slate-200"
                                        }`}
                                        onClick={() => {
                                          setSelectedOutputPartner((prev) => ({ ...prev, [input1]: index }));
                                          outputDropdowns.closeDropdown(input1);
                                        }}
                                      >
                                        <span className="text-sm text-slate-400 font-medium flex-shrink-0">×{fusionData.shards[partner.input2]?.fuse_amount || 2}</span>
                                        <img
                                          src={`${import.meta.env.BASE_URL}shardIcons/${partner.input2}.png`}
                                          alt={fusionData.shards[partner.input2]?.name}
                                          className="w-5 h-5 object-contain flex-shrink-0"
                                          loading="lazy"
                                        />
                                        <span
                                          className={`text-sm flex-1 ${index === selectedPartnerIndex ? "text-blue-300" : getRarityColor(fusionData.shards[partner.input2]?.rarity || "common")}`}
                                          title={fusionData.shards[partner.input2]?.name}
                                        >
                                          {fusionData.shards[partner.input2]?.name}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <ShardDisplay shardId={selectedPartner.input2} fusionData={fusionData} />
                            )}
                          </div>

                          <div className="flex items-center justify-center flex-shrink-0">
                            <Equal className="w-3 h-3 text-purple-400" strokeWidth={2} />
                          </div>

                          <ShardDisplay shardId={selectedOutputShard.key} quantity={selectedPartner.quantity} fusionData={fusionData} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 lg:py-20">
            <div className="text-slate-400 text-lg lg:text-xl">Select an input shard or output shard to see recipes</div>
            <div className="text-slate-500 text-xs lg:text-sm mt-2 lg:mt-3 px-4">
              Choose any shard in the left panel to see what you can create, or choose any shard in the right panel to see how to make it
            </div>
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
