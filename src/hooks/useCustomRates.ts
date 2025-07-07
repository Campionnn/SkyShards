import { useState, useEffect } from "react";
import { DataService } from "../services/dataService";

export const useCustomRates = () => {
  // Allow undefined to represent 'unset' custom rates
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
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setCustomRates({ ...parsed });
          } catch {
            setCustomRates({});
          }
        } else {
          setCustomRates({});
        }
      } catch (error) {
        console.error("Failed to load rates:", error);
        setCustomRates({});
        setDefaultRates({});
      } finally {
        setLoading(false);
      }
    };

    loadRates();
  }, []);

  // Accept undefined to unset a custom rate
  const updateRate = (shardId: string, rate: number | undefined) => {
    let newRates: Record<string, number | undefined>;
    if (rate === undefined) {
      // Remove the custom rate for this shard
      const { [shardId]: _, ...rest } = customRates;
      newRates = { ...rest };
    } else {
      newRates = { ...customRates, [shardId]: rate };
    }
    setCustomRates(newRates);

    // Save only custom changes (diff from default)
    const customChanges = Object.entries(newRates).reduce((acc, [id, value]) => {
      if (value !== undefined && value !== defaultRates[id]) {
        acc[id] = value;
      }
      return acc;
    }, {} as Record<string, number>);

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
