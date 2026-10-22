import { useEffect, useMemo, useRef, useState } from "react";
import { X, Search, Check } from "lucide-react";
import { getRarityColor, shardIconUrl } from "../../utilities";
import type { Shard } from "../../types/types";
import { maxQuantityForRarity } from "../../constants";
import { Modal, ToggleSwitch } from "../ui";
import { RarityFilter, ResetFiltersButton, SearchInput } from "./shardPicker";
import { MODAL_SEARCH_INPUT, searchShards } from "./shardSearch";

interface MultiSelectShardModalProps {
  isOpen: boolean;
  onClose: () => void;
  shards: Shard[];
  onDone: (selectedShards: Array<{ shard: Shard; quantity: number }>) => void;
  initialSelections?: Map<string, number>; // Map of shard key to quantity
  ownedAttributes?: Map<string, number>; // Map of shard key to attribute level (fused count)
}

const EMPTY_MAP = new Map<string, number>();

/** Multi-shard mode's picker: choose shards and how many of each to make. */
export const MultiSelectShardModal = ({
  isOpen,
  onClose,
  shards,
  onDone,
  initialSelections = EMPTY_MAP,
  ownedAttributes = EMPTY_MAP,
}: MultiSelectShardModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [selections, setSelections] = useState<Map<string, number>>(new Map(initialSelections));
  const [showSelectedFirst, setShowSelectedFirst] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    const sorted = searchShards(shards, searchQuery, rarityFilter);

    // If showSelectedFirst is enabled, separate selected and unselected shards
    if (showSelectedFirst) {
      const selected = sorted.filter((shard) => selections.has(shard.id));
      const unselected = sorted.filter((shard) => !selections.has(shard.id));
      return [...selected, ...unselected];
    }

    return sorted;
  }, [shards, searchQuery, rarityFilter, showSelectedFirst, selections]);

  const toggleShard = (shard: Shard) => {
    const scrollPos = scrollContainerRef.current?.scrollTop || 0;

    setSelections((prev) => {
      const next = new Map(prev);
      if (next.has(shard.id)) next.delete(shard.id);
      else next.set(shard.id, maxQuantityForRarity(shard.rarity));
      return next;
    });

    // Selected-first reorders the list under the cursor; keep the scroll position.
    if (showSelectedFirst) {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = scrollPos;
      });
    }
  };

  const updateQuantity = (shardKey: string, quantity: number) => {
    if (quantity > 0) setSelections((prev) => new Map(prev).set(shardKey, quantity));
  };

  const handleSelectAll = () => setSelections(new Map(shards.map((shard) => [shard.id, maxQuantityForRarity(shard.rarity)])));

  // Every shard not yet maxed, for the quantity still needed to max it.
  const handleSelectMissing = () => {
    setSelections((prev) => {
      const next = new Map(prev);
      for (const shard of shards) {
        const needed = maxQuantityForRarity(shard.rarity) - (ownedAttributes.get(shard.id) ?? 0);
        if (needed > 0) next.set(shard.id, needed);
        else next.delete(shard.id);
      }
      return next;
    });
  };

  const handleDone = () => {
    const shardsById = new Map(shards.map((shard) => [shard.id, shard]));
    onDone(Array.from(selections, ([key, quantity]) => ({ shard: shardsById.get(key)!, quantity })).filter((item) => item.shard));
  };

  const totalSelected = Array.from(selections.values()).reduce((sum, qty) => sum + qty, 0);
  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      labelledBy="multi-select-shard-title"
      panelClassName="bg-slate-800 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] sm:max-h-[85vh] flex flex-col border border-slate-700"
      backdropClassName="bg-black/60 p-2 sm:p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div>
          <h2 id="multi-select-shard-title" className="text-xl font-bold text-white">
            Select Shards
          </h2>
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
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search shards..." className={MODAL_SEARCH_INPUT} autoFocus />
          <RarityFilter value={rarityFilter} onChange={setRarityFilter} />
          <ResetFiltersButton
            onClick={() => {
              setSearchQuery("");
              setRarityFilter("all");
            }}
          />
        </div>
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>
            Showing {filteredShards.length} of {shards.length} shards
          </span>
          <ToggleSwitch label="Show Selected First" checked={showSelectedFirst} onChange={setShowSelectedFirst} />
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
                onClick={() => toggleShard(shard)}
                className={`flex items-center gap-2 p-2.5 rounded-lg transition-all duration-300 border cursor-pointer ${
                  isSelected
                    ? "bg-blue-500/20 border-blue-500/50 hover:border-blue-500/70"
                    : "bg-slate-700/30 hover:bg-slate-700/60 border border-slate-600/50 hover:border-slate-500"
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
          <button
            onClick={() => setSelections(new Map())}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
            disabled={selections.size === 0}
          >
            Clear All
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">
            Total: {totalSelected} shard{totalSelected !== 1 ? "s" : ""}
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
