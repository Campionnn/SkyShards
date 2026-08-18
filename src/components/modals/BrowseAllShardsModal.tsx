import React, { useState, useMemo, useEffect, useRef } from "react";
import { Modal } from "../ui";
import { X, Search, Filter, ChevronDown, RotateCcw, Package, ArrowUpDown, Sparkles } from "lucide-react";
import {
  DEFAULT_FILTER_CONFIG,
  filterShards,
  getRarityColor,
  getShardSearchText,
  resolveMinecraftColor,
  shardIconUrl,
  sortByShardKey,
  sortShardsByNameWithPrefixAwareness,
} from "../../utilities";
import { SHARD_DESCRIPTIONS, MAX_QUANTITIES } from "../../constants";
import { ShardDescription } from "../ui/ShardDescription";
import { StatGlyph } from "../ui/StatGlyph";
import type { Shard } from "../../types/types";

interface BrowseAllShardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shards: Shard[];
  onSelectShard: (shard: Shard) => void;
  /** Shards already fused into that shard's attribute, keyed by shard id. Drives the progress badge, "My Shards" filter, and "Closest to Finishing" sort. */
  ownedAttributes?: Map<string, number>;
}

type SortMode = "default" | "closest";

function maxQuantityFor(shard: Shard): number {
  const rarityKey = shard.rarity.toLowerCase() as keyof typeof MAX_QUANTITIES;
  return MAX_QUANTITIES[rarityKey] ?? MAX_QUANTITIES.common;
}

// Mirrors InventoryManagementModal's attributes tab exactly (same field, same
// MAX_QUANTITIES comparison) so this badge can never disagree with "My Shards".
function ownedCountFor(shardId: string, ownedAttributes?: Map<string, number>): number {
  return ownedAttributes?.get(shardId) ?? 0;
}

// Every stat actually granted by at least one shard's description, so the filter never
// offers a choice that yields zero results. `glyph` and `color` are pulled directly from
// how that stat is actually rendered in-game (src/desc.json's description segments) —
// the same private-use-area icon font and Minecraft color codes ShardDescription uses,
// not a guessed icon. Wisdom stats use the game's literal "☯" glyph, which isn't in the
// PUA icon font; StatGlyph renders it as plain text since it has no GLYPH_MAP entry.
const STAT_OPTIONS: { name: string; color: string; glyph: string }[] = [
  { name: "Attack Speed", color: "yellow", glyph: "" },
  { name: "Block Fortune", color: "gold", glyph: "" },
  { name: "Bonus Pest Chance", color: "dark_green", glyph: "" },
  { name: "Cold Resistance", color: "aqua", glyph: "" },
  { name: "Combat Wisdom", color: "dark_aqua", glyph: "☯" },
  { name: "Crit Damage", color: "blue", glyph: "" },
  { name: "Defense", color: "green", glyph: "" },
  { name: "Enchanting Wisdom", color: "dark_aqua", glyph: "☯" },
  { name: "Farming Fortune", color: "gold", glyph: "" },
  { name: "Farming Wisdom", color: "dark_aqua", glyph: "☯" },
  { name: "Fishing Speed", color: "aqua", glyph: "" },
  { name: "Fishing Wisdom", color: "dark_aqua", glyph: "☯" },
  { name: "Foraging Fortune", color: "gold", glyph: "" },
  { name: "Foraging Wisdom", color: "dark_aqua", glyph: "☯" },
  { name: "Gemstone Spread", color: "yellow", glyph: "" },
  { name: "Health", color: "red", glyph: "" },
  { name: "Health Regen", color: "red", glyph: "" },
  { name: "Heat Resistance", color: "red", glyph: "" },
  { name: "Hunting Fortune", color: "light_purple", glyph: "" },
  { name: "Hunting Wisdom", color: "dark_aqua", glyph: "☯" },
  { name: "Intelligence", color: "aqua", glyph: "" },
  { name: "Magic Find", color: "aqua", glyph: "" },
  { name: "Mining Fortune", color: "gold", glyph: "" },
  { name: "Mining Speed", color: "gold", glyph: "" },
  { name: "Mining Spread", color: "yellow", glyph: "" },
  { name: "Mining Wisdom", color: "dark_aqua", glyph: "☯" },
  { name: "Ore Fortune", color: "gold", glyph: "" },
  { name: "Respiration", color: "dark_aqua", glyph: "" },
  { name: "Sea Creature Chance", color: "dark_aqua", glyph: "" },
  { name: "Social Wisdom", color: "dark_aqua", glyph: "☯" },
  { name: "Speed", color: "white", glyph: "" },
  { name: "Strength", color: "red", glyph: "" },
  { name: "Sweep", color: "dark_green", glyph: "" },
  { name: "Taming Wisdom", color: "dark_aqua", glyph: "☯" },
  { name: "Tracking", color: "light_purple", glyph: "" },
  { name: "Trophy Chance", color: "gold", glyph: "" },
  { name: "True Defense", color: "white", glyph: "" },
  { name: "Vitality", color: "dark_red", glyph: "" },
];

