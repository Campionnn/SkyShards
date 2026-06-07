import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, User, RefreshCw, AlertTriangle, Check, ChevronDown, Coins, MoveRight, Hammer, Copy } from "lucide-react";
import { useShards } from "../hooks";
import { CalculationService, DataService, hypixelService } from "../services";
import type { HypixelProfileResponse, ProfileData } from "../services";
import { RarityDropdown, SkillDropdown, SortDropdown, TierDropdown, ShardDetailModal } from "../components";
import type { SortKey } from "../components";
import { SHARD_DESCRIPTIONS, cumulativeShardsForTier, tierLabel } from "../constants";
import {
  getRarityColor,
  formatShardDescription,
  formatLargeNumber,
  copyToClipboard,
  filterShards,
  DEFAULT_FILTER_CONFIG,
  loadHypixelProfileMeta,
  saveHypixelProfileMeta,
  loadOwnedAttributes,
  saveOwnedAttributes,
  loadInventory,
  saveInventory,
} from "../utilities";
import type { HypixelProfileMeta } from "../utilities";
import type { CalculationParams, Data, RecipeChoice, ShardWithKey } from "../types/types";

type PriceSource = "bazaar" | "fusion";
type BazaarType = "instant" | "offer";

interface FusionContext {
  data: Data;
  choices: Map<string, RecipeChoice>;
  cycleNodes: string[][];
  params: CalculationParams;
}

// Normalize a map's keys to uppercase so they line up with shard keys (e.g. "C1")
const normalizeKeys = (map: Map<string, number>): Map<string, number> => {
  const out = new Map<string, number>();
  for (const [k, v] of map) out.set(k.toUpperCase(), v);
  return out;
};

// Build a CalculationParams that treats bazaar prices as raw coin values, so that
// computeMinCosts returns the cheapest coin cost (fuse-or-buy) for every shard.
const buildCoinParams = (shardCosts: Record<string, number>): CalculationParams => ({
  customRates: shardCosts,
  hunterFortune: 0,
  excludeChameleon: false,
  frogBonus: false,
  newtLevel: 0,
  salamanderLevel: 0,
  lizardKingLevel: 0,
  leviathanLevel: 0,
  pythonLevel: 0,
  kingCobraLevel: 0,
  seaSerpentLevel: 0,
  tiamatLevel: 0,
  crocodileLevel: 0,
  kuudraTier: "none",
  moneyPerHour: Infinity,
  customKuudraTime: false,
  kuudraTimeSeconds: null,
  noWoodenBait: false,
  rateAsCoinValue: true,
  craftPenalty: 0,
});

interface MissingShard {
  shard: ShardWithKey;
  title: string;
  description: string;
  level: number;
  targetCount: number;
  ownedLoose: number;
  remaining: number;
  unitCost: number;
  bazaarUnitCost: number;
  price: number;
  method: "bazaar" | "fusion";
}

