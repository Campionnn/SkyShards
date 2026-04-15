import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Search, Package, RefreshCw, User, ChevronDown, AlertTriangle, Check, Filter, RotateCcw, Eye, EyeOff, Trash2 } from "lucide-react";
import { hypixelService } from "../../services";
import type { HypixelProfileResponse, ProfileData } from "../../services";
import { useShards } from "../../hooks";
import { loadHypixelProfileMeta, saveHypixelProfileMeta, clearHypixelProfileMeta, clearDisabledShards, filterShards, DEFAULT_FILTER_CONFIG, sortByShardKey, sortShardsByNameWithPrefixAwareness } from "../../utilities";
import type { HypixelProfileMeta } from "../../utilities";
import { SHARD_DESCRIPTIONS, MAX_QUANTITIES, ATTRIBUTE_TIER_TO_SHARD_COUNT, fusedCountToTierLevel } from "../../constants";

interface InventoryManagementModalProps {
  open: boolean;
  onClose: () => void;
  inventory: Map<string, number>;
  ownedAttributes: Map<string, number>;
  onInventoryChange: (inventory: Map<string, number>) => void;
  onOwnedAttributesChange: (attributes: Map<string, number>) => void;
  disabledShards: Set<string>;
  onDisabledShardsChange: (disabled: Set<string>) => void;
  onShardClick?: (shardKey: string) => void;
  onShardLevelsImport?: (levels: {
    newtLevel?: number;
    salamanderLevel?: number;
    lizardKingLevel?: number;
    leviathanLevel?: number;
    pythonLevel?: number;
    kingCobraLevel?: number;
    seaSerpentLevel?: number;
    tiamatLevel?: number;
    crocodileLevel?: number;
  }) => void;
}

type TabType = "shards" | "attributes";

const RARITY_OPTIONS = [
  { value: "all",       label: "All Rarities", color: "text-violet-400" },
  { value: "common",    label: "Common",        color: "text-white" },
  { value: "uncommon",  label: "Uncommon",      color: "text-green-400" },
  { value: "rare",      label: "Rare",          color: "text-blue-400" },
  { value: "epic",      label: "Epic",          color: "text-purple-400" },
  { value: "legendary", label: "Legendary",     color: "text-yellow-400" },
];

