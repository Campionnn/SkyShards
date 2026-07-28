import React, { useState, useMemo, useEffect, useRef } from "react";
import { X, Search, Check, RotateCcw, Filter, ChevronDown } from "lucide-react";
import { DEFAULT_FILTER_CONFIG, filterShards, getRarityColor, shardIconUrl, sortByShardKey, sortShardsByNameWithPrefixAwareness } from "../../utilities";
import type { Shard } from "../../types/types";
import { MAX_QUANTITIES } from "../../constants";
import { Modal, ToggleSwitch } from "../ui";

interface MultiSelectShardModalProps {
  isOpen: boolean;
  onClose: () => void;
  shards: Shard[];
  onDone: (selectedShards: Array<{ shard: Shard; quantity: number }>) => void;
  initialSelections?: Map<string, number>; // Map of shard key to quantity
  ownedAttributes?: Map<string, number>; // Map of shard key to attribute level (fused count)
}

export const MultiSelectShardModal: React.FC<MultiSelectShardModalProps> = ({ isOpen, onClose, shards, onDone, initialSelections = new Map(), ownedAttributes = new Map() }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [isRarityDropdownOpen, setIsRarityDropdownOpen] = useState(false);
  const [selections, setSelections] = useState<Map<string, number>>(new Map(initialSelections));
  const [showSelectedFirst, setShowSelectedFirst] = useState(false);
  const rarityDropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const rarityOptions = [
    { value: "all", label: "All Rarities", color: "text-violet-400" },
    { value: "common", label: "Common", color: "text-white" },
    { value: "uncommon", label: "Uncommon", color: "text-green-400" },
    { value: "rare", label: "Rare", color: "text-blue-400" },
    { value: "epic", label: "Epic", color: "text-purple-400" },
    { value: "legendary", label: "Legendary", color: "text-yellow-400" },
  ];

  const currentRarity = rarityOptions.find((r) => r.value === rarityFilter) || rarityOptions[0];

  const sortByShardId = (a: Shard, b: Shard) => sortByShardKey(a, b);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rarityDropdownRef.current && !rarityDropdownRef.current.contains(event.target as Node)) {
        setIsRarityDropdownOpen(false);
      }
    };

    if (isRarityDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isRarityDropdownOpen]);

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Update selections when initialSelections changes and modal opens
  useEffect(() => {
    if (isOpen) {
      setSelections(new Map(initialSelections));
    }
  }, [isOpen, initialSelections]);

  const filteredShards = useMemo(() => {
    // Apply filters using centralized function
    const filtered = filterShards(shards, {
      query: searchQuery,
      rarity: rarityFilter,
      searchConfig: DEFAULT_FILTER_CONFIG,
    });

    // Sort results
    let sorted: Shard[];
    if (!searchQuery.trim()) {
      sorted = filtered.sort(sortByShardId);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      sorted = filtered.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aStarts = aName.startsWith(lowerQuery);
        const bStarts = bName.startsWith(lowerQuery);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return sortShardsByNameWithPrefixAwareness(a, b);
      });
    }

    // If showSelectedFirst is enabled, separate selected and unselected shards
    if (showSelectedFirst) {
      const selected = sorted.filter((shard) => selections.has(shard.id));
      const unselected = sorted.filter((shard) => !selections.has(shard.id));
      return [...selected, ...unselected];
    }

    return sorted;
  }, [shards, searchQuery, rarityFilter, showSelectedFirst, selections]);

  const toggleShard = (shardKey: string) => {
    // Store scroll position before toggling
    const scrollPos = scrollContainerRef.current?.scrollTop || 0;
    
    setSelections((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(shardKey)) {
        newMap.delete(shardKey);
      } else {
        // Find the shard and set to max quantity based on rarity
        const shard = shards.find((s) => s.id === shardKey);
        if (shard) {
          const rarity = shard.rarity.toLowerCase() as keyof typeof MAX_QUANTITIES;
          const maxQty = MAX_QUANTITIES[rarity] || 1;
          newMap.set(shardKey, maxQty);
        } else {
          newMap.set(shardKey, 1);
        }
      }
      return newMap;
    });

    // Restore scroll position after state update
    if (showSelectedFirst) {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollPos;
        }
      });
    }
  };

  const updateQuantity = (shardKey: string, quantity: number) => {
    setSelections((prev) => {
      const newMap = new Map(prev);
      if (quantity > 0) {
        newMap.set(shardKey, quantity);
      }
      return newMap;
    });
  };

  const handleSelectAll = () => {
    const allSelections = new Map<string, number>();
    shards.forEach((shard) => {
      const rarity = shard.rarity.toLowerCase() as keyof typeof MAX_QUANTITIES;
      const maxQty = MAX_QUANTITIES[rarity] || 1;
      allSelections.set(shard.id, maxQty);
    });
    setSelections(allSelections);
  };

  const handleSelectMissing = () => {
    setSelections((prev) => {
      const newMap = new Map(prev);
      shards.forEach((shard) => {
        const rarity = shard.rarity.toLowerCase() as keyof typeof MAX_QUANTITIES;
        const maxQty = MAX_QUANTITIES[rarity] || 1;
        const owned = ownedAttributes.get(shard.id) ?? 0;
        const needed = maxQty - owned;
        if (needed > 0) {
          newMap.set(shard.id, needed);
        } else {
          newMap.delete(shard.id);
        }
      });
      return newMap;
    });
  };

  const handleDone = () => {
    const selectedData = Array.from(selections.entries())
      .map(([key, quantity]) => {
        const shard = shards.find((s) => s.id === key);
        return { shard: shard!, quantity };
      })
      .filter((item) => item.shard);
    onDone(selectedData);
  };

  if (!isOpen) return null;

  return (
    <Modal open={isOpen} onClose={onClose} labelledBy="multi-select-shard-title" panelClassName="bg-slate-800 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] sm:max-h-[85vh] flex flex-col border border-slate-700" backdropClassName="bg-black/60 p-2 sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div>
          <h2 id="multi-select-shard-title" className="text-xl font-bold text-white">Select Shards</h2>
          <p className="text-sm text-slate-400 mt-1">
            {selections.size} shard{selections.size !== 1 ? "s" : ""} selected
          </p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer" aria-label="Close modal">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Search and Filters */}
      <div className="p-4 border-b border-slate-700 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shards..."
              className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              autoFocus
            />
          </div>

          {/* Rarity Filter Dropdown */}
          <div className="relative" ref={rarityDropdownRef}>
            <button
              type="button"
              onClick={() => setIsRarityDropdownOpen(!isRarityDropdownOpen)}
              className="flex items-center justify-between gap-2 px-3 py-2 h-[42px] min-w-[140px] bg-purple-500/10 border border-purple-500/20 hover:border-purple-400/30 rounded-md hover:bg-purple-500/20 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Filter className={`w-4 h-4 ${currentRarity.color}`} />
                <span className={`text-sm font-medium ${currentRarity.color}`}>{currentRarity.label}</span>
              </div>
              <ChevronDown className={`w-4 h-4 ${currentRarity.color} transition-transform ${isRarityDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isRarityDropdownOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-slate-800 border border-purple-500/20 rounded-md shadow-xl z-50 overflow-hidden">
                {rarityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setRarityFilter(option.value);
                      setIsRarityDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-sm text-left font-medium transition-colors cursor-pointer ${
                      rarityFilter === option.value ? "bg-purple-500/30 " + option.color : option.color + " hover:bg-purple-500/10 hover:brightness-125"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset Filter Button */}
          <button
            onClick={() => {
              setSearchQuery("");
              setRarityFilter("all");
            }}
            className="px-3 py-2 h-[42px] text-sm bg-slate-600/50 hover:bg-slate-600 border border-slate-500/50 hover:border-slate-500 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            title="Reset filters"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Showing {filteredShards.length} of {shards.length} shards</span>
          <ToggleSwitch
            label="Show Selected First"
            checked={showSelectedFirst}
            onChange={setShowSelectedFirst}
          />
        </div>
      </div>

      {/* Shards List */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {filteredShards.map((shard) => {
            const isSelected = selections.has(shard.id);
            const quantity = selections.get(shard.id) || 1;
            return (
              <div
                key={shard.id}
                onClick={() => toggleShard(shard.id)}
                className={`flex items-center gap-2 p-2.5 rounded-lg transition-all duration-300 border cursor-pointer ${
                  isSelected ? "bg-blue-500/20 border-blue-500/50 hover:border-blue-500/70" : "bg-slate-700/30 hover:bg-slate-700/60 border border-slate-600/50 hover:border-slate-500"
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0 group">
                  <div className="relative flex-shrink-0">
                    <img src={shardIconUrl(shard.id)} alt={shard.name} className="w-7 h-7 object-contain" loading="lazy" />
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border border-slate-800">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <div className={`font-medium text-sm truncate ${getRarityColor(shard.rarity)} group-hover:brightness-125 transition-all`}>{shard.name}</div>
                    <div className="text-xs text-slate-400 truncate">
                      {shard.family} • {shard.type}
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => updateQuantity(shard.id, parseInt(e.target.value) || 1)}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.target.select()}
                    className="w-14 px-2 py-1 text-sm bg-slate-700 border border-slate-600 rounded text-white text-center focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex-shrink-0"
                  />
                )}
              </div>
            );
          })}
        </div>

        {filteredShards.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No shards found matching "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Footer with Done Button */}
      <div className="p-4 border-t border-slate-700 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            className="px-4 py-2 text-sm bg-green-500/20 hover:bg-green-500/30 border border-green-500/20 hover:border-green-500/30 rounded-md text-green-400 font-medium transition-colors cursor-pointer"
          >
            Select All
          </button>
          <button
            onClick={handleSelectMissing}
            className="px-4 py-2 text-sm bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/20 hover:border-purple-500/30 rounded-md text-purple-400 font-medium transition-colors cursor-pointer"
            title="Select all shards not yet maxed, with the quantity still needed to reach max"
          >
            Select Missing
          </button>
          <button onClick={() => setSelections(new Map())} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer" disabled={selections.size === 0}>
            Clear All
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">
            Total: {Array.from(selections.values()).reduce((sum, qty) => sum + qty, 0)} shard{Array.from(selections.values()).reduce((sum, qty) => sum + qty, 0) !== 1 ? "s" : ""}
          </span>
          <button
            onClick={handleDone}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={selections.size === 0}
          >
            Show Materials
          </button>
        </div>
      </div>
    </Modal>
  );
};
