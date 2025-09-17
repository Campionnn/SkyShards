import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, RotateCcw, Save } from "lucide-react";
import { useShardsWithRecipes, useCustomRates } from "../hooks";
import { debounce, formatShardDescription } from "../utilities";
import { RarityDropdown, TypeDropdown, ShardItem, ShardModal } from "../components";
import { SHARD_DESCRIPTIONS } from "../constants";
import type { ShardWithDirectInfo } from "../types/types";

export const SettingsPage: React.FC = () => {
  const { shards, loading: shardsLoading } = useShardsWithRecipes();
  const { customRates, defaultRates, updateRate, resetRates } = useCustomRates();
  const [filter, setFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [hasChanges, setHasChanges] = useState(false);
  const [modalShard, setModalShard] = useState<ShardWithDirectInfo | null>(null);

  const [debouncedFilter, setDebouncedFilter] = useState("");

  const debouncedSetFilter = useMemo(() => debounce((value: string) => setDebouncedFilter(value), 300), []);
  useEffect(() => {
    debouncedSetFilter(filter);
  }, [filter, debouncedSetFilter]);

  const filteredShards = useMemo(() => {
    return shards.filter((shard) => {
      const search = debouncedFilter.toLowerCase();
      const matchesName = shard.name.toLowerCase().includes(search);
      const matchesFamily = shard.family.toLowerCase().includes(search);
      const matchesTypeField = shard.type.toLowerCase().includes(search);

      const shardDesc = SHARD_DESCRIPTIONS[shard.key as keyof typeof SHARD_DESCRIPTIONS];
      const matchesTitle = shardDesc?.title?.toLowerCase().includes(search) || false;
      const matchesDescription = shardDesc?.description?.toLowerCase().includes(search) || false;

      const matchesSearch = matchesName || matchesFamily || matchesTypeField || matchesTitle || matchesDescription;
      const matchesRarity = rarityFilter === "all" || shard.rarity === rarityFilter;
      const matchesType = typeFilter === "all" || (typeFilter === "direct" && shard.isDirect) || (typeFilter === "fuse" && !shard.isDirect);
      return matchesSearch && matchesRarity && matchesType;
    });
  }, [shards, debouncedFilter, rarityFilter, typeFilter]);

  const handleRateChange = useCallback(
    (shardId: string, newRate: number | undefined) => {
      updateRate(shardId, newRate);

      // Only show save button if there are actual changes from defaults
      // Check if the new rate is different from the default rate
      const defaultRate = defaultRates[shardId];
      const hasActualChange = newRate !== undefined && newRate !== defaultRate;

      // Check if any other shards have custom rates that differ from defaults
      const otherChanges = Object.entries(customRates).some(([id, rate]) => {
        if (id === shardId) return false; // Skip the current shard being changed
        return rate !== undefined && rate !== defaultRates[id];
      });

      setHasChanges(hasActualChange || otherChanges);
    },
    [updateRate, defaultRates, customRates]
  );

  const handleResetRates = useCallback(() => {
    if (confirm("Are you sure you want to reset all rates to their defaults? This will clear all custom rates.")) {
      resetRates();
      setHasChanges(false);
    }
  }, [resetRates]);

  const handleSave = useCallback(() => {
    setHasChanges(false);
  }, []);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
  }, []);

  if (shardsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col space-y-4 py-4">
      {/* Controls */}
      <div className="bg-white/5 border border-white/10 rounded-md p-4">
        <div className="text-center pb-6 pt-2">
          <h1 className="text-2xl font-black text-purple-400 mb-2">Shard Overview and Rates</h1>
          <p className="text-slate-400">
            Customize gathering rates<span className="font-bold text-slate-500 mx-0.5">/</span>
            <span className="text-slate-500">hr</span> for more accurate calculations
          </p>
        </div>
        <div className="md:hidden space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={filter}
              onChange={handleFilterChange}
              onFocus={() => setFilter("")}
              placeholder="Search by name, perk, or description..."
              className="
                w-full pl-10 pr-4 py-2.5 
                bg-white/5 border border-white/10 
                rounded-md text-white placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50
                transition-colors duration-200
              "
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <RarityDropdown value={rarityFilter} onChange={setRarityFilter} />
            <TypeDropdown value={typeFilter} onChange={setTypeFilter} />
            <button
              onClick={handleResetRates}
              className="
                px-3 py-2.5 bg-red-500/20 hover:bg-red-500/30 
                text-red-400 font-medium rounded-md 
                border border-red-500/20 hover:border-red-500/30
                transition-colors duration-200
                flex items-center space-x-2 cursor-pointer
              "
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
            {hasChanges && (
              <button
                onClick={handleSave}
                className="
                  px-3 py-2.5 bg-green-500/20 hover:bg-green-500/30 
                  text-green-400 font-medium rounded-md 
                  border border-green-500/20 hover:border-green-500/30
                  transition-colors duration-200
                  flex items-center space-x-2 cursor-pointer
                "
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>
            )}
          </div>
        </div>

        <div className="hidden md:flex md:flex-wrap gap-3">
          <div className="flex-1 min-w-[400px] relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={filter}
              onChange={handleFilterChange}
              onFocus={() => setFilter("")}
              placeholder="Search by name, perk, or description..."
              className="
                w-full pl-10 pr-4 py-2.5 
                bg-white/5 border border-white/10 
                rounded-md text-white placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50
                transition-colors duration-200
              "
            />
          </div>

          <RarityDropdown value={rarityFilter} onChange={setRarityFilter} />
          <TypeDropdown value={typeFilter} onChange={setTypeFilter} />

          <div className="flex gap-2">
            <button
              onClick={handleResetRates}
              className="
                px-3 py-2.5 bg-red-500/20 hover:bg-red-500/30 
                text-red-400 font-medium rounded-md 
                border border-red-500/20 hover:border-red-500/30
                transition-colors duration-200
                flex items-center space-x-2 cursor-pointer
              "
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>

            {hasChanges && (
              <button
                onClick={handleSave}
                className="
                  px-3 py-2.5 bg-green-500/20 hover:bg-green-500/30 
                  text-green-400 font-medium rounded-md 
                  border border-green-500/20 hover:border-green-500/30
                  transition-colors duration-200
                  flex items-center space-x-2 cursor-pointer
                "
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 text-sm text-slate-400">
          <p>
            Base rates (shards/hour) • Showing {filteredShards.length} of {shards.length} shards
          </p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-md overflow-hidden flex-1">
        <div className="h-full overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 p-3">
            {filteredShards.map((shard) => (
              <div key={shard.key}>
                <ShardItem
                  shard={shard}
                  rate={customRates[shard.key] !== undefined ? customRates[shard.key]! : defaultRates[shard.key]}
                  defaultRate={defaultRates[shard.key]}
                  onRateChange={handleRateChange}
                  onCardClick={() => setModalShard(shard)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {modalShard &&
        (() => {
          const desc = SHARD_DESCRIPTIONS[modalShard.key as keyof typeof SHARD_DESCRIPTIONS];
          const icon = `${import.meta.env.BASE_URL}shardIcons/${modalShard.key}.png`;
          return (
            <ShardModal
              open={!!modalShard}
              onClose={() => setModalShard(null)}
              title={desc?.title || modalShard.name}
              name={modalShard.name}
              description={formatShardDescription(desc?.description || "No description.")}
              rarity={modalShard.rarity}
              icon={icon}
              rate={customRates[modalShard.key] !== undefined ? customRates[modalShard.key] : defaultRates[modalShard.key]}
              onRateChange={(newRate) => handleRateChange(modalShard.key, newRate)}
              isDirect={modalShard.isDirect}
              family={modalShard.family}
              type={modalShard.type}
            />
          );
        })()}

      {filteredShards.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Shards Found</h3>
          <p className="text-slate-400">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
};
