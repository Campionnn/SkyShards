import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, RotateCcw, Save } from "lucide-react";
import { useShardsWithRecipes, useCustomRates } from "../hooks";
import { debounce } from "../utils";
import { RarityDropdown, TypeDropdown, ShardItem } from "../components";

export const SettingsPage: React.FC = () => {
  const { shards, loading: shardsLoading } = useShardsWithRecipes();
  const { customRates, defaultRates, updateRate, resetRates } = useCustomRates();
  const [filter, setFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [hasChanges, setHasChanges] = useState(false);

  // Debounced filter to reduce re-renders
  const [debouncedFilter, setDebouncedFilter] = useState("");

  const debouncedSetFilter = useMemo(() => debounce((value: string) => setDebouncedFilter(value), 300), []);

  useEffect(() => {
    debouncedSetFilter(filter);
  }, [filter, debouncedSetFilter]);

  // Memoized filtered shards for better performance
  const filteredShards = useMemo(() => {
    return shards.filter((shard) => {
      const matchesSearch = shard.name.toLowerCase().includes(debouncedFilter.toLowerCase());
      const matchesRarity = rarityFilter === "all" || shard.rarity === rarityFilter;
      const matchesType = typeFilter === "all" || (typeFilter === "direct" && shard.isDirect) || (typeFilter === "fuse" && !shard.isDirect);
      return matchesSearch && matchesRarity && matchesType;
    });
  }, [shards, debouncedFilter, rarityFilter, typeFilter]);

  const handleRateChange = useCallback(
    (shardId: string, newRate: number) => {
      updateRate(shardId, newRate);
      setHasChanges(true);
    },
    [updateRate]
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
      <div className="text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">Custom Shard Rates</h1>
        <p className="text-slate-400">Customize gathering rates for more accurate calculations</p>
      </div>

      {/* Controls */}
      <div className="bg-white/5 border border-white/10 rounded-md p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={filter}
              onChange={handleFilterChange}
              placeholder="Search shards..."
              className="
                w-full pl-10 pr-4 py-2.5 
                bg-white/5 border border-white/10 
                rounded-md text-white placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50
                transition-colors duration-200
              "
            />
          </div>

          {/* Filters */}
          <RarityDropdown value={rarityFilter} onChange={setRarityFilter} />
          <TypeDropdown value={typeFilter} onChange={setTypeFilter} />

          {/* Action Buttons */}
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

      {/* Shards List */}
      <div className="bg-white/5 border border-white/10 rounded-md overflow-hidden flex-1">
        <div className="h-full overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2 p-3">
            {filteredShards.map((shard) => (
              <ShardItem key={shard.key} shard={shard} rate={customRates[shard.key] || defaultRates[shard.key] || 0} onRateChange={handleRateChange} />
            ))}
          </div>
        </div>
      </div>

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
