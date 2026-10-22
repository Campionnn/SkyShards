import { useState, useEffect, useMemo, useCallback, type ChangeEvent, type FocusEvent, type ReactNode } from "react";
import { Search, RotateCcw, Save, AlignLeft } from "lucide-react";
import { useShardsWithRecipes, useCustomRates, useCustomPrices, useCalculatorState } from "../hooks";
import { debounce, filterShards, DEFAULT_FILTER_CONFIG, isFocusRestoredByWindow } from "../utilities";
import { ShardDescription } from "../components/ui/ShardDescription";
import { RarityDropdown, TypeDropdown, ShardItem } from "../components";
import { SHARD_DESCRIPTIONS } from "../constants";
import { DataService } from "../services";
import type { ShardWithDirectInfo } from "../types/types";

type EditMode = "rates" | "prices";

const segmentClass = (active: boolean) =>
  `px-3 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 border cursor-pointer ${
    active
      ? "bg-purple-500/30 text-purple-200 border-purple-400/50"
      : "bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 border-slate-600/50 hover:border-slate-500/50"
  }`;

const SearchBox = ({
  value,
  onChange,
  onFocus,
  className = "",
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onFocus: (e: FocusEvent<HTMLInputElement>) => void;
  className?: string;
}) => (
  <div className={`relative ${className}`}>
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <Search className="h-5 w-5 text-slate-400" />
    </div>
    <input
      type="text"
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      placeholder="Search by name, perk, or description..."
      className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-colors duration-200"
    />
  </div>
);

// Full class strings so Tailwind can find them.
const ACTION_COLORS = {
  indigo: "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border-indigo-500/20 hover:border-indigo-500/30",
  red: "bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/20 hover:border-red-500/30",
  green: "bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/20 hover:border-green-500/30",
} as const;

const ActionButton = ({ color, onClick, children }: { color: keyof typeof ACTION_COLORS; onClick: () => void; children: ReactNode }) => (
  <button
    onClick={onClick}
    className={`px-3 py-2.5 font-medium rounded-md border transition-colors duration-200 flex items-center space-x-2 cursor-pointer ${ACTION_COLORS[color]}`}
  >
    {children}
  </button>
);

