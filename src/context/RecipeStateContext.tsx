import React, { createContext, useState } from "react";
import type { Shard } from "../types/types";

interface RecipeStateContextType {
  selectedShard: Shard | null;
  setSelectedShard: (shard: Shard | null) => void;
  selectedOutputShard: Shard | null;
  setSelectedOutputShard: (shard: Shard | null) => void;
}

const RecipeStateContext = createContext<RecipeStateContextType | undefined>(undefined);

export { RecipeStateContext };

export const RecipeStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedShard, setSelectedShard] = useState<Shard | null>(null);
  const [selectedOutputShard, setSelectedOutputShard] = useState<Shard | null>(null);

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
