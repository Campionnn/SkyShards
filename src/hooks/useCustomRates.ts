import { useState, useEffect } from "react";
import { DataService } from "../services/dataService";

export const useCustomRates = () => {
  const [customRates, setCustomRates] = useState<Record<string, number>>({});
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
            setCustomRates({ ...defaults, ...parsed });
          } catch {
            setCustomRates({ ...defaults });
          }
        } else {
          setCustomRates({ ...defaults });
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

  const updateRate = (shardId: string, rate: number) => {
    const newRates = { ...customRates, [shardId]: rate };
    setCustomRates(newRates);

    // Save to localStorage
    const customChanges = Object.entries(newRates).reduce((acc, [id, value]) => {
      if (value !== defaultRates[id]) {
        acc[id] = value;
      }
      return acc;
    }, {} as Record<string, number>);

    localStorage.setItem("customRates", JSON.stringify(customChanges));
  };

  const resetRates = () => {
    setCustomRates({ ...defaultRates });
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