export const SettingsPage = () => {
  const { shards, loading: shardsLoading } = useShardsWithRecipes();
  const { form } = useCalculatorState();
  // Defaults to the calculator's mode; switching here doesn't change the calculator.
  const [editMode, setEditMode] = useState<EditMode>(() => (form.ironManView ? "rates" : "prices"));
  const [instantBuy, setInstantBuy] = useState(form.instantBuyPrices);
  const { customRates, defaultRates, updateRate, resetRates } = useCustomRates();
  const { customPrices, updatePrice, resetPrices } = useCustomPrices(instantBuy);
  const [filter, setFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [hasChanges, setHasChanges] = useState(false);
  const [detailedShard, setDetailedShard] = useState(true);

  const [debouncedFilter, setDebouncedFilter] = useState("");
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  const isPrices = editMode === "prices";
  const priceSourceLabel = instantBuy ? "instant buy" : "buy order";

  const debouncedSetFilter = useMemo(() => debounce((value: string) => setDebouncedFilter(value), 300), []);
  useEffect(() => {
    debouncedSetFilter(filter);
  }, [filter, debouncedSetFilter]);

  useEffect(() => {
    if (!isPrices) return;
    let cancelled = false;
    DataService.getInstance()
      .loadShardCosts(instantBuy)
      .then((prices) => {
        if (!cancelled) setLivePrices(prices);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [isPrices, instantBuy]);

  const switchEditMode = useCallback((mode: EditMode) => {
    setEditMode(mode);
    setHasChanges(false);
  }, []);

  const switchPriceSource = useCallback((useInstantBuy: boolean) => {
    setInstantBuy(useInstantBuy);
    setHasChanges(false);
  }, []);

  const filteredShards = useMemo(() => {
    return filterShards<ShardWithDirectInfo>(shards, {
      query: debouncedFilter,
      rarity: rarityFilter,
      type: typeFilter as "all" | "direct" | "fuse",
      searchConfig: DEFAULT_FILTER_CONFIG,
    });
  }, [shards, debouncedFilter, rarityFilter, typeFilter]);

  const handleRateChange = useCallback(
    (shardId: string, newRate: number | undefined) => {
      updateRate(shardId, newRate);

      // "Save" shows while any shard's rate differs from its default.
      const isOverride = (id: string, rate: number | undefined) => rate !== undefined && rate !== defaultRates[id];
      const otherOverrides = Object.entries(customRates).some(([id, rate]) => id !== shardId && isOverride(id, rate));
      setHasChanges(isOverride(shardId, newRate) || otherOverrides);
    },
    [updateRate, defaultRates, customRates],
  );

  const handlePriceChange = useCallback(
    (shardId: string, newPrice: number | undefined) => {
      // A value equal to the live price isn't an override.
      const price = newPrice === undefined || newPrice === (livePrices[shardId] ?? 0) ? undefined : newPrice;
      updatePrice(shardId, price);

      const otherOverrides = [...customPrices.keys()].some((id) => id !== shardId);
      setHasChanges(price !== undefined || otherOverrides);
    },
    [updatePrice, livePrices, customPrices],
  );

  const handleResetAll = useCallback(() => {
    const what = isPrices ? `${priceSourceLabel} prices` : "rates";
    const to = isPrices ? "live Bazaar prices" : "their defaults";
    if (confirm(`Are you sure you want to reset all ${what} to ${to}? This will clear all custom ${what}.`)) {
      if (isPrices) resetPrices();
      else resetRates();
      setHasChanges(false);
    }
  }, [isPrices, priceSourceLabel, resetRates, resetPrices]);

  const handleFilterChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
  }, []);

  // Focusing the box starts a new search, so it clears the old one - unless the browser is
  // just handing focus back after the user alt-tabbed away mid-search.
  const handleFilterFocus = useCallback((e: FocusEvent<HTMLInputElement>) => {
    if (isFocusRestoredByWindow(e.target)) return;
    setFilter("");
  }, []);

  if (shardsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  // The mobile and desktop control rows share these; only their wrappers differ.
  const filterControls = (
    <>
      <RarityDropdown value={rarityFilter} onChange={setRarityFilter} />
      <TypeDropdown value={typeFilter} onChange={setTypeFilter} />
      <ActionButton color="indigo" onClick={() => setDetailedShard((prev) => !prev)}>
        <AlignLeft className="w-5 h-5 text-indigo-400" />
        <span>{detailedShard ? "Hide Details" : "Show Details"}</span>
      </ActionButton>
    </>
  );

  const resetAndSave = (
    <>
      <ActionButton color="red" onClick={handleResetAll}>
        <RotateCcw className="w-4 h-4" />
        <span>Reset</span>
      </ActionButton>
      {/* Edits persist as they're typed; "Save" only acknowledges them and hides itself. */}
      {hasChanges && (
        <ActionButton color="green" onClick={() => setHasChanges(false)}>
          <Save className="w-4 h-4" />
          <span>Save</span>
        </ActionButton>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col space-y-4 py-4">
      {/* Controls */}
      <div className="bg-white/5 border border-white/10 rounded-md p-4">
        <div className="text-center pb-6 pt-2">
          <h1 className="text-2xl font-black text-purple-400 mb-2">Shard Overview, Rates and Prices</h1>
          <p className="text-slate-400">
            {isPrices ? (
              <>Override {priceSourceLabel} Bazaar prices used by Normal Profile calculations</>
            ) : (
              <>
                Customize gathering rates<span className="font-bold text-slate-500 mx-0.5">/</span>
                <span className="text-slate-500">hr</span> used by Ironman Profile calculations
              </>
            )}
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <div className="flex gap-2">
              <button type="button" className={segmentClass(!isPrices)} onClick={() => switchEditMode("rates")}>
                Ironman Rates
              </button>
              <button type="button" className={segmentClass(isPrices)} onClick={() => switchEditMode("prices")}>
                Bazaar Prices
              </button>
            </div>
            {isPrices && (
              <div className="flex gap-2">
                <button type="button" className={segmentClass(!instantBuy)} onClick={() => switchPriceSource(false)}>
                  Buy Order
                </button>
                <button type="button" className={segmentClass(instantBuy)} onClick={() => switchPriceSource(true)}>
                  Instant Buy
                </button>
              </div>
            )}
          </div>
          {isPrices && customPrices.size > 0 && (
            <p className="mt-3 text-xs text-yellow-300/80">
              {customPrices.size} custom {priceSourceLabel} {customPrices.size === 1 ? "price replaces" : "prices replace"} the live Bazaar price and won't
              follow the market.
            </p>
          )}
        </div>
        <div className="md:hidden space-y-3">
          <SearchBox value={filter} onChange={handleFilterChange} onFocus={handleFilterFocus} />
          <div className="flex flex-wrap gap-3">
            {filterControls}
            {resetAndSave}
          </div>
        </div>

        <div className="hidden md:flex md:flex-wrap gap-3">
          <SearchBox value={filter} onChange={handleFilterChange} onFocus={handleFilterFocus} className="flex-1 min-w-[400px]" />
          {filterControls}
          <div className="flex gap-2">{resetAndSave}</div>
        </div>

        <div className="mt-3 text-sm text-slate-400">
          <p>
            {isPrices ? `${instantBuy ? "Instant buy" : "Buy order"} prices (coins/shard)` : "Base rates (shards/hour)"} • Showing {filteredShards.length} of{" "}
            {shards.length} shards
          </p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-md overflow-hidden flex-1">
        <div className="h-full overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 p-3 items-start">
            {filteredShards.map((shard) => {
              const desc = SHARD_DESCRIPTIONS[shard.id as keyof typeof SHARD_DESCRIPTIONS];
              return (
                <ShardItem
                  key={shard.id}
                  shard={shard}
                  title={desc?.title || shard.name}
                  description={<ShardDescription record={desc} fallback="No description." collapsibleHowToHunt />}
                  detailed={detailedShard}
                  rate={isPrices ? (customPrices.get(shard.id) ?? livePrices[shard.id] ?? 0) : (customRates[shard.id] ?? defaultRates[shard.id])}
                  defaultRate={isPrices ? (livePrices[shard.id] ?? 0) : defaultRates[shard.id]}
                  defaultLabel={isPrices ? "Live" : "Default"}
                  onRateChange={isPrices ? handlePriceChange : handleRateChange}
                />
              );
            })}
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
