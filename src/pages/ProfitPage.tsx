import { useEffect, useMemo, useState } from "react";
import { Coins } from "lucide-react";
import { Link } from "react-router-dom";
import { useCalculatorState, useCustomRates } from "../hooks";
import { ToggleSwitch } from "../components/ui";
import { ActiveTable } from "../components/profit/ActiveTable";
import { NumberSetting, Segmented } from "../components/profit/controls";
import { OrderBookModal } from "../components/profit/OrderBookModal";
import { loadSettings, saveSettings, type ProfitSettings, type TableId } from "../components/profit/profitSettings";
import { farmFusionTable, farmingTable, flipTable, fusionTable, inventoryTable } from "../components/profit/tables";
import type { Loaded } from "../components/profit/types";
import { CalculationService, DataService, buildCalculationParams, type BuyMode, type MarketSettings, type SellMode } from "../services";
import { calculateMultipliers } from "../services/fusionMath";
import { loadCustomPrices, loadInventory } from "../utilities";

/** Bazaar prices with the user's overrides for the same order-book side on top. */
const withOverrides = (bazaar: Record<string, number>, overrides: Map<string, number>) => ({ ...bazaar, ...Object.fromEntries(overrides) });

export const ProfitPage = () => {
  const { form } = useCalculatorState();
  const { customRates } = useCustomRates();
  const [settings, setSettings] = useState<ProfitSettings>(loadSettings);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookShardId, setBookShardId] = useState<string | null>(null);
  const { buyMode, sellMode, useOverrides } = settings;

  const update = (changes: Partial<ProfitSettings>) =>
    setSettings((current) => {
      const next = { ...current, ...changes };
      saveSettings(next);
      return next;
    });

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
      const [data, bazaarBuy, bazaarSell, volumes, orderBooks] = await Promise.all([
        CalculationService.getInstance().parseData(params),
        dataService.loadShardCosts(buyFromOffers),
        dataService.loadShardCosts(sellToOffers),
        dataService.loadShardVolumes(),
        dataService.loadShardOrderBooks(),
      ]);
      const noOverrides = new Map<string, number>();
      const buyOverrides = useOverrides ? loadCustomPrices(buyFromOffers) : noOverrides;
      const sellOverrides = useOverrides ? loadCustomPrices(sellToOffers) : noOverrides;
      if (!cancelled) {
        setLoaded({
          data,
          buyPrices: withOverrides(bazaarBuy, buyOverrides),
          sellPrices: withOverrides(bazaarSell, sellOverrides),
          buyOverrides: new Set(buyOverrides.keys()),
          sellOverrides: new Set(sellOverrides.keys()),
          volumes,
          orderBooks,
          inventory: loadInventory(),
          crocodileMultiplier: calculateMultipliers(params).crocodileMultiplier,
        });
      }
    })().catch((loadError: unknown) => {
      console.error(loadError);
      if (!cancelled) setError("Could not load shard data or Bazaar prices. Please try again later.");
    });
    return () => {
      cancelled = true;
    };
  }, [form, customRates, buyMode, sellMode, useOverrides]);

  const marketSettings: MarketSettings = useMemo(
    () => ({ buyMode, sellMode, taxPercent: settings.taxPercent, marketShare: settings.marketSharePercent / 100 }),
    [buyMode, sellMode, settings.taxPercent, settings.marketSharePercent],
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
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-semibold text-white">Profits</h1>
          </div>
          <div className="space-y-2 text-sm text-slate-400">
            <p>
              Find the best way to turn shards into coins: farm and sell them, fuse them, flip them on the Bazaar, or fuse the shards you farm.
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
                <li>Pick a tab: Farming, Fusions, Flips, Fuse your farm or Inventory (your own shards from the Calculator).</li>
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
              <NumberSetting
                label="Bazaar tax"
                value={settings.taxPercent}
                onChange={(value) => update({ taxPercent: Math.min(value, 100) })}
                step={0.125}
                suffix="%"
                title="Taken from every sale. Hypixel's base tax is 1.25 %."
              />
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
