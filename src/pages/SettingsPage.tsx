import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, RotateCcw, Save, Filter, ChevronDown, Layers } from "lucide-react";
import { useShardsWithRecipes, type ShardWithDirectInfo } from "../hooks/useShardsWithRecipes";
import { useCustomRates } from "../hooks/useCustomRates";
import { getRarityColor } from "../utils";
import { debounce } from "../utils";

interface RarityDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

const RarityDropdown: React.FC<RarityDropdownProps> = React.memo(({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const rarities = useMemo(
    () => [
      { value: "all", label: "All Rarities" },
      { value: "common", label: "Common" },
      { value: "uncommon", label: "Uncommon" },
      { value: "rare", label: "Rare" },
      { value: "epic", label: "Epic" },
      { value: "legendary", label: "Legendary" },
    ],
    []
  );

  const updatePosition = useCallback(() => {
    if (isOpen && buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen, buttonRef]);

  useEffect(updatePosition, [updatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".rarity-dropdown") && !target.closest(".dropdown-portal")) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const currentRarity = useMemo(() => rarities.find((r) => r.value === value), [rarities, value]);

  return (
    <>
      <div className="relative rarity-dropdown">
        <button
          ref={setButtonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="
            flex items-center justify-between space-x-2 px-3 py-2.5 min-w-[140px]
            bg-purple-500/10 border border-purple-500/20 hover:border-purple-400/30
            rounded-md text-white hover:bg-purple-500/20 
            transition-colors duration-200 cursor-pointer
          "
        >
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-purple-400" />
            <span className="font-medium">{currentRarity?.label || "All Rarities"}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-purple-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isOpen &&
        createPortal(
          <div
            className="dropdown-portal fixed z-[9999] bg-slate-800/95 backdrop-blur-sm border border-purple-500/20 rounded-md shadow-2xl"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: Math.max(dropdownPosition.width, 140),
            }}
          >
            {rarities.map((rarity) => (
              <button
                key={rarity.value}
                type="button"
                onClick={() => {
                  onChange(rarity.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-4 py-3 text-sm text-left font-medium
                  hover:bg-purple-500/20 transition-colors duration-200
                  ${value === rarity.value ? "bg-purple-500/30 text-purple-200" : "text-white hover:text-purple-200"}
                  ${rarity !== rarities[rarities.length - 1] ? "border-b border-purple-500/10" : ""}
                  ${rarity === rarities[0] ? "rounded-t-md" : ""}
                  ${rarity === rarities[rarities.length - 1] ? "rounded-b-md" : ""}
                `}
              >
                {rarity.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
});

interface TypeDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

const TypeDropdown: React.FC<TypeDropdownProps> = React.memo(({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const types = useMemo(
    () => [
      { value: "all", label: "All Types" },
      { value: "direct", label: "Direct" },
      { value: "fuse", label: "Fuse" },
    ],
    []
  );

  const updatePosition = useCallback(() => {
    if (isOpen && buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen, buttonRef]);

  useEffect(updatePosition, [updatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".type-dropdown") && !target.closest(".type-dropdown-portal")) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const currentType = useMemo(() => types.find((t) => t.value === value), [types, value]);

  return (
    <>
      <div className="relative type-dropdown">
        <button
          ref={setButtonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="
            flex items-center justify-between space-x-2 px-3 py-2.5 min-w-[140px]
            bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-400/30
            rounded-md text-white hover:bg-emerald-500/20
            transition-colors duration-200 cursor-pointer
          "
        >
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <span className="font-medium">{currentType?.label || "All Types"}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-emerald-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isOpen &&
        createPortal(
          <div
            className="type-dropdown-portal fixed z-[9999] bg-slate-800/95 border border-emerald-500/20 rounded-md shadow-2xl"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: Math.max(dropdownPosition.width, 140),
            }}
          >
            {types.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => {
                  onChange(type.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-4 py-3 text-sm text-left font-medium
                  hover:bg-emerald-500/20 transition-colors duration-200
                  ${value === type.value ? "bg-emerald-500/30 text-emerald-200" : "text-white hover:text-emerald-200"}
                  ${type !== types[types.length - 1] ? "border-b border-emerald-500/10" : ""}
                  ${type === types[0] ? "rounded-t-md" : ""}
                  ${type === types[types.length - 1] ? "rounded-b-md" : ""}
                `}
              >
                {type.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
});

// Memoized shard item component
interface ShardItemProps {
  shard: ShardWithDirectInfo;
  rate: number;
  onRateChange: (shardId: string, newRate: number) => void;
}

const ShardItem: React.FC<ShardItemProps> = React.memo(({ shard, rate, onRateChange }) => {
  const handleRateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onRateChange(shard.key, parseFloat(e.target.value) || 0);
    },
    [shard.key, onRateChange]
  );

  return (
    <div className="bg-white/5 border border-white/10 rounded-md p-3 hover:bg-white/10 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <div className={`font-medium text-sm ${getRarityColor(shard.rarity)} truncate`}>{shard.name}</div>
            {shard.isDirect ? (
              <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full flex-shrink-0">Direct</span>
            ) : (
              <span className="px-1.5 py-0.5 text-xs bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 rounded-full flex-shrink-0">Fuse</span>
            )}
          </div>
          <div className="text-xs text-slate-400 truncate">
            {shard.type} • {shard.family}
          </div>
        </div>

        <div className="w-20 ml-2">
          <input
            type="number"
            min="0"
            step="0.01"
            value={rate}
            onChange={handleRateChange}
            className="
              w-full px-2 py-1.5 text-sm text-center
              bg-white/5 border border-white/10 rounded-md
              text-white placeholder-slate-400
              focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50
              transition-colors duration-200
            "
          />
        </div>
      </div>
    </div>
  );
});

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