export const MissingShardsPage: React.FC = () => {
  const { shards, loading: shardsLoading } = useShards();

  // Imported player data
  const [ownedAttributes, setOwnedAttributes] = useState<Map<string, number>>(new Map());
  const [inventory, setInventory] = useState<Map<string, number>>(new Map());
  const [hasImported, setHasImported] = useState(false);

  // Import flow state
  const [username, setUsername] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<HypixelProfileResponse | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profileMeta, setProfileMeta] = useState<HypixelProfileMeta | null>(null);

  // Filters
  const [filter, setFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("price-desc");
  const [targetTier, setTargetTier] = useState(10);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Toggles
  const [priceSource, setPriceSource] = useState<PriceSource>("bazaar");
  const [bazaarType, setBazaarType] = useState<BazaarType>("instant");

  // Computed unit cost per shard key (the active method) + the raw direct bazaar price for comparison
  const [unitCosts, setUnitCosts] = useState<Map<string, number>>(new Map());
  const [bazaarCosts, setBazaarCosts] = useState<Map<string, number>>(new Map());
  const [pricesLoading, setPricesLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Fusion context (only populated in "Cheapest Fusion" mode) + detail modal
  const [fusionContext, setFusionContext] = useState<FusionContext | null>(null);
  const [modalShardKey, setModalShardKey] = useState<string | null>(null);

  // Prefill from any previously imported profile (shared with the calculator's inventory)
  useEffect(() => {
    const meta = loadHypixelProfileMeta();
    if (meta) {
      setUsername(meta.username);
      setProfileMeta(meta);
    }
    const savedAttrs = normalizeKeys(loadOwnedAttributes());
    const savedInv = normalizeKeys(loadInventory());
    if (savedAttrs.size > 0 || savedInv.size > 0) {
      setOwnedAttributes(savedAttrs);
      setInventory(savedInv);
      setHasImported(true);
    }
  }, []);

  const applyProfile = useCallback((profile: ProfileData, uname: string) => {
    const attrs = new Map<string, number>();
    for (const attr of profile.attributes) {
      if (attr.level > 0) attrs.set(attr.id.toUpperCase(), attr.level);
    }
    setOwnedAttributes(attrs);
    saveOwnedAttributes(attrs);

    const inv = new Map<string, number>();
    for (const shard of profile.shards) {
      if (shard.amount > 0) inv.set(shard.id.toUpperCase(), shard.amount);
    }
    setInventory(inv);
    saveInventory(inv);

    const meta: HypixelProfileMeta = {
      username: uname,
      profileName: profile.profile.cute_name,
      lastImportTime: Date.now(),
    };
    saveHypixelProfileMeta(meta);
    setProfileMeta(meta);
    setHasImported(true);
  }, []);

  const handleImport = useCallback(async () => {
    if (!username.trim()) return;
    setIsImporting(true);
    setError(null);
    try {
      const data = await hypixelService.fetchPlayerProfile(username.trim());
      setProfileData(data);
      if (data.profiles.length === 0) {
        setError("No SkyBlock profiles found for this player");
        return;
      }
      const mostRecent = data.profiles.reduce((prev, curr) => (curr.profile.last_save > prev.profile.last_save ? curr : prev));
      setSelectedProfileId(mostRecent.profile.profile_id);
      applyProfile(mostRecent, data.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch profile");
    } finally {
      setIsImporting(false);
    }
  }, [username, applyProfile]);

  const handleProfileChange = useCallback(
    (profileId: string) => {
      setSelectedProfileId(profileId);
      if (profileData) {
        const profile = profileData.profiles.find((p) => p.profile.profile_id === profileId);
        if (profile) applyProfile(profile, profileData.username);
      }
    },
    [profileData, applyProfile]
  );

  const sortedProfiles = useMemo(() => {
    if (!profileData) return [];
    return [...profileData.profiles].sort((a, b) => b.profile.last_save - a.profile.last_save);
  }, [profileData]);

  // Compute unit costs whenever the source/bazaar toggles change
  useEffect(() => {
    let cancelled = false;
    const compute = async () => {
      setPricesLoading(true);
      setPriceError(null);
      try {
        const dataService = DataService.getInstance();
        const shardCosts = await dataService.loadShardCosts(bazaarType === "instant");

        // Direct bazaar prices (used for the active "Bazaar" mode and for the fusion comparison)
        const bazaarMap = new Map<string, number>();
        for (const [id, cost] of Object.entries(shardCosts)) {
          if (typeof cost === "number" && isFinite(cost)) bazaarMap.set(id, cost);
        }

        if (priceSource === "bazaar") {
          if (!cancelled) {
            setBazaarCosts(bazaarMap);
            setUnitCosts(bazaarMap);
            setFusionContext(null);
          }
        } else {
          const params = buildCoinParams(shardCosts);
          const calc = CalculationService.getInstance();
          const data = await calc.parseData(params);
          const { minCosts, choices } = calc.computeMinCosts(data, params);
          const cycleNodes = calc.findCycleNodes(choices);
          if (!cancelled) {
            setBazaarCosts(bazaarMap);
            setUnitCosts(new Map(minCosts));
            setFusionContext({ data, choices, cycleNodes, params });
          }
        }
      } catch (err) {
        if (!cancelled) setPriceError(err instanceof Error ? err.message : "Failed to load bazaar prices");
      } finally {
        if (!cancelled) setPricesLoading(false);
      }
    };
    compute().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [priceSource, bazaarType]);

  // Build the missing-shard list (relative to the selected target tier)
  const missingShards = useMemo<MissingShard[]>(() => {
    const result: MissingShard[] = [];
    for (const shard of shards) {
      const targetCount = cumulativeShardsForTier(shard.rarity, targetTier);
      const level = ownedAttributes.get(shard.key) ?? 0;
      if (level >= targetCount) continue; // already at/above the target tier

      const desc = SHARD_DESCRIPTIONS[shard.key as keyof typeof SHARD_DESCRIPTIONS] as
        | { title: string; description?: string }
        | undefined;

      const ownedLoose = inventory.get(shard.key) ?? 0;
      const remaining = Math.max(0, targetCount - level - ownedLoose);
      const unitCost = unitCosts.get(shard.key) ?? Infinity;
      const bazaarUnitCost = bazaarCosts.get(shard.key) ?? Infinity;
      const price = isFinite(unitCost) ? remaining * unitCost : Infinity;

      // In fusion mode, the cheapest method may be a recipe (fusion) or direct bazaar buy.
      const usesFusion = priceSource === "fusion" && !!fusionContext?.choices.get(shard.key)?.recipe;

      result.push({
        shard,
        title: desc?.title || shard.name,
        description: formatShardDescription(desc?.description || "No description."),
        level,
        targetCount,
        ownedLoose,
        remaining,
        unitCost,
        bazaarUnitCost,
        price,
        method: usesFusion ? "fusion" : "bazaar",
      });
    }
    return result;
  }, [shards, ownedAttributes, inventory, unitCosts, bazaarCosts, priceSource, fusionContext, targetTier]);

  // Filter + sort
  const filteredMissing = useMemo(() => {
    const matchingKeys = new Set(
      filterShards(shards, {
        query: filter,
        rarity: rarityFilter,
        searchConfig: DEFAULT_FILTER_CONFIG,
      }).map((s) => s.key)
    );
    const RARITY_ORDER: Record<string, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
    const price = (p: number) => (isFinite(p) ? p : -1);

    return missingShards
      .filter((m) => matchingKeys.has(m.shard.key) && (skillFilter === "all" || m.shard.type === skillFilter))
      .sort((a, b) => {
        switch (sortKey) {
          case "price-asc": {
            // Unknown prices sort to the end
            const ap = isFinite(a.price) ? a.price : Infinity;
            const bp = isFinite(b.price) ? b.price : Infinity;
            return ap - bp;
          }
          case "rarity":
            return (RARITY_ORDER[b.shard.rarity] ?? 0) - (RARITY_ORDER[a.shard.rarity] ?? 0) || a.shard.name.localeCompare(b.shard.name);
          case "name":
            return a.shard.name.localeCompare(b.shard.name);
          case "completion":
            return b.level / b.targetCount - a.level / a.targetCount;
          case "price-desc":
          default:
            return price(b.price) - price(a.price);
        }
      });
  }, [missingShards, shards, filter, rarityFilter, skillFilter, sortKey]);

  const totalToMax = useMemo(
    () => filteredMissing.reduce((sum, m) => (isFinite(m.price) ? sum + m.price : sum), 0),
    [filteredMissing]
  );

  const modalShard = useMemo(
    () => (modalShardKey ? missingShards.find((m) => m.shard.key === modalShardKey) ?? null : null),
    [modalShardKey, missingShards]
  );

  const copyBzCommand = useCallback(async (shardKey: string, shardName: string) => {
    const ok = await copyToClipboard(`/bz ${shardName}`);
    if (ok) {
      setCopiedKey(shardKey);
      setTimeout(() => setCopiedKey((k) => (k === shardKey ? null : k)), 1500);
    }
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
      {/* Header / import */}
      <div className="bg-white/5 border border-white/10 rounded-md p-4">
        <div className="text-center pb-5 pt-2">
          <h1 className="text-2xl font-black text-purple-400 mb-2">Missing Shards</h1>
          <p className="text-slate-400">Import your profile to see every shard you haven&apos;t maxed and the price to finish them</p>
        </div>

        {/* Username import */}
        <div className="flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Minecraft username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleImport()}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:border-purple-400"
            />
          </div>
          <button
            onClick={handleImport}
            disabled={!username.trim() || isImporting}
            className="px-4 py-2.5 bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 rounded-md text-purple-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isImporting ? "animate-spin" : ""}`} />
            <span>{isImporting ? "Importing..." : "Import"}</span>
          </button>
        </div>

        {error && (
          <div className="mt-3 max-w-2xl mx-auto bg-red-500/10 border border-red-500/20 rounded-md p-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        )}

        {hasImported && profileData && (
          <div className="mt-3 max-w-2xl mx-auto bg-green-500/10 border border-green-500/20 rounded-md p-2 flex items-center justify-between gap-2">
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
                  {sortedProfiles.map((p) => (
                    <option key={p.profile.profile_id} value={p.profile.profile_id}>
                      {p.profile.cute_name}
                      {p.profile.game_mode ? ` (${p.profile.game_mode})` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white/5 border border-white/10 rounded-md p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[240px] relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search by name, perk, or description..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-colors duration-200"
            />
          </div>

          <RarityDropdown value={rarityFilter} onChange={setRarityFilter} />
          <SkillDropdown value={skillFilter} onChange={setSkillFilter} />
          <TierDropdown value={targetTier} onChange={setTargetTier} />
          <SortDropdown value={sortKey} onChange={setSortKey} />

          {/* Price source toggle */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-md p-1">
            {(
              [
                { value: "bazaar", label: "Bazaar" },
                { value: "fusion", label: "Cheapest Fusion" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPriceSource(opt.value)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer ${
                  priceSource === opt.value ? "bg-purple-500/30 text-purple-200" : "text-slate-400 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Bazaar price type toggle */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-md p-1">
            {(
              [
                { value: "instant", label: "Instabuy" },
                { value: "offer", label: "Buy Order" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBazaarType(opt.value)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer ${
                  bazaarType === opt.value ? "bg-blue-500/30 text-blue-200" : "text-slate-400 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-slate-400">
            Showing {filteredMissing.length} missing shard{filteredMissing.length !== 1 ? "s" : ""}
            {!hasImported && <span className="text-slate-500"> • import a profile for your personal progress</span>}
          </p>
          <div className="flex items-center gap-1.5 text-amber-300 font-medium">
            <Coins className="w-4 h-4" />
            {priceError ? (
              <span className="text-red-300">{priceError}</span>
            ) : pricesLoading ? (
              <span className="text-slate-400">Loading prices…</span>
            ) : (
              <span>Total to {tierLabel(targetTier)}: {formatLargeNumber(totalToMax)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      {filteredMissing.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✨</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Missing Shards</h3>
          <p className="text-slate-400">{hasImported ? "Everything in this view is already maxed!" : "Try adjusting your search or filter criteria"}</p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-md overflow-hidden flex-1">
          <div className="h-full overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 p-3 auto-rows-fr">
              {filteredMissing.map((m) => {
                const percentage = Math.min(100, Math.round((m.level / m.targetCount) * 100));
                const barColor =
                  m.shard.rarity === "common" ? "bg-slate-400"
                  : m.shard.rarity === "uncommon" ? "bg-green-400"
                  : m.shard.rarity === "rare" ? "bg-blue-400"
                  : m.shard.rarity === "epic" ? "bg-purple-400"
                  : "bg-amber-400";

                return (
                  <div
                    key={m.shard.key}
                    onClick={() => setModalShardKey(m.shard.key)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setModalShardKey(m.shard.key)}
                    className="bg-white/5 border border-white/10 rounded-md p-3 hover:bg-white/10 transition-colors duration-200 flex flex-col cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <img
                        src={`${import.meta.env.BASE_URL}shardIcons/${m.shard.key}.png`}
                        alt={m.shard.name}
                        className="w-6 h-6 object-contain flex-shrink-0"
                        loading="lazy"
                      />
                      <div className={`font-medium text-sm ${getRarityColor(m.shard.rarity)} truncate flex-1`}>{m.shard.name}</div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyBzCommand(m.shard.key, m.shard.name);
                        }}
                        title={`Copy "/bz ${m.shard.name}"`}
                        className="flex-shrink-0 p-1 -mr-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        {copiedKey === m.shard.key ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {m.shard.key} • {m.shard.family} • {m.shard.type}
                    </div>

                    {/* Use / perk */}
                    <div className="mt-2 text-xs text-slate-400 flex-1">
                      <div className="font-medium text-yellow-500 gap-1 flex items-center truncate mb-1">
                        {m.title}
                        <span className="flex items-center">
                          I<MoveRight className="w-4" />X
                        </span>
                      </div>
                      <p className="text-slate-300 break-words" dangerouslySetInnerHTML={{ __html: m.description }}></p>
                    </div>

                    {/* Progress */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide">Progress</span>
                        <span className={`text-xs font-bold ${getRarityColor(m.shard.rarity)}`}>
                          {m.level}/{m.targetCount}
                        </span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-slate-700 overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percentage}%` }} />
                      </div>
                    </div>

                    {/* Method indicator (fusion mode only) */}
                    {priceSource === "fusion" && (
                      m.method === "fusion" ? (
                        <div className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                          <Hammer className="w-3.5 h-3.5" />
                          Fusion
                        </div>
                      ) : (
                        <div className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-green-500/15 text-green-300 border border-green-500/25">
                          <Coins className="w-3.5 h-3.5" />
                          Bazaar {bazaarType === "instant" ? "Instabuy" : "Buy Order"}
                        </div>
                      )
                    )}

                    {/* Price to max */}
                    <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                      <div className="text-xs text-slate-400">
                        <span className="text-slate-300 font-medium">{formatLargeNumber(m.remaining)}</span> shards left
                        {m.ownedLoose > 0 && <span className="text-slate-500"> ({formatLargeNumber(m.ownedLoose)} owned)</span>}
                      </div>
                      <div className="flex items-center gap-1 text-amber-300 font-semibold text-sm">
                        <Coins className="w-3.5 h-3.5" />
                        {isFinite(m.price) ? formatLargeNumber(m.price) : "—"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Shard detail modal — opens for any shard; craft tree only shown for fusion-method shards */}
      {modalShard && (
        <ShardDetailModal
          open={!!modalShard}
          onClose={() => setModalShardKey(null)}
          shard={modalShard.shard}
          unitCost={modalShard.unitCost}
          level={modalShard.level}
          ownedLoose={modalShard.ownedLoose}
          remaining={modalShard.remaining}
          targetTier={targetTier}
          bazaarLabel={`Bazaar ${bazaarType === "instant" ? "Instabuy" : "Buy Order"}`}
          bazaarUnitCost={modalShard.bazaarUnitCost}
          fusion={modalShard.method === "fusion" ? fusionContext : null}
        />
      )}
    </div>
  );
};

export default MissingShardsPage;
