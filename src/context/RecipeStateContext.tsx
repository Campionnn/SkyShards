import React, { useMemo, useState } from "react";
import type { Shard } from "../types/types";
import { RecipeStateContext, type RecipeStateContextType } from "./contexts";

/** Recipe-page selections, lifted above the router so they survive page navigation. */
export const RecipeStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedShard, setSelectedShard] = useState<Shard | null>(null);
  const [selectedOutputShard, setSelectedOutputShard] = useState<Shard | null>(null);

  const value = useMemo<RecipeStateContextType>(
    () => ({ selectedShard, setSelectedShard, selectedOutputShard, setSelectedOutputShard }),
    [selectedShard, selectedOutputShard],
  );

  return <RecipeStateContext.Provider value={value}>{children}</RecipeStateContext.Provider>;
};
