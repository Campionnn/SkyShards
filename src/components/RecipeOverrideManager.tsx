import React, { useState, useCallback } from "react";
import { CalculationService } from "../services/calculationService";
import { AlternativeRecipePopup } from "./AlternativeRecipePopup";
import type { RecipeOverrideManagerProps, AlternativeRecipeOption, AlternativeSelectionContext, Recipe, RecipeOverride, Data } from "../types";

export const RecipeOverrideManager: React.FC<RecipeOverrideManagerProps> = ({ targetShard, requiredQuantity, params, onResultUpdate, children }) => {
  const [recipeOverrides, setRecipeOverrides] = useState<RecipeOverride[]>([]);
  const [popupState, setPopupState] = useState<{
    isOpen: boolean;
    alternatives: AlternativeRecipeOption[];
    shardId?: string;
    shardName?: string;
    loading: boolean;
    data?: Data;
  }>({
    isOpen: false,
    alternatives: [],
    loading: false,
  });

  const closePopup = useCallback(() => {
    setPopupState({
      isOpen: false,
      alternatives: [],
      loading: false,
    });
  }, []);

  const showAlternatives = useCallback(
    async (shardId: string, context: AlternativeSelectionContext) => {
      setPopupState({
        isOpen: true,
        alternatives: [],
        shardId,
        shardName: shardId, // Will be updated with proper name
        loading: true,
      });

      try {
        const calculationService = CalculationService.getInstance();
        const alternatives = await calculationService.getAlternativesForTreeNode(shardId, params, context);

        // Get shard name from data
        const data = await calculationService.parseData(params);
        const shardName = data.shards[shardId]?.name || shardId;

        setPopupState((prev) => ({
          ...prev,
          alternatives,
          shardName,
          data,
          loading: false,
        }));
      } catch (error) {
        console.error("Failed to load alternatives:", error);
        setPopupState((prev) => ({
          ...prev,
          alternatives: [],
          loading: false,
        }));
      }
    },
    [params]
  );

  const handleRecipeSelect = useCallback(
    async (selectedRecipe: Recipe | null) => {
      if (!popupState.shardId) return;

      try {
        const calculationService = CalculationService.getInstance();

        const newResult = await calculationService.applyRecipeOverride(popupState.shardId, selectedRecipe, targetShard, requiredQuantity, params, recipeOverrides);

        // Update overrides state
        const newOverride: RecipeOverride = {
          shardId: popupState.shardId,
          recipe: selectedRecipe,
        };

        setRecipeOverrides((prev) => {
          const filtered = prev.filter((o) => o.shardId !== popupState.shardId);
          const updated = [...filtered, newOverride];
          return updated;
        });

        // Update the calculation result
        onResultUpdate(newResult);

        // Close the popup
        closePopup();
      } catch (error) {
        console.error("Failed to apply recipe override:", error);
      }
    },
    [popupState.shardId, targetShard, requiredQuantity, params, recipeOverrides, onResultUpdate, closePopup]
  );

  return (
    <>
      {children({
        showAlternatives,
        recipeOverrides,
      })}
      <AlternativeRecipePopup
        isOpen={popupState.isOpen}
        onClose={closePopup}
        alternatives={popupState.alternatives}
        onSelect={handleRecipeSelect}
        shardName={popupState.shardName || ""}
        data={popupState.data || ({} as Data)}
        loading={popupState.loading}
      />
    </>
  );
};
