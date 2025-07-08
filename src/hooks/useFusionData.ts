import { useState, useEffect } from "react";
import type { FusionData } from "../utils/recipeUtils";

export const useFusionData = () => {
  const [fusionData, setFusionData] = useState<FusionData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${import.meta.env.BASE_URL}fusion-data.json`);
        const data = await response.json();
        setFusionData(data);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return { fusionData, loading };
};
