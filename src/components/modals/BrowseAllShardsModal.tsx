import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Search } from "lucide-react";
import { getRarityColor } from "../../utilities";
import type { ShardWithKey } from "../../types/types";

interface BrowseAllShardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shards: ShardWithKey[];
  onSelectShard: (shard: ShardWithKey) => void;
}

export const BrowseAllShardsModal: React.FC<BrowseAllShardsModalProps> = ({ isOpen, onClose, shards, onSelectShard }) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen]);

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const sortByShardId = (a: ShardWithKey, b: ShardWithKey) => {
    // Extract rarity letter and number from ID (e.g., "C1" -> "C" and 1)
    const aMatch = a.key.match(/^([CUREL])(\d+)$/);
    const bMatch = b.key.match(/^([CUREL])(\d+)$/);

    if (!aMatch || !bMatch) {
      return a.key.localeCompare(b.key);
    }

    const [, aRarity, aNum] = aMatch;
    const [, bRarity, bNum] = bMatch;

    // Define rarity order
    const rarityOrder: Record<string, number> = { C: 1, U: 2, R: 3, E: 4, L: 5 };

    // First sort by rarity
    if (rarityOrder[aRarity] !== rarityOrder[bRarity]) {
      return rarityOrder[aRarity] - rarityOrder[bRarity];
    }

    // Then sort by number
    return parseInt(aNum) - parseInt(bNum);
  };

  const filteredShards = useMemo(() => {
    if (!searchQuery.trim()) {
      return [...shards].sort(sortByShardId);
    }

    const lowerQuery = searchQuery.toLowerCase();
    const filtered = shards.filter((shard) => shard.name.toLowerCase().includes(lowerQuery));

    // Sort results: prioritize shards that start with the query, then by ID
    return filtered.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aStarts = aName.startsWith(lowerQuery);
      const bStarts = bName.startsWith(lowerQuery);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return sortByShardId(a, b);
    });
  }, [shards, searchQuery]);

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

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-700">
          <div className="relative">
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
          <div className="mt-2 text-sm text-slate-400">
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
                className="flex items-center gap-2 p-2.5 bg-slate-700/30 hover:bg-slate-700/60 border border-slate-600/50 hover:border-slate-500 rounded-lg transition-all text-left group cursor-pointer"
              >
                <img src={`${import.meta.env.BASE_URL}shardIcons/${shard.key}.png`} alt={shard.name} className="w-7 h-7 object-contain flex-shrink-0" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <div className={`font-medium text-sm truncate ${getRarityColor(shard.rarity)} group-hover:text-white transition-colors`}>{shard.name}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {shard.family} • {shard.type}
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
