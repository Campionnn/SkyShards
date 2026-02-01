import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { CropDefinition, MutationDefinition, SelectedMutation } from "../types/greenhouse";
import greenhouseData from "../../public/greenhouse/data.json";
import { LocalStorageManager } from "../utilities";

interface GreenhouseDataContextType {
  crops: CropDefinition[];
  mutations: MutationDefinition[];
  isLoading: boolean;
  error: string | null;
  
  // mutations for solving
  selectedMutations: SelectedMutation[];
  addMutation: (id: string, name: string) => void;
  removeMutation: (id: string) => void;
  updateMutationMode: (id: string, mode: "maximize" | "target") => void;
  updateMutationTargetCount: (id: string, count: number) => void;
  clearSelectedMutations: () => void;
  
  // mutation definition
  getMutationDef: (id: string) => MutationDefinition | undefined;
  getCropDef: (id: string) => CropDefinition | undefined;
}

const GreenhouseDataContext = createContext<GreenhouseDataContextType | null>(null);

// Load data from JSON
function loadGreenhouseData() {
  const crops: CropDefinition[] = [];
  const mutations: MutationDefinition[] = [];

  // Convert crops object to array with IDs
  for (const [id, crop] of Object.entries(greenhouseData.crops)) {
    crops.push({
      id,
      name: crop.name,
      size: crop.size,
      priority: 0,
      ground: crop.ground,
      growth_stages: crop.growth_stages,
      positive_buffs: crop.positive_buffs,
      negative_buffs: crop.negative_buffs,
      isMutation: false,
    });
  }

  // Convert mutations object to array with IDs
  for (const [id, mutation] of Object.entries(greenhouseData.mutations)) {
    mutations.push({
      id,
      name: mutation.name,
      size: mutation.size,
      ground: mutation.ground,
      requirements: mutation.requirements,
      special: (mutation as any).special,
      rarity: mutation.rarity,
      growth_stages: mutation.growth_stages,
      positive_buffs: mutation.positive_buffs,
      negative_buffs: mutation.negative_buffs,
      drops: mutation.drops,
    });

    // Also add mutation as a crop option
    crops.push({
      id,
      name: mutation.name,
      size: mutation.size,
      priority: 0,
      ground: mutation.ground,
      growth_stages: mutation.growth_stages,
      positive_buffs: mutation.positive_buffs,
      negative_buffs: mutation.negative_buffs,
      isMutation: true,
    });
  }

  return { crops, mutations };
}

export const GreenhouseDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [crops, setCrops] = useState<CropDefinition[]>([]);
  const [mutations, setMutations] = useState<MutationDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedMutations, setSelectedMutations] = useState<SelectedMutation[]>(() => {
    // Try to load from localStorage
    const saved = LocalStorageManager.loadMutationTargets();
    return saved || [];
  });

  // Load data from JSON on mount
  useEffect(() => {
    try {
      const { crops: cropsData, mutations: mutationsData } = loadGreenhouseData();
      setCrops(cropsData);
      setMutations(mutationsData);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load greenhouse data");
      setIsLoading(false);
    }
  }, []);
  
  // Save mutation targets to localStorage when they change
  useEffect(() => {
    LocalStorageManager.saveMutationTargets(selectedMutations);
  }, [selectedMutations]);
  
  const addMutation = useCallback((id: string, name: string) => {
    setSelectedMutations(prev => {
      if (prev.some(m => m.id === id)) return prev;
      return [...prev, { id, name, mode: "target", targetCount: 1 }];
    });
  }, []);
  
  const removeMutation = useCallback((id: string) => {
    setSelectedMutations(prev => prev.filter(m => m.id !== id));
  }, []);
  
  const updateMutationMode = useCallback((id: string, mode: "maximize" | "target") => {
    setSelectedMutations(prev =>
      prev.map(m => (m.id === id ? { ...m, mode } : m))
    );
  }, []);
  
  const updateMutationTargetCount = useCallback((id: string, count: number) => {
    setSelectedMutations(prev =>
      prev.map(m => (m.id === id ? { ...m, targetCount: count } : m))
    );
  }, []);
  
  const clearSelectedMutations = useCallback(() => {
    setSelectedMutations([]);
  }, []);
  
  const getMutationDef = useCallback((id: string): MutationDefinition | undefined => {
    return mutations.find(m => m.id === id);
  }, [mutations]);
  
  const getCropDef = useCallback((id: string): CropDefinition | undefined => {
    return crops.find(c => c.id === id);
  }, [crops]);
  
  const value: GreenhouseDataContextType = {
    crops,
    mutations,
    isLoading,
    error,
    selectedMutations,
    addMutation,
    removeMutation,
    updateMutationMode,
    updateMutationTargetCount,
    clearSelectedMutations,
    getMutationDef,
    getCropDef,
  };
  
  return (
    <GreenhouseDataContext.Provider value={value}>
      {children}
    </GreenhouseDataContext.Provider>
  );
};

export const useGreenhouseData = (): GreenhouseDataContextType => {
  const context = useContext(GreenhouseDataContext);
  if (!context) {
    throw new Error("useGreenhouseData must be used within a GreenhouseDataProvider");
  }
  return context;
};
