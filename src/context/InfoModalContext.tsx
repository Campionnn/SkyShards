import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { loadGreenhouseData, getCropData, getMutationData, getEffectData } from "../services/greenhouseDataService";
import type { CropDataJSON, MutationDataJSON, EffectDefinition, GreenhouseDataJSON } from "../services/greenhouseDataService";

// =============================================================================
// Types
// =============================================================================

interface InfoModalState {
  isOpen: boolean;
  itemId: string | null;
  itemType: "crop" | "mutation" | null;
}

interface CropInfoData extends CropDataJSON {
  id: string;
}

interface MutationInfoData extends MutationDataJSON {
  id: string;
}

interface InfoModalContextType {
  // State
  isOpen: boolean;
  itemId: string | null;
  itemType: "crop" | "mutation" | null;
  isLoading: boolean;
  error: string | null;
  
  // Data (populated when modal is open)
  cropData: CropInfoData | null;
  mutationData: MutationInfoData | null;
  effectsMap: Record<string, EffectDefinition>;
  
  // Full data for requirement lookups
  allData: GreenhouseDataJSON | null;
  
  // Actions
  openInfo: (itemId: string) => void;
  closeInfo: () => void;
}

// =============================================================================
// Context
// =============================================================================

const InfoModalContext = createContext<InfoModalContextType | null>(null);

// =============================================================================
// Provider
// =============================================================================

export const InfoModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<InfoModalState>({
    isOpen: false,
    itemId: null,
    itemType: null,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropData, setCropData] = useState<CropInfoData | null>(null);
  const [mutationData, setMutationData] = useState<MutationInfoData | null>(null);
  const [effectsMap, setEffectsMap] = useState<Record<string, EffectDefinition>>({});
  const [allData, setAllData] = useState<GreenhouseDataJSON | null>(null);

  // Load data on mount
  useEffect(() => {
    loadGreenhouseData()
      .then((data) => {
        setAllData(data);
        setEffectsMap(data.effects);
      })
      .catch((err) => {
        console.error("Failed to load greenhouse data:", err);
      });
  }, []);

  const openInfo = useCallback((itemId: string) => {
    setIsLoading(true);
    setError(null);
    setCropData(null);
    setMutationData(null);
    
    // Ensure data is loaded
    loadGreenhouseData()
      .then((data) => {
        setAllData(data);
        setEffectsMap(data.effects);
        
        // Try to find the item
        const crop = getCropData(itemId);
        const mutation = getMutationData(itemId);
        
        if (mutation) {
          setMutationData(mutation);
          setState({
            isOpen: true,
            itemId,
            itemType: "mutation",
          });
        } else if (crop) {
          setCropData(crop);
          setState({
            isOpen: true,
            itemId,
            itemType: "crop",
          });
        } else {
          setError(`Item "${itemId}" not found`);
          setState({
            isOpen: true,
            itemId,
            itemType: null,
          });
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setState({
          isOpen: true,
          itemId,
          itemType: null,
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const closeInfo = useCallback(() => {
    setState({
      isOpen: false,
      itemId: null,
      itemType: null,
    });
    setCropData(null);
    setMutationData(null);
    setError(null);
  }, []);

  const value: InfoModalContextType = {
    isOpen: state.isOpen,
    itemId: state.itemId,
    itemType: state.itemType,
    isLoading,
    error,
    cropData,
    mutationData,
    effectsMap,
    allData,
    openInfo,
    closeInfo,
  };

  return (
    <InfoModalContext.Provider value={value}>
      {children}
    </InfoModalContext.Provider>
  );
};

// =============================================================================
// Hook
// =============================================================================

export const useInfoModal = (): InfoModalContextType => {
  const context = useContext(InfoModalContext);
  if (!context) {
    throw new Error("useInfoModal must be used within InfoModalProvider");
  }
  return context;
};

// =============================================================================
// Helper to get effect description
// =============================================================================

export const getEffectDescription = (effectId: string, effectsMap: Record<string, EffectDefinition>): string => {
  const effect = effectsMap[effectId] || getEffectData(effectId);
  return effect?.description || "";
};
