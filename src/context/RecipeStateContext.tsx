import React, { createContext, useState } from "react";
import type { ShardWithKey } from "../types/types";

interface RecipeStateContextType {
  selectedShard: ShardWithKey | null;
  setSelectedShard: (shard: ShardWithKey | null) => void;
  selectedOutputShard: ShardWithKey | null;
  setSelectedOutputShard: (shard: ShardWithKey | null) => void;
}

const RecipeStateContext = createContext<RecipeStateContextType | undefined>(undefined);

export { RecipeStateContext };

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
