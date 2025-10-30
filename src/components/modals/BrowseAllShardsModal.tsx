import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Search, Filter, ChevronDown, RotateCcw } from "lucide-react";
import { getRarityColor, sortShardsByNameWithPrefixAwareness, sortByShardKey, filterShards, DEFAULT_FILTER_CONFIG } from "../../utilities";
import type { ShardWithKey } from "../../types/types";

interface BrowseAllShardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shards: ShardWithKey[];
  onSelectShard: (shard: ShardWithKey) => void;
}

export const BrowseAllShardsModal: React.FC<BrowseAllShardsModalProps> = ({ isOpen, onClose, shards, onSelectShard }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [isRarityDropdownOpen, setIsRarityDropdownOpen] = useState(false);
  const rarityDropdownRef = useRef<HTMLDivElement>(null);

  const rarityOptions = [
    { value: "all", label: "All Rarities", color: "text-violet-400" },
    { value: "common", label: "Common", color: "text-white" },
    { value: "uncommon", label: "Uncommon", color: "text-green-400" },
    { value: "rare", label: "Rare", color: "text-blue-400" },
    { value: "epic", label: "Epic", color: "text-purple-400" },
    { value: "legendary", label: "Legendary", color: "text-yellow-400" },
  ];

  const currentRarity = rarityOptions.find((r) => r.value === rarityFilter) || rarityOptions[0];

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen]);

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

  const filteredShards = useMemo(() => {
    // Apply filters using centralized function
    const filtered = filterShards(shards, {
      query: searchQuery,
      rarity: rarityFilter,
      searchConfig: DEFAULT_FILTER_CONFIG,
    });

    // Sort results
    if (!searchQuery.trim()) {
      return filtered.sort(sortByShardKey);
    }

    const lowerQuery = searchQuery.toLowerCase();
    return filtered.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aStarts = aName.startsWith(lowerQuery);
      const bStarts = bName.startsWith(lowerQuery);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return sortShardsByNameWithPrefixAwareness(a, b);
    });
  }, [shards, searchQuery, rarityFilter]);

  const handleSelectShard = (shard: ShardWithKey) => {
    onSelectShard(shard);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] sm:max-h-[85vh] flex flex-col border border-slate-700" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Browse All Shards</h2>
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
          <div className="text-sm text-slate-400">
            Showing {filteredShards.length} of {shards.length} shards
          </div>
        </div>

        {/* Shards List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {filteredShards.map((shard) => (
              <button
                key={shard.key}
                onClick={() => handleSelectShard(shard)}
                className="flex items-center gap-2 p-2.5 bg-slate-700/30 hover:bg-slate-700/60 border border-slate-600/50 hover:border-slate-500 rounded-lg transition-all duration-300 text-left group cursor-pointer"
              >
                <img src={`${import.meta.env.BASE_URL}shardIcons/${shard.key}.png`} alt={shard.name} className="w-7 h-7 object-contain flex-shrink-0" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <div className={`font-medium text-sm truncate ${getRarityColor(shard.rarity)}`}>{shard.name}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {shard.key} • {shard.family} • {shard.type}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filteredShards.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No shards found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