export const InventoryManagementModal: React.FC<InventoryManagementModalProps> = ({
  open,
  onClose,
  inventory,
  ownedAttributes,
  onInventoryChange,
  onOwnedAttributesChange,
  disabledShards,
  onDisabledShardsChange,
  onShardClick,
  onShardLevelsImport,
}) => {
  const { shards } = useShards();
  const [activeTab, setActiveTab] = useState<TabType>("shards");

  // Shards tab filter state
  const [shardsQuery, setShardsQuery] = useState("");
  const [shardsRarity, setShardsRarity] = useState("all");
  const [shardsRarityOpen, setShardsRarityOpen] = useState(false);
  const shardsRarityRef = useRef<HTMLDivElement>(null);

  // Attributes tab filter state
  const [attrsQuery, setAttrsQuery] = useState("");
  const [attrsRarity, setAttrsRarity] = useState("all");
  const [attrsRarityOpen, setAttrsRarityOpen] = useState(false);
  const attrsRarityRef = useRef<HTMLDivElement>(null);
  const [attrsLockFilter, setAttrsLockFilter] = useState<"both" | "unlocked" | "capped">("both");
  const [attrsLockOpen, setAttrsLockOpen] = useState(false);
  const attrsLockRef = useRef<HTMLDivElement>(null);

  // Import state
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<HypixelProfileResponse | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // Profile metadata
  const [profileMeta, setProfileMeta] = useState<HypixelProfileMeta | null>(null);

  useEffect(() => {
    const meta = loadHypixelProfileMeta();
    setProfileMeta(meta);
    if (meta) {
      setUsername(meta.username);
    }
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setError(null);
      setImportSuccess(false);
    } else {
      document.body.style.overflow = "unset";
      setShardsQuery("");
      setAttrsQuery("");
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  // Close shards rarity dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shardsRarityRef.current && !shardsRarityRef.current.contains(e.target as Node)) {
        setShardsRarityOpen(false);
      }
    };
    if (shardsRarityOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [shardsRarityOpen]);

  // Close attributes rarity dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attrsRarityRef.current && !attrsRarityRef.current.contains(e.target as Node)) {
        setAttrsRarityOpen(false);
      }
    };
    if (attrsRarityOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [attrsRarityOpen]);

  // Close attributes lock dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attrsLockRef.current && !attrsLockRef.current.contains(e.target as Node)) {
        setAttrsLockOpen(false);
      }
    };
    if (attrsLockOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [attrsLockOpen]);

  // shards from useShards() is already ShardWithKey[]
  const shardsArray = shards ?? [];

  // Filtered + sorted shards (same logic as BrowseAllShardsModal)
  const filteredShards = useMemo(() => {
    // When no query and no rarity filter, only show inventory items
    const baseFilter = !shardsQuery.trim() && shardsRarity === "all"
      ? shardsArray.filter((s) => inventory.has(s.key))
      : filterShards(shardsArray, {
          query: shardsQuery,
          rarity: shardsRarity,
          searchConfig: DEFAULT_FILTER_CONFIG,
        });

    if (!shardsQuery.trim()) {
      return baseFilter.sort(sortByShardKey);
    }

    const lowerQuery = shardsQuery.toLowerCase();
    return baseFilter.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(lowerQuery);
      const bStarts = b.name.toLowerCase().startsWith(lowerQuery);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return sortShardsByNameWithPrefixAwareness(a, b);
    });
  }, [shards, shardsQuery, shardsRarity, inventory]);

  // Build a map from shard key (e.g. "L51") to shard name (e.g. "Scarf") for attribute search
  const shardKeyToName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of shardsArray) {
      map[s.key] = s.name;
    }
    return map;
  }, [shardsArray]);

  const attributesList = useMemo(() => {
    return Object.entries(SHARD_DESCRIPTIONS).map(([id, desc]) => {
      const prefix = id[0].toUpperCase();
      const rarity =
        prefix === "C" ? "common"
        : prefix === "U" ? "uncommon"
        : prefix === "R" ? "rare"
        : prefix === "E" ? "epic"
        : "legendary";
      return {
        id,
        rarity,
        title: (desc as { title: string }).title,
        shardName: shardKeyToName[id] ?? "",
        level: ownedAttributes.get(id) ?? 0,
      };
    }).sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      const RARITY_ORDER: Record<string, number> = { C: 0, U: 1, R: 2, E: 3, L: 4 };
      const prefixA = a.id[0], prefixB = b.id[0];
      const orderDiff = (RARITY_ORDER[prefixA] ?? 99) - (RARITY_ORDER[prefixB] ?? 99);
      if (orderDiff !== 0) return orderDiff;
      return parseInt(a.id.slice(1)) - parseInt(b.id.slice(1));
    });
  }, [ownedAttributes, shardKeyToName]);

  // Filtered attributes — search across shard name, attribute title, id, family, type, description
  const filteredAttributes = useMemo(() => {
    return attributesList.filter((attr) => {
      const maxForRarity =
        attr.rarity === "common"    ? MAX_QUANTITIES.common
        : attr.rarity === "uncommon" ? MAX_QUANTITIES.uncommon
        : attr.rarity === "rare"     ? MAX_QUANTITIES.rare
        : attr.rarity === "epic"     ? MAX_QUANTITIES.epic
        :                              MAX_QUANTITIES.legendary;
      const capped = attr.level >= maxForRarity;

      const matchesRarity = attrsRarity === "all" || attr.rarity === attrsRarity;
      const matchesLock =
        attrsLockFilter === "both"
        || (attrsLockFilter === "capped" && capped)
        || (attrsLockFilter === "unlocked" && !capped);
      if (!attrsQuery.trim()) return matchesRarity && matchesLock;
      const q = attrsQuery.toLowerCase();
      // Match against attribute title, shard key, shard name, and description fields
      const shardDesc = SHARD_DESCRIPTIONS[attr.id as keyof typeof SHARD_DESCRIPTIONS] as { title: string; description?: string } | undefined;
      const matchingShardDef = shardsArray.find((s) => s.key === attr.id);
      const matchesSearch =
        attr.title.toLowerCase().includes(q)
        || attr.id.toLowerCase().includes(q)
        || attr.shardName.toLowerCase().includes(q)
        || (matchingShardDef?.family?.toLowerCase().includes(q) ?? false)
        || (matchingShardDef?.type?.toLowerCase().includes(q) ?? false)
        || (shardDesc?.description?.toLowerCase().includes(q) ?? false);
      return matchesRarity && matchesLock && matchesSearch;
    });
  }, [attributesList, attrsQuery, attrsRarity, attrsLockFilter, shardsArray]);

  // Sort profiles by last_save (most recent first)
  const sortedProfiles = useMemo(() => {
    if (!profileData) return [];
    return [...profileData.profiles].sort((a, b) => b.profile.last_save - a.profile.last_save);
  }, [profileData]);

  // Format timestamp to readable date
  const formatDate = (timestamp: number): string => {
    if (!timestamp) return "Unknown";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString();
  };

  // Import data from a profile
  const importProfileData = (profileData: ProfileData, username: string) => {
    const newInventory = new Map<string, number>();
    for (const shard of profileData.shards) {
      if (shard.amount > 0) {
        newInventory.set(shard.id, shard.amount);
      }
    }
    
    // Auto-fill the 9 shard level shards based on attribute levels
    const shardLevelMapping = [
      { shardId: "C35", rarity: "common", formKey: "newtLevel" },
      { shardId: "U8", rarity: "uncommon", formKey: "salamanderLevel" },
      { shardId: "R8", rarity: "rare", formKey: "lizardKingLevel" },
      { shardId: "E5", rarity: "epic", formKey: "leviathanLevel" },
      { shardId: "R9", rarity: "rare", formKey: "pythonLevel" },
      { shardId: "R54", rarity: "rare", formKey: "kingCobraLevel" },
      { shardId: "E32", rarity: "epic", formKey: "seaSerpentLevel" },
      { shardId: "L6", rarity: "legendary", formKey: "tiamatLevel" },
      { shardId: "R45", rarity: "rare", formKey: "crocodileLevel" },
    ];

    console.log("Profile attributes:", profileData.attributes);
    
    const shardLevels: Record<string, number> = {};
    
    for (const { shardId, rarity, formKey } of shardLevelMapping) {
      const fusedCount = profileData.attributes.find(attr => attr.id.toUpperCase() === shardId.toUpperCase())?.level ?? 0;
      const tierLevel = fusedCountToTierLevel(fusedCount, rarity);
      console.log(`Shard ${shardId} (${rarity}): fused count = ${fusedCount}, tier level = ${tierLevel}`);
      
      // Store the tier level for the form
      console.log(`  -> Setting form level to ${tierLevel}`);
      shardLevels[formKey] = tierLevel;
    }

    // Update shard levels in the form
    if (onShardLevelsImport) {
      console.log("Updating shard levels:", shardLevels);
      onShardLevelsImport(shardLevels);
    }

    console.log("Final inventory map:", newInventory);
    onInventoryChange(newInventory);

    const newAttributes = new Map<string, number>();
    for (const attr of profileData.attributes) {
      if (attr.level > 0) {
        newAttributes.set(attr.id, attr.level);
      }
    }
    onOwnedAttributesChange(newAttributes);

    const meta: HypixelProfileMeta = {
      username: username,
      profileName: profileData.profile.cute_name,
      lastImportTime: Date.now(),
    };
    saveHypixelProfileMeta(meta);
    setProfileMeta(meta);
    setImportSuccess(true);
  };

  // Handle import button click
  const handleImport = async () => {
    if (!username.trim()) return;

    setIsLoading(true);
    setError(null);
    setImportSuccess(false);

    try {
      const data = await hypixelService.fetchPlayerProfile(username.trim());
      setProfileData(data);

      if (data.profiles.length === 0) {
        setError("No SkyBlock profiles found for this player");
        return;
      }

      const mostRecent = data.profiles.reduce((prev, curr) =>
        curr.profile.last_save > prev.profile.last_save ? curr : prev
      );
      setSelectedProfileId(mostRecent.profile.profile_id);
      importProfileData(mostRecent, data.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch profile");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle profile change from dropdown
  const handleProfileChange = (profileId: string) => {
    setSelectedProfileId(profileId);
    if (profileData) {
      const profile = profileData.profiles.find((p) => p.profile.profile_id === profileId);
      if (profile) {
        importProfileData(profile, profileData.username);
      }
    }
  };

  const handleInventoryChange = (shardId: string, value: string) => {
    const qty = parseInt(value, 10);
    const newInventory = new Map(inventory);
    if (isNaN(qty) || qty <= 0) {
      newInventory.delete(shardId);
    } else {
      newInventory.set(shardId, qty);
    }
    onInventoryChange(newInventory);
  };

  const handleNumberInputWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  const handleNumberInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
    }
  };

  const handleSelectAllShards = () => {
    const newDisabled = new Set(disabledShards);
    filteredShards.forEach((shard) => {
      newDisabled.delete(shard.key);
    });
    onDisabledShardsChange(newDisabled);
  };

  const handleClearAllShards = () => {
    const newDisabled = new Set(disabledShards);
    filteredShards.forEach((shard) => {
      newDisabled.add(shard.key);
    });
    onDisabledShardsChange(newDisabled);
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all inventory data?")) {
      onInventoryChange(new Map());
      onOwnedAttributesChange(new Map());
      onDisabledShardsChange(new Set());
      setProfileMeta(null);
      setUsername("");
      setProfileData(null);
      setSelectedProfileId(null);
      setImportSuccess(false);
      clearHypixelProfileMeta();
      clearDisabledShards();
    }
  };

  if (!open) return null;

  const shardsCurrentRarity = RARITY_OPTIONS.find((r) => r.value === shardsRarity) ?? RARITY_OPTIONS[0];
  const attrsCurrentRarity  = RARITY_OPTIONS.find((r) => r.value === attrsRarity)  ?? RARITY_OPTIONS[0];

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Inventory</h2>
            </div>
            <div className="flex items-center gap-1">
              {(inventory.size > 0 || ownedAttributes.size > 0) && (
                <button
                  onClick={handleClearAll}
                  title="Clear all inventory"
                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-5 h-5 text-red-400" />
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Import Section */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Minecraft username..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleImport()}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:border-purple-400"
                />
              </div>
              <button
                onClick={handleImport}
                disabled={!username.trim() || isLoading}
                className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 rounded-md text-purple-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Import</span>
                  </>
                )}
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-md p-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            {/* Success message with profile selector */}
            {importSuccess && profileData && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-md p-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-green-300 text-sm">
                    Imported from <span className="font-medium">{profileMeta?.profileName}</span>
                  </span>
                </div>
                {sortedProfiles.length > 1 && (
                  <div className="relative">
                    <select
                      value={selectedProfileId || ""}
                      onChange={(e) => handleProfileChange(e.target.value)}
                      className="pl-2 pr-6 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs focus:outline-none focus:border-purple-400 appearance-none cursor-pointer"
                    >
                      {sortedProfiles.map((profileData) => (
                        <option key={profileData.profile.profile_id} value={profileData.profile.profile_id}>
                          {profileData.profile.cute_name}
                          {profileData.profile.game_mode ? ` (${profileData.profile.game_mode})` : ""} -{" "}
                          {formatDate(profileData.profile.last_save)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab("shards")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === "shards"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "bg-slate-800 text-slate-400 border border-slate-600 hover:bg-slate-700"
              }`}
            >
              Shards
              {inventory.size > 0 && (
                <span className="text-xs bg-purple-500/30 px-1.5 py-0.5 rounded">{inventory.size}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("attributes")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === "attributes"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "bg-slate-800 text-slate-400 border border-slate-600 hover:bg-slate-700"
              }`}
            >
              Attributes
              {ownedAttributes.size > 0 && (
                <span className="text-xs bg-purple-500/30 px-1.5 py-0.5 rounded">{ownedAttributes.size}</span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Shards Tab */}
          {activeTab === "shards" && (
            <div className="space-y-3">
              {/* Search + rarity filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search shards..."
                    value={shardsQuery}
                    onChange={(e) => setShardsQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:border-purple-400"
                  />
                </div>

                {/* Rarity dropdown */}
                <div className="relative" ref={shardsRarityRef}>
                  <button
                    type="button"
                    onClick={() => setShardsRarityOpen(!shardsRarityOpen)}
                    className="flex items-center justify-between gap-2 px-3 py-2 h-[38px] min-w-[130px] bg-purple-500/10 border border-purple-500/20 hover:border-purple-400/30 rounded-md hover:bg-purple-500/20 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Filter className={`w-4 h-4 ${shardsCurrentRarity.color}`} />
                      <span className={`text-sm font-medium ${shardsCurrentRarity.color}`}>{shardsCurrentRarity.label}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 ${shardsCurrentRarity.color} transition-transform ${shardsRarityOpen ? "rotate-180" : ""}`} />
                  </button>
                  {shardsRarityOpen && (
                    <div className="absolute right-0 mt-1 w-44 bg-slate-800 border border-purple-500/20 rounded-md shadow-xl z-50 overflow-hidden">
                      {RARITY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setShardsRarity(opt.value); setShardsRarityOpen(false); }}
                          className={`w-full px-4 py-2 text-sm text-left font-medium transition-colors cursor-pointer ${
                            shardsRarity === opt.value ? "bg-purple-500/30 " + opt.color : opt.color + " hover:bg-purple-500/10"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reset */}
                <button
                  onClick={() => { setShardsQuery(""); setShardsRarity("all"); }}
                  title="Reset filters"
                  className="px-3 py-2 h-[38px] bg-slate-600/50 hover:bg-slate-600 border border-slate-500/50 hover:border-slate-500 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Count */}
              <div className="text-xs text-slate-400">
                {shardsQuery.trim() || shardsRarity !== "all"
                  ? `Showing ${filteredShards.length} of ${shardsArray.length} shards`
                  : `${inventory.size} shard${inventory.size !== 1 ? "s" : ""} in inventory`}
              </div>

              {filteredShards.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  {shardsQuery.trim() || shardsRarity !== "all" ? (
                    <p>No shards match your search</p>
                  ) : (
                    <>
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No shards in inventory</p>
                      <p className="text-sm mt-1">Enter your username above to import</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {filteredShards.map((shard) => {
                    const shardId = shard.key;
                    const inv = inventory.get(shardId) ?? 0;
                    const disabled = disabledShards.has(shardId);
                    const shardRarityBorder =
                      shard.rarity === "common"    ? "border-slate-500/50"
                      : shard.rarity === "uncommon" ? "border-green-500/50"
                      : shard.rarity === "rare"     ? "border-blue-500/50"
                      : shard.rarity === "epic"     ? "border-purple-500/50"
                      :                               "border-amber-500/50";

                    const shardRarityText =
                      shard.rarity === "common"    ? "text-slate-300"
                      : shard.rarity === "uncommon" ? "text-green-300"
                      : shard.rarity === "rare"     ? "text-blue-300"
                      : shard.rarity === "epic"     ? "text-purple-300"
                      :                               "text-amber-300";

                    const handleToggleDisabled = () => {
                      const next = new Set(disabledShards);
                      if (disabled) next.delete(shardId);
                      else next.add(shardId);
                      onDisabledShardsChange(next);
                    };

                    return (
                      <div key={shardId} className={`bg-slate-800/50 border ${shardRarityBorder} rounded-md p-2 space-y-2 ${disabled ? "opacity-50" : ""}`}>
                        <div className="flex items-center gap-2">
                          <img
                            src={`${import.meta.env.BASE_URL}shardIcons/${shardId}.png`}
                            alt={shard.name}
                            className="w-5 h-5 object-contain flex-shrink-0"
                            loading="lazy"
                          />
                          <span className={`text-sm font-medium flex-1 truncate ${shardRarityText}`}>{shard.name}</span>
                          <button
                            type="button"
                            onClick={handleToggleDisabled}
                            title={disabled ? "Enable shard" : "Disable shard"}
                            className="flex-shrink-0 p-0.5 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            {disabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Qty</label>
                          <input
                            type="number"
                            min="0"
                            value={inv === 0 ? "" : inv}
                            onChange={(e) => handleInventoryChange(shardId, e.target.value)}
                            onWheel={handleNumberInputWheel}
                            onKeyDown={handleNumberInputKeyDown}
                            placeholder="0"
                            className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-purple-400"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Attributes Tab */}
          {activeTab === "attributes" && (
            <div className="space-y-3">
              {/* Search + rarity filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search attributes..."
                    value={attrsQuery}
                    onChange={(e) => setAttrsQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:border-purple-400"
                  />
                </div>

                {/* Rarity dropdown */}
                <div className="relative" ref={attrsRarityRef}>
                  <button
                    type="button"
                    onClick={() => setAttrsRarityOpen(!attrsRarityOpen)}
                    className="flex items-center justify-between gap-2 px-3 py-2 h-[38px] min-w-[130px] bg-purple-500/10 border border-purple-500/20 hover:border-purple-400/30 rounded-md hover:bg-purple-500/20 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Filter className={`w-4 h-4 ${attrsCurrentRarity.color}`} />
                      <span className={`text-sm font-medium ${attrsCurrentRarity.color}`}>{attrsCurrentRarity.label}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 ${attrsCurrentRarity.color} transition-transform ${attrsRarityOpen ? "rotate-180" : ""}`} />
                  </button>
                  {attrsRarityOpen && (
                    <div className="absolute right-0 mt-1 w-44 bg-slate-800 border border-purple-500/20 rounded-md shadow-xl z-50 overflow-hidden">
                      {RARITY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setAttrsRarity(opt.value); setAttrsRarityOpen(false); }}
                          className={`w-full px-4 py-2 text-sm text-left font-medium transition-colors cursor-pointer ${
                            attrsRarity === opt.value ? "bg-purple-500/30 " + opt.color : opt.color + " hover:bg-purple-500/10"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lock filter dropdown */}
                <div className="relative" ref={attrsLockRef}>
                  <button
                    type="button"
                    onClick={() => setAttrsLockOpen(!attrsLockOpen)}
                    className="flex items-center justify-between gap-2 px-3 py-2 h-[38px] bg-purple-500/10 border border-purple-500/20 hover:border-purple-400/30 rounded-md hover:bg-purple-500/20 transition-colors cursor-pointer"
                  >
                  <span className="text-sm font-medium text-purple-300">
                    {attrsLockFilter === "both" ? "All" : attrsLockFilter === "unlocked" ? "In Progress" : "Completed"}
                  </span>
                    <ChevronDown className={`w-4 h-4 text-purple-300 transition-transform ${attrsLockOpen ? "rotate-180" : ""}`} />
                  </button>
                  {attrsLockOpen && (
                    <div className="absolute left-0 mt-1 w-40 bg-slate-800 border border-purple-500/20 rounded-md shadow-xl z-50 overflow-hidden">
                      {(["both", "unlocked", "capped"] as const).map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => { setAttrsLockFilter(val); setAttrsLockOpen(false); }}
                          className={`w-full px-4 py-2 text-sm text-left font-medium transition-colors cursor-pointer ${
                            attrsLockFilter === val
                              ? "bg-purple-500/30 text-purple-200"
                              : "text-slate-300 hover:bg-purple-500/10"
                          }`}
                        >
                          {val === "both" ? "All" : val === "unlocked" ? "In Progress" : "Completed"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reset */}
                <button
                  onClick={() => { setAttrsQuery(""); setAttrsRarity("all"); setAttrsLockFilter("both"); }}
                  title="Reset filters"
                  className="px-3 py-2 h-[38px] bg-slate-600/50 hover:bg-slate-600 border border-slate-500/50 hover:border-slate-500 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Count */}
              <div className="text-xs text-slate-400">
                Showing {filteredAttributes.length} of {attributesList.length} attributes
              </div>

              {filteredAttributes.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p>No attributes match your search</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredAttributes.map((attr) => {
                    const owned = attr.level > 0;
                    const maxForRarity =
                      attr.rarity === "common"    ? MAX_QUANTITIES.common
                      : attr.rarity === "uncommon" ? MAX_QUANTITIES.uncommon
                      : attr.rarity === "rare"     ? MAX_QUANTITIES.rare
                      : attr.rarity === "epic"     ? MAX_QUANTITIES.epic
                      :                              MAX_QUANTITIES.legendary;
                    const capped = attr.level >= maxForRarity;

                    const rarityBorder =
                      attr.rarity === "common"    ? "border-slate-500/50"
                      : attr.rarity === "uncommon" ? "border-green-500/50"
                      : attr.rarity === "rare"     ? "border-blue-500/50"
                      : attr.rarity === "epic"     ? "border-purple-500/50"
                      :                              "border-amber-500/50";

                    const rarityText =
                      attr.rarity === "common"    ? "text-slate-300"
                      : attr.rarity === "uncommon" ? "text-green-300"
                      : attr.rarity === "rare"     ? "text-blue-300"
                      : attr.rarity === "epic"     ? "text-purple-300"
                      :                              "text-amber-300";

                    const barColor =
                      attr.rarity === "common"    ? "bg-slate-400"
                      : attr.rarity === "uncommon" ? "bg-green-400"
                      : attr.rarity === "rare"     ? "bg-blue-400"
                      : attr.rarity === "epic"     ? "bg-purple-400"
                      :                              "bg-amber-400";

                    const percentage = owned
                      ? Math.min(100, Math.round((attr.level / maxForRarity) * 100))
                      : 0;

                    return (
                      <div
                        key={attr.id}
                        onClick={() => {
                          if (onShardClick) {
                            onShardClick(attr.id);
                            onClose();
                          }
                        }}
                        className={`bg-slate-800/50 border ${rarityBorder} rounded-md p-2 space-y-1.5 ${
                          !owned ? "opacity-40" : ""
                        } ${onShardClick ? "cursor-pointer hover:bg-slate-700/50 transition-colors" : ""}`}
                      >
                        {/* Icon + title row */}
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex-shrink-0">
                            <img
                              src={`${import.meta.env.BASE_URL}shardIcons/${attr.id}.png`}
                              alt={attr.title}
                              className="w-8 h-8 object-contain"
                              loading="lazy"
                            />
                            {capped && (
                              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 flex items-center justify-center">
                                <span className="text-[8px] font-bold text-slate-900">✓</span>
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className={`text-xs font-medium leading-tight ${rarityText} truncate block`}>
                              {attr.title}
                            </span>
                            {attr.shardName && (
                              <span className="text-[10px] text-slate-500 truncate block">
                                {attr.shardName}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Level + progress bar */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wide">Level</span>
                            <span className={`text-xs font-bold ${owned ? rarityText : "text-slate-500"}`}>
                              {attr.level}/{maxForRarity}
                            </span>
                          </div>
                          <div className="h-1 w-full rounded-full bg-slate-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${barColor}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-700 bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            {activeTab === "shards" ? (
              <>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAllShards}
                    className="px-4 py-2 text-sm bg-green-500/20 hover:bg-green-500/30 border border-green-500/20 hover:border-green-500/30 rounded-md text-green-400 font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={filteredShards.length === 0}
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleClearAllShards}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={filteredShards.length === 0}
                  >
                    Clear All
                  </button>
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-md text-white text-sm transition-colors cursor-pointer"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <div className="text-xs text-slate-400">
                  {profileMeta && (
                    <span>
                      Last imported: {profileMeta.username} ({profileMeta.profileName}) -{" "}
                      {new Date(profileMeta.lastImportTime).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-md text-white text-sm transition-colors cursor-pointer"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InventoryManagementModal;
