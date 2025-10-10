import { useState, useEffect } from "react";
import type { FusionData } from "../utilities";

export const useFusionData = () => {
  const [fusionData, setFusionData] = useState<FusionData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${import.meta.env.BASE_URL}fusion-data.json`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setFusionData(data);
      } catch (error) {
        console.error("Failed to load fusion data:", error);
        setFusionData(null);
      } finally {
        setLoading(false);
      }
    };
    loadData().catch(console.error);
  }, []);

  return { fusionData, loading };
};
