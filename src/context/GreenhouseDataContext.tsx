import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getDefaults } from "../services";
import type { CropDefinition, MutationDefinition, SelectedMutation } from "../types/greenhouse";

interface GreenhouseDataContextType {
  // data from api
  crops: CropDefinition[];
  mutations: MutationDefinition[];
  isLoading: boolean;
  error: string | null;
  
  // mutations for solving
  selectedMutations: SelectedMutation[];
  addMutation: (name: string) => void;
  removeMutation: (name: string) => void;
  updateMutationMode: (name: string, mode: "maximize" | "target") => void;
  updateMutationTargetCount: (name: string, count: number) => void;
  clearSelectedMutations: () => void;
  
  // mutation definition
  getMutationDef: (name: string) => MutationDefinition | undefined;
  getCropDef: (name: string) => CropDefinition | undefined;
  
  refetchData: () => Promise<void>;
}

const GreenhouseDataContext = createContext<GreenhouseDataContextType | null>(null);

export const GreenhouseDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [crops, setCrops] = useState<CropDefinition[]>([]);
  const [mutations, setMutations] = useState<MutationDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMutations, setSelectedMutations] = useState<SelectedMutation[]>([]);
  
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDefaults();
      
      // base crops
      const baseCrops = data.crops.map(c => ({ ...c, priority: 0 }));

      // base mutations
      const mutationsAsCrops = data.mutations.map(m => ({
        name: m.name,
        size: m.size,
        priority: 0,
        isMutation: true,
      }));
      
      setCrops([...baseCrops, ...mutationsAsCrops]);
      setMutations(data.mutations);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [selectedMutations.length]);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const addMutation = useCallback((name: string) => {
    setSelectedMutations(prev => {
      if (prev.some(m => m.name === name)) return prev;
      return [...prev, { name, mode: "maximize", targetCount: 1 }];
    });
  }, []);
  
  const removeMutation = useCallback((name: string) => {
    setSelectedMutations(prev => prev.filter(m => m.name !== name));
  }, []);
  
  const updateMutationMode = useCallback((name: string, mode: "maximize" | "target") => {
    setSelectedMutations(prev =>
      prev.map(m => (m.name === name ? { ...m, mode } : m))
    );
  }, []);
  
  const updateMutationTargetCount = useCallback((name: string, count: number) => {
    setSelectedMutations(prev =>
      prev.map(m => (m.name === name ? { ...m, targetCount: count } : m))
    );
  }, []);
  
  const clearSelectedMutations = useCallback(() => {
    setSelectedMutations([]);
  }, []);
  
  const getMutationDef = useCallback((name: string): MutationDefinition | undefined => {
    return mutations.find(m => m.name === name);
  }, [mutations]);
  
  const getCropDef = useCallback((name: string): CropDefinition | undefined => {
    return crops.find(c => c.name === name);
  }, [crops]);
  
  const refetchData = useCallback(async () => {
    await fetchData();
  }, [fetchData]);
  
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
    refetchData,
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
