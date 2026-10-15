import { useState, useEffect, useCallback } from "react";
import { DataService } from "../services";
import { saveCustomPrices, loadCustomPrices } from "../utilities";

export const useCustomRates = () => {
  const [customRates, setCustomRates] = useState<Record<string, number | undefined>>({});
  const [defaultRates, setDefaultRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRates = async () => {
      try {
        setLoading(true);
        const dataService = DataService.getInstance();
        const defaults = await dataService.loadDefaultRates();
        setDefaultRates(defaults);

        // Load custom rates from localStorage
        const stored = localStorage.getItem("customRates");
        const parsed = stored ? JSON.parse(stored) : {};
        setCustomRates(parsed);
      } catch (error) {
        console.error("Failed to load rates:", error);
        setCustomRates({});
        setDefaultRates({});
      } finally {
        setLoading(false);
      }
    };

    loadRates().catch(console.error);
  }, []);

  const updateRate = (shardId: string, rate: number | undefined) => {
    const newRates = rate === undefined ? { ...customRates, [shardId]: undefined } : { ...customRates, [shardId]: rate };

    setCustomRates(newRates);

    // Save only defined values that differ from defaults
    const customChanges = Object.fromEntries(Object.entries(newRates).filter(([id, value]) => value !== undefined && value !== defaultRates[id]));

    if (Object.keys(customChanges).length > 0) {
      localStorage.setItem("customRates", JSON.stringify(customChanges));
    } else {
      localStorage.removeItem("customRates");
    }
  };

  const resetRates = () => {
    setCustomRates({});
    localStorage.removeItem("customRates");
  };

  return {
    customRates,
    defaultRates,
    loading,
    updateRate,
    resetRates,
  };
};

type PriceSource = "buyOrder" | "instantBuy";

/** Bazaar price overrides for the price source selected by `instantBuy`. */
export const useCustomPrices = (instantBuy: boolean) => {
  const [pricesBySource, setPricesBySource] = useState<Record<PriceSource, Map<string, number>>>(() => ({
    buyOrder: loadCustomPrices(false),
    instantBuy: loadCustomPrices(true),
  }));
  const source: PriceSource = instantBuy ? "instantBuy" : "buyOrder";

  useEffect(() => {
    saveCustomPrices(false, pricesBySource.buyOrder);
    saveCustomPrices(true, pricesBySource.instantBuy);
  }, [pricesBySource]);

  const updatePrice = useCallback(
    (id: string, price: number | undefined) => {
      setPricesBySource((prev) => {
        const next = new Map(prev[source]);
        if (price === undefined) next.delete(id);
        else next.set(id, price);
        return { ...prev, [source]: next };
      });
    },
    [source]
  );

  const resetPrices = useCallback(() => {
    setPricesBySource((prev) => ({ ...prev, [source]: new Map() }));
  }, [source]);

  return { customPrices: pricesBySource[source], updatePrice, resetPrices };
};
