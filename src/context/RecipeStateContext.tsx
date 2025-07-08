import React, { createContext, useContext, useState } from "react";
import type { ShardWithKey } from "../types";

interface RecipeStateContextType {
  selectedShard: ShardWithKey | null;
  setSelectedShard: (shard: ShardWithKey | null) => void;
  selectedOutputShard: ShardWithKey | null;
  setSelectedOutputShard: (shard: ShardWithKey | null) => void;
}

const RecipeStateContext = createContext<RecipeStateContextType | undefined>(undefined);

export const RecipeStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedShard, setSelectedShard] = useState<ShardWithKey | null>(null);
  const [selectedOutputShard, setSelectedOutputShard] = useState<ShardWithKey | null>(null);

  return (
    <RecipeStateContext.Provider
      value={{
        selectedShard,
        setSelectedShard,
        selectedOutputShard,
        setSelectedOutputShard,
      }}
    >
      {children}
    </RecipeStateContext.Provider>
  );
};

export const useRecipeState = () => {
  const context = useContext(RecipeStateContext);
  if (context === undefined) {
    throw new Error("useRecipeState must be used within a RecipeStateProvider");
  }
  return context;
};
