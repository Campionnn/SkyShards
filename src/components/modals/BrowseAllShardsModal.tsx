import { useEffect, useMemo, useState } from "react";
import { Modal } from "../ui";
import { X, Search } from "lucide-react";
import { getRarityColor, shardIconUrl } from "../../utilities";
import type { Shard } from "../../types/types";
import { RarityFilter, ResetFiltersButton, SearchInput } from "./shardPicker";
import { MODAL_SEARCH_INPUT, searchShards } from "./shardSearch";

interface BrowseAllShardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shards: Shard[];
  onSelectShard: (shard: Shard) => void;
}

export const BrowseAllShardsModal = ({ isOpen, onClose, shards, onSelectShard }: BrowseAllShardsModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");

  useEffect(() => {
    if (!isOpen) setSearchQuery("");
  }, [isOpen]);

  const filteredShards = useMemo(() => searchShards(shards, searchQuery, rarityFilter), [shards, searchQuery, rarityFilter]);

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      labelledBy="browse-all-shards-title"
      panelClassName="bg-slate-800 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] sm:max-h-[85vh] flex flex-col border border-slate-700"
      backdropClassName="bg-black/60 p-2 sm:p-4"
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h2 id="browse-all-shards-title" className="text-xl font-bold text-white">
          Browse All Shards
        </h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer" aria-label="Close modal">
          <X className="w-6 h-6" />
        </button>
      </div>

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
        <div className="text-sm text-slate-400">
          Showing {filteredShards.length} of {shards.length} shards
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {filteredShards.map((shard) => (
            <button
              key={shard.id}
              onClick={() => {
                onSelectShard(shard);
                onClose();
              }}
              className="flex items-center gap-2 p-2.5 bg-slate-700/30 hover:bg-slate-700/60 border border-slate-600/50 hover:border-slate-500 rounded-lg transition-all duration-300 text-left group cursor-pointer"
            >
              <img src={shardIconUrl(shard.id)} alt={shard.name} className="w-7 h-7 object-contain flex-shrink-0" loading="lazy" />
              <div className="min-w-0 flex-1">
                <div className={`font-medium text-sm truncate ${getRarityColor(shard.rarity)}`}>{shard.name}</div>
                <div className="text-xs text-slate-400 truncate">
                  {shard.id} • {shard.family} • {shard.type}
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
    </Modal>
  );
};