const StatIcon: React.FC<{ stat: { color: string; glyph: string } }> = ({ stat }) => (
  <span className="inline-flex items-center justify-center flex-shrink-0 text-base leading-none" style={{ color: resolveMinecraftColor(stat.color) }}>
    <StatGlyph char={stat.glyph} />
  </span>
);

export const BrowseAllShardsModal: React.FC<BrowseAllShardsModalProps> = ({ isOpen, onClose, shards, onSelectShard, ownedAttributes }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [statFilter, setStatFilter] = useState("all");
  const [statSearchQuery, setStatSearchQuery] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [isRarityDropdownOpen, setIsRarityDropdownOpen] = useState(false);
  const [isStatDropdownOpen, setIsStatDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const rarityDropdownRef = useRef<HTMLDivElement>(null);
  const statDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const hasOwnedData = !!ownedAttributes && ownedAttributes.size > 0;

  const sortOptions: { value: SortMode; label: string }[] = [
    { value: "default", label: "Default" },
    { value: "closest", label: "Closest to Finishing" },
  ];
  const currentSort = sortOptions.find((s) => s.value === sortMode) || sortOptions[0];

  const rarityOptions = [
    { value: "all", label: "All Rarities", color: "text-violet-400" },
    { value: "common", label: "Common", color: "text-white" },
    { value: "uncommon", label: "Uncommon", color: "text-green-400" },
    { value: "rare", label: "Rare", color: "text-blue-400" },
    { value: "epic", label: "Epic", color: "text-purple-400" },
    { value: "legendary", label: "Legendary", color: "text-yellow-400" },
  ];

  const currentRarity = rarityOptions.find((r) => r.value === rarityFilter) || rarityOptions[0];
  const currentStat = STAT_OPTIONS.find((s) => s.name === statFilter);
  const filteredStatOptions = statSearchQuery.trim()
    ? STAT_OPTIONS.filter((s) => s.name.toLowerCase().includes(statSearchQuery.trim().toLowerCase()))
    : STAT_OPTIONS;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rarityDropdownRef.current && !rarityDropdownRef.current.contains(event.target as Node)) {
        setIsRarityDropdownOpen(false);
      }
      if (statDropdownRef.current && !statDropdownRef.current.contains(event.target as Node)) {
        setIsStatDropdownOpen(false);
        setStatSearchQuery("");
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };

    if (isRarityDropdownOpen || isStatDropdownOpen || isSortDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isRarityDropdownOpen, isStatDropdownOpen, isSortDropdownOpen]);

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setOwnedOnly(false);
      setStatFilter("all");
      setStatSearchQuery("");
      setSortMode("default");
    }
  }, [isOpen]);

  const filteredShards = useMemo(() => {
    // Apply filters using centralized function
    let filtered = filterShards(shards, {
      query: searchQuery,
      rarity: rarityFilter,
      searchConfig: DEFAULT_FILTER_CONFIG,
    });

    if (statFilter !== "all") {
      const needle = statFilter.toLowerCase();
      filtered = filtered.filter((shard) => getShardSearchText(shard.id).includes(needle));
    }

    if (ownedOnly) {
      filtered = filtered.filter((shard) => ownedCountFor(shard.id, ownedAttributes) > 0);
    }

    // "Closest to finishing" ranks by how close each shard is to its max stack (owned/max),
    // pushing already-maxed shards to the bottom since there's nothing left to finish there.
    if (sortMode === "closest") {
      return filtered.sort((a, b) => {
        const aOwned = ownedCountFor(a.id, ownedAttributes);
        const bOwned = ownedCountFor(b.id, ownedAttributes);
        const aMax = maxQuantityFor(a);
        const bMax = maxQuantityFor(b);
        const aComplete = aOwned >= aMax;
        const bComplete = bOwned >= bMax;
        const aFrac = aComplete ? -1 : aOwned / aMax;
        const bFrac = bComplete ? -1 : bOwned / bMax;

        if (aFrac !== bFrac) return bFrac - aFrac;

        const aRemaining = aMax - aOwned;
        const bRemaining = bMax - bOwned;
        if (aRemaining !== bRemaining) return aRemaining - bRemaining;

        return sortShardsByNameWithPrefixAwareness(a, b);
      });
    }

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
  }, [shards, searchQuery, rarityFilter, statFilter, ownedOnly, ownedAttributes, sortMode]);

  const handleSelectShard = (shard: Shard) => {
    onSelectShard(shard);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal open={isOpen} onClose={onClose} labelledBy="browse-all-shards-title" panelClassName="bg-slate-800 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] sm:max-h-[85vh] flex flex-col border border-slate-700" backdropClassName="bg-black/60 p-2 sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h2 id="browse-all-shards-title" className="text-xl font-bold text-white">Browse All Shards</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer" aria-label="Close modal">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Search and Filters */}
      <div className="p-4 border-b border-slate-700 space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
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

          {/* Stat Filter Dropdown */}
          <div className="relative" ref={statDropdownRef}>
            <button
              type="button"
              onClick={() => setIsStatDropdownOpen(!isStatDropdownOpen)}
              className={`flex items-center justify-between gap-2 px-3 py-2 h-[42px] min-w-[150px] rounded-md border transition-colors cursor-pointer ${
                statFilter !== "all"
                  ? "bg-teal-500/20 border-teal-400/40 text-teal-300"
                  : "bg-teal-500/10 border-teal-500/20 text-teal-400 hover:border-teal-400/30 hover:bg-teal-500/20"
              }`}
              title="Filter shards by the stat they grant"
            >
              <div className="flex items-center gap-2 min-w-0">
                {currentStat ? <StatIcon stat={currentStat} /> : <Sparkles className="w-4 h-4 flex-shrink-0" />}
                <span className="text-sm font-medium truncate">{statFilter === "all" ? "All Stats" : statFilter}</span>
              </div>
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isStatDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isStatDropdownOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-slate-800 border border-teal-500/20 rounded-md shadow-xl z-50 flex flex-col">
                <div className="p-2 border-b border-slate-700">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={statSearchQuery}
                      onChange={(e) => setStatSearchQuery(e.target.value)}
                      placeholder="Find a stat..."
                      autoFocus
                      className="w-full pl-8 pr-2 py-1.5 text-sm bg-slate-700/50 border border-slate-600/50 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50"
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setStatFilter("all");
                      setIsStatDropdownOpen(false);
                      setStatSearchQuery("");
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left font-medium transition-colors cursor-pointer ${
                      statFilter === "all" ? "bg-teal-500/30 text-teal-300" : "text-teal-400 hover:bg-teal-500/10 hover:brightness-125"
                    }`}
                  >
                    <Sparkles className="w-4 h-4 flex-shrink-0" />
                    All Stats
                  </button>
                  {filteredStatOptions.map((stat) => (
                    <button
                      key={stat.name}
                      type="button"
                      onClick={() => {
                        setStatFilter(stat.name);
                        setIsStatDropdownOpen(false);
                        setStatSearchQuery("");
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left font-medium transition-colors cursor-pointer ${
                        statFilter === stat.name ? "bg-teal-500/30 text-teal-300" : "text-slate-300 hover:bg-teal-500/10 hover:text-white"
                      }`}
                    >
                      <StatIcon stat={stat} />
                      {stat.name}
                    </button>
                  ))}
                  {filteredStatOptions.length === 0 && <div className="px-3 py-4 text-sm text-slate-500 text-center">No stats match "{statSearchQuery}"</div>}
                </div>
              </div>
            )}
          </div>

          {/* My Shards Filter */}
          {hasOwnedData && (
            <button
              type="button"
              onClick={() => setOwnedOnly((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 h-[42px] text-sm font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                ownedOnly
                  ? "bg-emerald-500/30 border-emerald-400/50 text-emerald-300"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:border-emerald-400/30 hover:bg-emerald-500/20"
              }`}
              title="Only show shards you currently own"
            >
              <Package className="w-4 h-4" />
              My Shards
            </button>
          )}

          {/* Sort Dropdown */}
          {hasOwnedData && (
            <div className="relative" ref={sortDropdownRef}>
              <button
                type="button"
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className={`flex items-center justify-between gap-2 px-3 py-2 h-[42px] min-w-[190px] rounded-md border transition-colors cursor-pointer ${
                  sortMode !== "default"
                    ? "bg-amber-500/20 border-amber-400/40 text-amber-300"
                    : "bg-slate-700/50 border-slate-600/50 text-slate-300 hover:border-slate-500/50 hover:bg-slate-700/70"
                }`}
                title="Sort shards"
              >
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="text-sm font-medium">{currentSort.label}</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${isSortDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isSortDropdownOpen && (
                <div className="absolute right-0 mt-1 w-52 bg-slate-800 border border-slate-600 rounded-md shadow-xl z-50 overflow-hidden">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSortMode(option.value);
                        setIsSortDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-sm text-left font-medium transition-colors cursor-pointer ${
                        sortMode === option.value ? "bg-amber-500/20 text-amber-300" : "text-slate-300 hover:bg-slate-700/70 hover:text-white"
                      }`}
                      title={option.value === "closest" ? "Sort by how close each shard is to its max stack" : undefined}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reset Filter Button */}
          <button
            onClick={() => {
              setSearchQuery("");
              setRarityFilter("all");
              setStatFilter("all");
              setOwnedOnly(false);
              setSortMode("default");
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {filteredShards.map((shard) => {
            const desc = SHARD_DESCRIPTIONS[shard.id as keyof typeof SHARD_DESCRIPTIONS];
            const owned = ownedCountFor(shard.id, ownedAttributes);
            const maxQty = hasOwnedData ? maxQuantityFor(shard) : 0;
            const isComplete = hasOwnedData && owned >= maxQty;
            return (
              <button
                key={shard.id}
                onClick={() => handleSelectShard(shard)}
                className="flex flex-col p-2.5 bg-slate-700/30 hover:bg-slate-700/60 border border-slate-600/50 hover:border-slate-500 rounded-lg transition-all duration-300 text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <img src={shardIconUrl(shard.id)} alt={shard.name} className="w-7 h-7 object-contain flex-shrink-0" loading="lazy" />
                  <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                    <div className={`font-medium text-sm truncate ${getRarityColor(shard.rarity)}`}>{shard.name}</div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {hasOwnedData && (
                        <span
                          className={`text-[10px] font-semibold rounded px-1.5 py-0.5 border ${
                            isComplete
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          }`}
                          title={isComplete ? "Maxed out" : `${maxQty - owned} more to max`}
                        >
                          {isComplete ? "Maxed" : `${owned}/${maxQty}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="pl-9">
                  <div className="text-xs text-slate-400 truncate mt-1.5">
                    {shard.id} • {shard.family} • {shard.type}
                  </div>
                  <div className="text-xs text-slate-300 mt-1 line-clamp-2 leading-snug">
                    <ShardDescription record={desc} showHowToHunt={false} fallback="No effect description available." />
                  </div>
                </div>
              </button>
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
    </Modal>
  );
};
