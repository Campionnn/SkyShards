import { DataService } from "../services";
import type { FusionJson } from "../types/types";
import { useAsyncData } from "./useAsyncData";

interface FusionDataBundle {
  fusionData: FusionJson | null;
  rates: Record<string, number> | null;
}

const EMPTY: FusionDataBundle = { fusionData: null, rates: null };

const loadBundle = async (): Promise<FusionDataBundle> => {
  const dataService = DataService.getInstance();
  const [fusionData, rates] = await Promise.all([
    dataService.loadFusionJson(),
    // A missing rates.json degrades to an empty map rather than failing the page: the
    // graph still renders, and its `hasRates` check skips cost-based pruning.
    dataService.loadDefaultRates().catch(() => ({})),
  ]);
  return { fusionData, rates };
};

export const useFusionData = () => {
  const { data, loading } = useAsyncData(loadBundle, EMPTY, "Failed to load fusion data");
  return { fusionData: data.fusionData, rates: data.rates, loading };
};
