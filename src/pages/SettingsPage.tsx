import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, RotateCcw, Save, Filter, ChevronDown, Layers } from "lucide-react";
import { useShardsWithRecipes } from "../hooks/useShardsWithRecipes";
import { useCustomRates } from "../hooks/useCustomRates";
import { getRarityColor } from "../utils";

interface RarityDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

const RarityDropdown: React.FC<RarityDropdownProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const rarities = [
    { value: "all", label: "All Rarities" },
    { value: "common", label: "Common" },
    { value: "uncommon", label: "Uncommon" },
    { value: "rare", label: "Rare" },
    { value: "epic", label: "Epic" },
    { value: "legendary", label: "Legendary" },
  ];

  useEffect(() => {
    if (isOpen && buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen, buttonRef]);

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

  const currentRarity = rarities.find((r) => r.value === value);

  return (
    <>
      <div className="relative rarity-dropdown">
        <button
          ref={setButtonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="
            flex items-center justify-between space-x-2 px-3 py-2.5 min-w-[160px]
            bg-gradient-to-r from-purple-500/10 to-blue-500/10 backdrop-blur-xl 
            border border-purple-500/20 hover:border-purple-400/30
            rounded-xl text-white shadow-lg hover:shadow-purple-500/20
            focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50
            hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-blue-500/20 
            transition-all duration-300 ease-out
            hover:scale-[1.02] active:scale-[0.98]
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
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="dropdown-portal fixed z-[9999] bg-gradient-to-b from-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-purple-500/20 rounded-xl shadow-2xl shadow-purple-500/10"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: Math.max(dropdownPosition.width, 160),
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
                  hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-purple-400/20 
                  transition-all duration-200 ease-out
                  ${value === rarity.value ? "bg-gradient-to-r from-purple-500/30 to-purple-400/30 text-purple-200 shadow-inner" : "text-white hover:text-purple-200"}
                  ${rarity !== rarities[rarities.length - 1] ? "border-b border-purple-500/10" : ""}
                  ${rarity === rarities[0] ? "rounded-t-xl" : ""}
                  ${rarity === rarities[rarities.length - 1] ? "rounded-b-xl" : ""}
                `}
              >
                {rarity.label}
              </button>
            ))}
          </motion.div>,
          document.body
        )}
    </>
  );
};

interface TypeDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

const TypeDropdown: React.FC<TypeDropdownProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const types = [
    { value: "all", label: "All Types" },
    { value: "direct", label: "Direct" },
    { value: "fuse", label: "Fuse" },
  ];

  useEffect(() => {
    if (isOpen && buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen, buttonRef]);

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

  const currentType = types.find((t) => t.value === value);

  return (
    <>
      <div className="relative type-dropdown">
        <button
          ref={setButtonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="
            flex items-center justify-between space-x-2 px-3 py-2.5 min-w-[140px]
            bg-gradient-to-r from-emerald-500/10 to-teal-500/10 backdrop-blur-xl 
            border border-emerald-500/20 hover:border-emerald-400/30
            rounded-xl text-white shadow-lg hover:shadow-emerald-500/20
            focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
            hover:bg-gradient-to-r hover:from-emerald-500/20 hover:to-teal-500/20 
            transition-all duration-300 ease-out
            hover:scale-[1.02] active:scale-[0.98]
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
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="type-dropdown-portal fixed z-[9999] bg-gradient-to-b from-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-emerald-500/20 rounded-xl shadow-2xl shadow-emerald-500/10"
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
                  hover:bg-gradient-to-r hover:from-emerald-500/20 hover:to-emerald-400/20 
                  transition-all duration-200 ease-out
                  ${value === type.value ? "bg-gradient-to-r from-emerald-500/30 to-emerald-400/30 text-emerald-200 shadow-inner" : "text-white hover:text-emerald-200"}
                  ${type !== types[types.length - 1] ? "border-b border-emerald-500/10" : ""}
                  ${type === types[0] ? "rounded-t-xl" : ""}
                  ${type === types[types.length - 1] ? "rounded-b-xl" : ""}
                `}
              >
                {type.label}
              </button>
            ))}
          </motion.div>,
          document.body
        )}
    </>
  );
};

