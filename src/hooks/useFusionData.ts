import { useState, useEffect } from "react";
import type { FusionData } from "../utilities";

export const useFusionData = () => {
  const [fusionData, setFusionData] = useState<FusionData | null>(null);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [fusionResponse, ratesResponse] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}fusion-data.json`),
          fetch(`${import.meta.env.BASE_URL}rates.json`),
        ]);
        if (!fusionResponse.ok) {
          throw new Error(`HTTP error! status: ${fusionResponse.status}`);
        }
        setFusionData(await fusionResponse.json());
        setRates(ratesResponse.ok ? await ratesResponse.json() : {});
      } catch (error) {
        console.error("Failed to load fusion data:", error);
        setFusionData(null);
        setRates(null);
      } finally {
        setLoading(false);
      }
    };
    loadData().catch(console.error);
  }, []);

  return { fusionData, rates, loading };
};
