import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type WheelEvent } from "react";
import { Modal } from "../ui";
import { X, Package, RefreshCw, User, ChevronDown, AlertTriangle, Check, Eye, EyeOff, Trash2 } from "lucide-react";
import { hypixelService } from "../../services";
import type { HypixelProfileResponse, ProfileData } from "../../services";
import { useClickOutside, useShards } from "../../hooks";
import {
  clearDisabledShards,
  clearHypixelProfileMeta,
  compareShardKeys,
  getShardSearchText,
  loadHypixelProfileMeta,
  saveHypixelProfileMeta,
  shardIconUrl,
  sortByShardKey,
  type HypixelProfileMeta,
} from "../../utilities";
import { SHARD_DESCRIPTIONS, LEVELED_SHARDS, fusedCountToTierLevel, maxQuantityForRarity, type ShardLevelKey } from "../../constants";
import type { CalculationFormData } from "../../schemas";
import { RarityFilter, ResetFiltersButton, SearchInput } from "./shardPicker";
import { rarityCardStyles, searchShards } from "./shardSearch";

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
  /** The leveled shards' levels, derived from the imported profile's attributes. */
  onShardLevelsImport?: (levels: Partial<Pick<CalculationFormData, ShardLevelKey>>) => void;
}

type TabType = "shards" | "attributes";
type LockFilter = "both" | "unlocked" | "capped";

const LOCK_FILTER_LABELS: Record<LockFilter, string> = { both: "All", unlocked: "In Progress", capped: "Completed" };

const RARITY_BY_PREFIX: Record<string, string> = { C: "common", U: "uncommon", R: "rare", E: "epic" };

// Number inputs here are edited by typing only: no scroll-wheel or arrow-key nudges.
const blurOnWheel = (e: WheelEvent<HTMLInputElement>) => e.currentTarget.blur();
const blockArrowKeys = (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return !timestamp || isNaN(date.getTime()) ? "Unknown" : date.toLocaleDateString();
};

const TAB_INPUT = "w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:border-purple-400";

