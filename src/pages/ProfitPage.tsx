import { useCallback, useEffect, useMemo, useState } from "react";
import { Coffee, Coins, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useCalculatorState, useCustomRates } from "../hooks";
import { ToggleSwitch } from "../components/ui";
import { ActiveTable } from "../components/profit/ActiveTable";
import { NumberSetting, Segmented } from "../components/profit/controls";
import { OrderBookModal } from "../components/profit/OrderBookModal";
import { loadSettings, saveSettings, type ProfitSettings, type TableId } from "../components/profit/profitSettings";
import { segmentClass } from "../components/profit/styles";
import { chainTable, farmFusionTable, farmingTable, flipTable, fusionTable, inventoryTable } from "../components/profit/tables";
import { TAX_PRESETS, taxMultiplierFrom, taxMultiplierSource } from "../components/profit/tax";
import type { Loaded } from "../components/profit/types";
import { CalculationService, DataService, buildCalculationParams, type BuyMode, type MarketSettings, type SellMode } from "../services";
import { calculateMultipliers } from "../services/fusionMath";
import type { ElectionData } from "../types/hypixelApiTypes";
import { loadCustomPrices, loadInventory } from "../utilities";

/** Bazaar prices with the user's overrides for the same order-book side on top. */
const withOverrides = (bazaar: Record<string, number>, overrides: Map<string, number>) => ({ ...bazaar, ...Object.fromEntries(overrides) });

/** Author credit and support link shown at the top of the page. Leave SUPPORT_URL empty to hide the button. */
const AUTHOR_NAME = "MoltenOre";
const AUTHOR_URL = "https://github.com/MoltenOre";
const SUPPORT_URL = "https://ko-fi.com/moltenore";

/** Hypixel refreshes the Bazaar about once a minute; older prices are refetched when the tab is focused again. */
const STALE_AFTER_MS = 60_000;

