import { useContext } from "react";
import { RecipeStateContext } from "../context/contexts";

export const useRecipeState = () => {
  const context = useContext(RecipeStateContext);
  if (!context) throw new Error("useRecipeState must be used within a RecipeStateProvider");
  return context;
};