export const SettingsPage: React.FC = () => {
  const { shards, loading: shardsLoading } = useShardsWithRecipes();
  const { customRates, defaultRates, updateRate, resetRates } = useCustomRates();
  const [filter, setFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [hasChanges, setHasChanges] = useState(false);

  const filteredShards = shards.filter((shard) => {
    const matchesSearch = shard.name.toLowerCase().includes(filter.toLowerCase());
    const matchesRarity = rarityFilter === "all" || shard.rarity === rarityFilter;
    const matchesType = typeFilter === "all" || (typeFilter === "direct" && shard.isDirect) || (typeFilter === "fuse" && !shard.isDirect);
    return matchesSearch && matchesRarity && matchesType;
  });

  const handleRateChange = (shardId: string, newRate: number) => {
    updateRate(shardId, newRate);
    setHasChanges(true);
  };

  const handleResetRates = () => {
    if (confirm("Are you sure you want to reset all rates to their defaults? This will clear all custom rates.")) {
      resetRates();
      setHasChanges(false);
    }
  };

  const handleSave = () => {
    // Rates are automatically saved to localStorage in the hook
    setHasChanges(false);
  };

  if (shardsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col space-y-4 py-4">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">Custom Shard Rates</h1>
        <p className="text-slate-400">Customize gathering rates for more accurate calculations</p>
      </motion.div>

      {/* Controls */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 overflow-visible">
        <div className="flex flex-col lg:flex-row gap-3 overflow-visible">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search shards..."
              className="
                w-full pl-10 pr-4 py-2.5 
                bg-white/5 backdrop-blur-xl 
                border border-white/10 
                rounded-xl text-white placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50
                transition-all duration-200
              "
            />
          </div>

          {/* Rarity Filter */}
          <RarityDropdown value={rarityFilter} onChange={setRarityFilter} />

          {/* Type Filter */}
          <TypeDropdown value={typeFilter} onChange={setTypeFilter} />

          {/* Action Buttons */}
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleResetRates}
              className="
                px-3 py-2.5 bg-red-500/20 hover:bg-red-500/30 
                text-red-400 font-medium rounded-xl 
                border border-red-500/20 hover:border-red-500/30
                transition-all duration-200
                flex items-center space-x-2
              "
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </motion.button>

            {hasChanges && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                className="
                  px-3 py-2.5 bg-green-500/20 hover:bg-green-500/30 
                  text-green-400 font-medium rounded-xl 
                  border border-green-500/20 hover:border-green-500/30
                  transition-all duration-200
                  flex items-center space-x-2
                "
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </motion.button>
            )}
          </div>
        </div>

        <div className="mt-3 text-sm text-slate-400">
          <p>
            Base rates (shards/hour) • Showing {filteredShards.length} of {shards.length} shards
          </p>
        </div>
      </motion.div>

      {/* Shards List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden flex-1"
      >
        <div className="h-full overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2 p-3">
            {filteredShards.map((shard, index) => (
              <motion.div
                key={shard.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.01, 0.3) }}
                className="
                  bg-white/5 border border-white/10 rounded-lg p-3
                  hover:bg-white/10 transition-all duration-200
                "
              >
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
                      value={customRates[shard.key] || defaultRates[shard.key] || 0}
                      onChange={(e) => handleRateChange(shard.key, parseFloat(e.target.value) || 0)}
                      className="
                        w-full px-2 py-1.5 text-sm text-center
                        bg-white/5 border border-white/10 rounded-lg
                        text-white placeholder-slate-400
                        focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50
                        transition-all duration-200
                      "
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {filteredShards.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Shards Found</h3>
          <p className="text-slate-400">Try adjusting your search or filter criteria</p>
        </motion.div>
      )}
    </div>
  );
};