/** "just now", "45s ago", "3m ago", "2h ago". */
const formatAge = (ms: number) => {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes}m ago` : `${Math.round(minutes / 60)}h ago`;
};

/** The current time, updated every few seconds while mounted. */
const useNow = (intervalMs: number) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
};

export const ProfitPage = () => {
  const { form } = useCalculatorState();
  const { customRates } = useCustomRates();
  const [settings, setSettings] = useState<ProfitSettings>(loadSettings);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookShardId, setBookShardId] = useState<string | null>(null);
  // Bumped to refetch the Bazaar; the effect below reloads whenever it changes.
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [election, setElection] = useState<ElectionData | null>(null);
  const now = useNow(5000);
  const { buyMode, sellMode, useOverrides } = settings;

  const update = (changes: Partial<ProfitSettings>) =>
    setSettings((current) => {
      const next = { ...current, ...changes };
      saveSettings(next);
      return next;
    });

  const refresh = useCallback(() => {
    DataService.getInstance().refreshBazaar();
    setRefreshing(true);
    setReloadKey((key) => key + 1);
  }, []);

  // Coming back to the tab after a while: the prices are probably stale, so fetch new ones.
  const updatedAt = loaded?.updatedAt;
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && updatedAt !== undefined && Date.now() - updatedAt > STALE_AFTER_MS) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [updatedAt, refresh]);

  // The mayor only changes Bazaar tax through a perk (Derpy), so a failed request just means no change.
  useEffect(() => {
    let cancelled = false;
    DataService.getInstance()
      .loadElection()
      .then((result) => !cancelled && setElection(result))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      // Rates always come from the player's own hunting rates (ironman mode), with the
      // calculator's Hunting Fortune, pets and rate overrides applied.
      const params = await buildCalculationParams({ ...form, ironManView: true }, customRates);
      const dataService = DataService.getInstance();
      // loadShardCosts(true) is the lowest sell offer (instant buy / sell offer price),
      // loadShardCosts(false) the highest buy order (buy order / instant sell price).
      // Price overrides are stored per side the same way, so each side gets its own.
      const buyFromOffers = buyMode === "instant";
      const sellToOffers = sellMode === "offer";
      const [data, sellOfferPrices, buyOrderPrices, volumes, orderBooks, updatedAt] = await Promise.all([
        CalculationService.getInstance().parseData(params),
        dataService.loadShardCosts(true),
        dataService.loadShardCosts(false),
        dataService.loadShardVolumes(),
        dataService.loadShardOrderBooks(),
        dataService.loadBazaarUpdatedAt(),
      ]);
      const noOverrides = new Map<string, number>();
      const sellOfferOverrides = useOverrides ? loadCustomPrices(true) : noOverrides;
      const buyOrderOverrides = useOverrides ? loadCustomPrices(false) : noOverrides;
      const sides = { sellOffer: withOverrides(sellOfferPrices, sellOfferOverrides), buyOrder: withOverrides(buyOrderPrices, buyOrderOverrides) };
      const buyOverrides = buyFromOffers ? sellOfferOverrides : buyOrderOverrides;
      const sellOverrides = sellToOffers ? sellOfferOverrides : buyOrderOverrides;
      if (!cancelled) {
        setLoaded({
          data,
          buyPrices: buyFromOffers ? sides.sellOffer : sides.buyOrder,
          sellPrices: sellToOffers ? sides.sellOffer : sides.buyOrder,
          buyOverrides: new Set(buyOverrides.keys()),
          sellOverrides: new Set(sellOverrides.keys()),
          sides,
          volumes,
          orderBooks,
          inventory: loadInventory(),
          crocodileMultiplier: calculateMultipliers(params).crocodileMultiplier,
          crocodileLevel: params.crocodileLevel,
          updatedAt,
        });
      }
    })()
      .catch((loadError: unknown) => {
        console.error(loadError);
        if (!cancelled) setError("Could not load shard data or Bazaar prices. Please try again later.");
      })
      .finally(() => {
        if (!cancelled) setRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form, customRates, buyMode, sellMode, useOverrides, reloadKey]);

  const taxMultiplier = settings.applyMayorTax ? taxMultiplierFrom(election) : 1;
  const mayorTaxSource = taxMultiplierSource(election);
  const effectiveTax = Math.min(settings.taxPercent * taxMultiplier, 100);
  const marketSettings: MarketSettings = useMemo(
    () => ({ buyMode, sellMode, taxPercent: effectiveTax, marketShare: settings.marketSharePercent / 100 }),
    [buyMode, sellMode, effectiveTax, settings.marketSharePercent],
  );
  const tab = settings.activeTab;
  // Shared by every tab; setBookShardId is stable, so the tables only rebuild when the data does.
  const tableProps = loaded && {
    loaded,
    marketSettings,
    minVolume: settings.minVolume,
    maxSpreadPercent: settings.maxSpreadPercent,
    onMaxSpreadPercentChange: (maxSpreadPercent: number) => update({ maxSpreadPercent }),
    hiddenColumns: settings.hiddenColumns,
    onHiddenColumnsChange: (hiddenColumns: string[]) => update({ hiddenColumns }),
    onTabChange: (activeTab: TableId) => update({ activeTab }),
    openBook: setBookShardId,
  };
  const overrideCount = loaded ? new Set([...loaded.buyOverrides, ...loaded.sellOverrides]).size : 0;

  return (
    <div className="min-h-screen px-2 sm:px-4 py-4">
      <div className="max-w-[1800px] mx-auto space-y-4">
        <div className="bg-slate-800 border border-slate-600 rounded-md p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-400" />
              <h1 className="text-xl font-semibold text-white">Profits</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>
                Profits Page Created by{" "}
                <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer" className="text-emerald-300 hover:underline">
                  {AUTHOR_NAME}
                </a>
              </span>
              {SUPPORT_URL && (
                <a
                  href={SUPPORT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-200 border border-yellow-400/30 hover:border-yellow-400/50 transition-colors duration-200"
                >
                  <Coffee className="w-4 h-4" />
                  Buy him a coffee
                </a>
              )}
              <span className="hidden sm:inline text-slate-600" aria-hidden>
                |
              </span>
              {loaded && (
                <span title={new Date(loaded.updatedAt).toLocaleString()}>
                  Bazaar prices from <span className="text-slate-300">{formatAge(now - loaded.updatedAt)}</span>
                </span>
              )}
              <button
                type="button"
                onClick={refresh}
                disabled={refreshing}
                className={`${segmentClass(false)} inline-flex items-center gap-1.5 disabled:opacity-60`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
          <div className="space-y-2 text-sm text-slate-400">
            <p>
              Find the best way to turn shards into coins: farm and sell them, fuse them (one step or a whole chain), flip them on the Bazaar, or fuse the
              shards you farm.
              <br />
              Rates use your Hunting Fortune, pets and custom rates from the{" "}
              <Link to="/" className="text-purple-300 hover:underline">
                Calculator
              </Link>{" "}
              and{" "}
              <Link to="/shards" className="text-purple-300 hover:underline">
                Shards
              </Link>{" "}
              pages. Prices are live from the Bazaar
              {useOverrides && overrideCount > 0 && (
                <>
                  , with <span className="text-amber-300">{overrideCount} of your price overrides*</span> from the Shards page
                </>
              )}
              {!useOverrides && " only (your price overrides are switched off)"}; volumes are 7-day Bazaar averages.
            </p>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300">How to use</h2>
              <ul className="mt-1 grid gap-x-6 gap-y-0.5 md:grid-cols-2 list-disc pl-5 text-xs">
                <li>Pick a tab: Farming, Fusions, Fusion chains, Flips, Fuse your farm or Inventory (your own shards from the Calculator).</li>
                <li>Hover a shard to see its description and how to hunt it.</li>
                <li>Click a shard&apos;s name to open its order book as a depth chart.</li>
                <li>In the order book, click the name again to open the shard on the Shards page, e.g. to set your own price.</li>
                <li>Click a column header to sort, click it again to flip the order. Hover it to see what it means.</li>
                <li>Use Columns (next to the tabs) to choose which statistics the current tab shows.</li>
                <li>Search by shard name; &quot;Only profitable&quot; hides trades that lose coins.</li>
                <li>Hover a setting below for an explanation. All settings are remembered in this browser.</li>
              </ul>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <NumberSetting
                label="Market share"
                value={settings.marketSharePercent}
                onChange={(value) => update({ marketSharePercent: Math.min(value, 100) })}
                step={1}
                suffix="%"
                title="How much of the hourly Bazaar volume you expect to get, since other players trade too. Used for Realistic/h, Max/h and Profit/h."
              />
              <NumberSetting
                label="Min. volume"
                value={settings.minVolume}
                onChange={(value) => update({ minVolume: value })}
                step={10}
                suffix="/h"
                title="Hide shards and fusions whose least traded shard sells fewer than this many per hour."
              />
              <ToggleSwitch
                label="Use my price overrides"
                checked={useOverrides}
                onChange={(value) => update({ useOverrides: value })}
                size="sm"
                accent="emerald"
                labelClassName="text-xs text-slate-400"
                tooltip="On: the prices you set on the Shards page replace Bazaar prices (marked with *). Off: live Bazaar prices only."
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <Segmented<BuyMode>
                label="Buy inputs via"
                value={buyMode}
                onChange={(value) => update({ buyMode: value })}
                options={[
                  ["instant", "Instant buy"],
                  ["order", "Buy order"],
                ]}
              />
              <Segmented<SellMode>
                label="Sell via"
                value={sellMode}
                onChange={(value) => update({ sellMode: value })}
                options={[
                  ["instant", "Instant sell"],
                  ["offer", "Sell offer"],
                ]}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Bazaar tax</span>
                {TAX_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    title={preset.title}
                    className={segmentClass(settings.taxPercent === preset.percent)}
                    onClick={() => update({ taxPercent: preset.percent })}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <NumberSetting
                label="Your tax"
                value={settings.taxPercent}
                onChange={(value) => update({ taxPercent: Math.min(value, 100) })}
                step={0.125}
                suffix="%"
                title="Taken from every sale (instant sells and filled sell offers); buying is tax-free. 1.25 % base, 1.125 % / 1 % with Bazaar Flipper I / II."
              />
              {mayorTaxSource && (
                <ToggleSwitch
                  label={`${mayorTaxSource}'s QUAD TAXES (×4)`}
                  checked={settings.applyMayorTax}
                  onChange={(value) => update({ applyMayorTax: value })}
                  size="sm"
                  accent="emerald"
                  labelClassName="text-xs text-amber-300"
                  tooltip="The current mayor quadruples Bazaar tax. Tax is charged when you claim the coins, so you can also wait until the next mayor before claiming sales."
                />
              )}
              <span className="text-xs text-slate-400" title="The tax every profit on this page uses">
                Effective: <span className={taxMultiplier > 1 ? "text-amber-300" : "text-slate-200"}>{effectiveTax.toFixed(3).replace(/\.?0+$/, "")}%</span>
              </span>
            </div>
          </div>
        </div>

        {error && <p className="text-center text-red-400 py-6">{error}</p>}
        {!error && !loaded && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}
        {tableProps && (
          <>
            {tab === "farming" && <ActiveTable config={farmingTable} {...tableProps} />}
            {tab === "fusions" && <ActiveTable config={fusionTable} {...tableProps} />}
            {tab === "chains" && <ActiveTable config={chainTable} {...tableProps} />}
            {tab === "flips" && <ActiveTable config={flipTable} {...tableProps} />}
            {tab === "farmFusions" && <ActiveTable config={farmFusionTable} {...tableProps} />}
            {tab === "inventory" && <ActiveTable config={inventoryTable} {...tableProps} />}
          </>
        )}
        {loaded && (
          <OrderBookModal
            data={loaded.data}
            shardId={bookShardId}
            book={bookShardId ? loaded.orderBooks[bookShardId] : undefined}
            onClose={() => setBookShardId(null)}
          />
        )}
      </div>
    </div>
  );
};
