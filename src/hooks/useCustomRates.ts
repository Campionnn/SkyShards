import { useState, useEffect, useCallback } from "react";
import { DataService } from "../services";
import { saveCustomPrices, loadCustomPrices, loadCustomRates, saveCustomRates } from "../utilities";

/** Ironman acquisition-rate overrides on top of rates.json. */
export const useCustomRates = () => {
  const [customRates, setCustomRates] = useState<Record<string, number | undefined>>(loadCustomRates);
  const [defaultRates, setDefaultRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    DataService.getInstance()
      .loadDefaultRates()
      .then((defaults) => {
        if (active) setDefaultRates(defaults);
      })
      .catch((error) => console.error("Failed to load rates:", error))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateRate = (shardId: string, rate: number | undefined) => {
    const newRates = { ...customRates, [shardId]: rate };
    setCustomRates(newRates);
    // Persist only defined values that differ from the defaults.
    saveCustomRates(
      Object.fromEntries(Object.entries(newRates).filter((entry): entry is [string, number] => entry[1] !== undefined && entry[1] !== defaultRates[entry[0]])),
    );
  };

  const resetRates = () => {
    setCustomRates({});
    saveCustomRates({});
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
    [source],
  );

  const resetPrices = useCallback(() => {
    setPricesBySource((prev) => ({ ...prev, [source]: new Map() }));
  }, [source]);

  return { customPrices: pricesBySource[source], updatePrice, resetPrices };
};
