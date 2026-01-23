import { useContext } from "react";
import { RecipeStateContext } from "../context/RecipeStateContext";

export const useRecipeState = () => {
  const context = useContext(RecipeStateContext);
  if (context === undefined) {
    throw new Error("useRecipeState must be used within a RecipeStateProvider");
  }
  return context;
};