const TabButton = ({ active, count, onClick, children }: { active: boolean; count: number; onClick: () => void; children: string }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
      active ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "bg-slate-800 text-slate-400 border border-slate-600 hover:bg-slate-700"
    }`}
  >
    {children}
    {count > 0 && <span className="text-xs bg-purple-500/30 px-1.5 py-0.5 rounded">{count}</span>}
  </button>
);

const LockFilterDropdown = ({ value, onChange }: { value: LockFilter; onChange: (value: LockFilter) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setIsOpen(false), isOpen);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-3 py-2 h-[38px] bg-purple-500/10 border border-purple-500/20 hover:border-purple-400/30 rounded-md hover:bg-purple-500/20 transition-colors cursor-pointer"
      >
        <span className="text-sm font-medium text-purple-300">{LOCK_FILTER_LABELS[value]}</span>
        <ChevronDown className={`w-4 h-4 text-purple-300 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute left-0 mt-1 w-40 bg-slate-800 border border-purple-500/20 rounded-md shadow-xl z-50 overflow-hidden">
          {(Object.keys(LOCK_FILTER_LABELS) as LockFilter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-sm text-left font-medium transition-colors cursor-pointer ${
                value === option ? "bg-purple-500/30 text-purple-200" : "text-slate-300 hover:bg-purple-500/10"
              }`}
            >
              {LOCK_FILTER_LABELS[option]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Imports a player's shards and attribute levels from Hypixel, and lets them edit
 * quantities, exclude owned shards, and jump to an attribute to finish maxing it.
 */
export const InventoryManagementModal = ({
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
}: InventoryManagementModalProps) => {
  const { shards } = useShards();
  const [activeTab, setActiveTab] = useState<TabType>("shards");

  // Shards tab filters
  const [shardsQuery, setShardsQuery] = useState("");
  const [shardsRarity, setShardsRarity] = useState("all");

  // Attributes tab filters
  const [attrsQuery, setAttrsQuery] = useState("");
  const [attrsRarity, setAttrsRarity] = useState("all");
  const [attrsLockFilter, setAttrsLockFilter] = useState<LockFilter>("both");

  // Profile import
  const [profileMeta, setProfileMeta] = useState(loadHypixelProfileMeta);
  const [username, setUsername] = useState(() => profileMeta?.username ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<HypixelProfileResponse | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // Reset transient state when the modal opens or closes.
  useEffect(() => {
    if (open) {
      setError(null);
      setImportSuccess(false);
    } else {
      setShardsQuery("");
      setAttrsQuery("");
    }
  }, [open]);

  // Unfiltered, the tab lists only what the player owns.
  const isShardsFiltered = shardsQuery.trim() !== "" || shardsRarity !== "all";
  const filteredShards = useMemo(
    () => (isShardsFiltered ? searchShards(shards, shardsQuery, shardsRarity) : shards.filter((s) => inventory.has(s.id)).sort(sortByShardKey)),
    [isShardsFiltered, shards, shardsQuery, shardsRarity, inventory],
  );

  const shardsById = useMemo(() => new Map(shards.map((shard) => [shard.id, shard])), [shards]);

  // Every attribute, owned or not: highest level first, then in key order.
  const attributesList = useMemo(
    () =>
      Object.entries(SHARD_DESCRIPTIONS)
        .map(([id, desc]) => {
          const rarity = RARITY_BY_PREFIX[id[0].toUpperCase()] ?? "legendary";
          const level = ownedAttributes.get(id) ?? 0;
          const max = maxQuantityForRarity(rarity);
          return { id, rarity, title: desc.title, shardName: shardsById.get(id)?.name ?? "", level, max, capped: level >= max };
        })
        // compareShardKeys orders by (rarity, base number, "-N" suffix), so a
        // duplicate-placeholder id like "U17-1" sorts right after its base "U17".
        .sort((a, b) => b.level - a.level || compareShardKeys(a.id, b.id)),
    [ownedAttributes, shardsById],
  );

  // Search covers the attribute title, shard key, shard name, family, type and description.
  const filteredAttributes = useMemo(() => {
    const q = attrsQuery.trim() ? attrsQuery.toLowerCase() : "";
    return attributesList.filter((attr) => {
      if (attrsRarity !== "all" && attr.rarity !== attrsRarity) return false;
      if ((attrsLockFilter === "capped" && !attr.capped) || (attrsLockFilter === "unlocked" && attr.capped)) return false;
      if (!q) return true;
      const shard = shardsById.get(attr.id);
      return (
        attr.title.toLowerCase().includes(q) ||
        attr.id.toLowerCase().includes(q) ||
        attr.shardName.toLowerCase().includes(q) ||
        (shard?.family?.toLowerCase().includes(q) ?? false) ||
        (shard?.type?.toLowerCase().includes(q) ?? false) ||
        getShardSearchText(attr.id).includes(q)
      );
    });
  }, [attributesList, attrsQuery, attrsRarity, attrsLockFilter, shardsById]);
  // Sort profiles by last_save (most recent first)
  const sortedProfiles = useMemo(() => {
    if (!profileData) return [];
    return [...profileData.profiles].sort((a, b) => b.profile.last_save - a.profile.last_save);
  }, [profileData]);

  // Replace the inventory and attributes with the profile's, and derive the leveled shards' levels.
  const importProfileData = (profile: ProfileData, playerName: string) => {
    const levelOf = (shardId: string) => profile.attributes.find((attr) => attr.id.toUpperCase() === shardId.toUpperCase())?.level ?? 0;
    onShardLevelsImport?.(Object.fromEntries(LEVELED_SHARDS.map(({ shardId, rarity, key }) => [key, fusedCountToTierLevel(levelOf(shardId), rarity)])));

    onInventoryChange(new Map(profile.shards.filter((shard) => shard.amount > 0).map((shard) => [shard.id, shard.amount])));
    onOwnedAttributesChange(new Map(profile.attributes.filter((attr) => attr.level > 0).map((attr) => [attr.id, attr.level])));

    const meta: HypixelProfileMeta = { username: playerName, profileName: profile.profile.cute_name, lastImportTime: Date.now() };
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

      const mostRecent = data.profiles.reduce((prev, curr) => (curr.profile.last_save > prev.profile.last_save ? curr : prev));
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
    const next = new Map(inventory);
    if (isNaN(qty) || qty <= 0) next.delete(shardId);
    else next.set(shardId, qty);
    onInventoryChange(next);
  };

  const setShardsDisabled = (ids: string[], disabled: boolean) => {
    const next = new Set(disabledShards);
    for (const id of ids) {
      if (disabled) next.add(id);
      else next.delete(id);
    }
    onDisabledShardsChange(next);
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="inventory-management-title"
      panelClassName="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
      backdropClassName="bg-black/60 p-4"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-400" />
            <h2 id="inventory-management-title" className="text-lg font-semibold text-white">
              Inventory
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {(inventory.size > 0 || ownedAttributes.size > 0) && (
              <button onClick={handleClearAll} title="Clear all inventory" className="p-2 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer">
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
                className={TAB_INPUT}
              />
            </div>
            <button
              onClick={handleImport}
              disabled={!username.trim() || isLoading}
              className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 rounded-md text-purple-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4${isLoading ? " animate-spin" : ""}`} />
              <span>{isLoading ? "Importing..." : "Import"}</span>
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
                    {sortedProfiles.map(({ profile }) => (
                      <option key={profile.profile_id} value={profile.profile_id}>
                        {profile.cute_name}
                        {profile.game_mode ? ` (${profile.game_mode})` : ""} - {formatDate(profile.last_save)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <TabButton active={activeTab === "shards"} count={inventory.size} onClick={() => setActiveTab("shards")}>
            Shards
          </TabButton>
          <TabButton active={activeTab === "attributes"} count={ownedAttributes.size} onClick={() => setActiveTab("attributes")}>
            Attributes
          </TabButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "shards" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <SearchInput value={shardsQuery} onChange={setShardsQuery} placeholder="Search shards..." className={TAB_INPUT} />
              <RarityFilter value={shardsRarity} onChange={setShardsRarity} size="sm" />
              <ResetFiltersButton
                size="sm"
                onClick={() => {
                  setShardsQuery("");
                  setShardsRarity("all");
                }}
              />
            </div>

            <div className="text-xs text-slate-400">
              {isShardsFiltered
                ? `Showing ${filteredShards.length} of ${shards.length} shards`
                : `${inventory.size} shard${inventory.size !== 1 ? "s" : ""} in inventory`}
            </div>

            {filteredShards.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                {isShardsFiltered ? (
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
                  const owned = inventory.get(shard.id) ?? 0;
                  const disabled = disabledShards.has(shard.id);
                  const styles = rarityCardStyles(shard.rarity);

                  return (
                    <div key={shard.id} className={`bg-slate-800/50 border ${styles.border} rounded-md p-2 space-y-2 ${disabled ? "opacity-50" : ""}`}>
                      <div className="flex items-center gap-2">
                        <img src={shardIconUrl(shard.id)} alt={shard.name} className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
                        <span className={`text-sm font-medium flex-1 truncate ${styles.text}`}>{shard.name}</span>
                        <button
                          type="button"
                          onClick={() => setShardsDisabled([shard.id], !disabled)}
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
                          value={owned === 0 ? "" : owned}
                          onChange={(e) => handleInventoryChange(shard.id, e.target.value)}
                          onWheel={blurOnWheel}
                          onKeyDown={blockArrowKeys}
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

        {activeTab === "attributes" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <SearchInput value={attrsQuery} onChange={setAttrsQuery} placeholder="Search attributes..." className={TAB_INPUT} />
              <RarityFilter value={attrsRarity} onChange={setAttrsRarity} size="sm" />
              <LockFilterDropdown value={attrsLockFilter} onChange={setAttrsLockFilter} />
              <ResetFiltersButton
                size="sm"
                onClick={() => {
                  setAttrsQuery("");
                  setAttrsRarity("all");
                  setAttrsLockFilter("both");
                }}
              />
            </div>

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
                  const styles = rarityCardStyles(attr.rarity);
                  const percentage = owned ? Math.min(100, Math.round((attr.level / attr.max) * 100)) : 0;

                  return (
                    <div
                      key={attr.id}
                      onClick={() => {
                        if (onShardClick) {
                          onShardClick(attr.id);
                          onClose();
                        }
                      }}
                      className={`bg-slate-800/50 border ${styles.border} rounded-md p-2 space-y-1.5 ${
                        !owned ? "opacity-40" : ""
                      } ${onShardClick ? "cursor-pointer hover:bg-slate-700/50 transition-colors" : ""}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-shrink-0">
                          <img src={shardIconUrl(attr.id)} alt={attr.title} className="w-8 h-8 object-contain" loading="lazy" />
                          {attr.capped && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 flex items-center justify-center">
                              <span className="text-[8px] font-bold text-slate-900">✓</span>
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className={`text-xs font-medium leading-tight ${styles.text} truncate block`}>{attr.title}</span>
                          {attr.shardName && <span className="text-[10px] text-slate-500 truncate block">{attr.shardName}</span>}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wide">Level</span>
                          <span className={`text-xs font-bold ${owned ? styles.text : "text-slate-500"}`}>
                            {attr.level}/{attr.max}
                          </span>
                        </div>
                        <div className="h-1 w-full rounded-full bg-slate-700 overflow-hidden">
                          <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${percentage}%` }} />
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

      <div className="p-3 border-t border-slate-700 bg-slate-800/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          {activeTab === "shards" ? (
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setShardsDisabled(
                    filteredShards.map((shard) => shard.id),
                    false,
                  )
                }
                className="px-4 py-2 text-sm bg-green-500/20 hover:bg-green-500/30 border border-green-500/20 hover:border-green-500/30 rounded-md text-green-400 font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={filteredShards.length === 0}
              >
                Select All
              </button>
              <button
                onClick={() =>
                  setShardsDisabled(
                    filteredShards.map((shard) => shard.id),
                    true,
                  )
                }
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={filteredShards.length === 0}
              >
                Clear All
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-400">
              {profileMeta && (
                <span>
                  Last imported: {profileMeta.username} ({profileMeta.profileName}) - {new Date(profileMeta.lastImportTime).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-md text-white text-sm transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
