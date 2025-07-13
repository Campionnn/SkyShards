import React, { useState, useCallback } from "react";
import { CalculationService } from "../services/calculationService";
import { AlternativeRecipePopup } from "./AlternativeRecipePopup";
import type { RecipeOverrideManagerProps, AlternativeRecipeOption, AlternativeSelectionContext, Recipe, RecipeOverride, Data } from "../types";

interface PopupState {
  isOpen: boolean;
  alternatives: { direct: AlternativeRecipeOption | null; grouped: Record<string, AlternativeRecipeOption[]> };
  shardId?: string;
  shardName?: string;
  loading: boolean;
  data?: Data;
}

export const RecipeOverrideManager: React.FC<RecipeOverrideManagerProps> = ({
  targetShard,
  requiredQuantity,
  params,
  onResultUpdate,
  recipeOverrides,
  onRecipeOverridesUpdate,
  onResetRecipeOverrides,
  children,
}) => {
  const [popupState, setPopupState] = useState<PopupState>({
    isOpen: false,
    alternatives: { direct: null, grouped: {} },
    loading: false,
  });

  const closePopup = useCallback(() => {
    setPopupState({
      isOpen: false,
      alternatives: { direct: null, grouped: {} },
      loading: false,
    });
  }, []);

  const showAlternatives = useCallback(
    async (shardId: string, context: AlternativeSelectionContext) => {
      setPopupState({
        isOpen: true,
        alternatives: { direct: null, grouped: {} },
        shardId,
        shardName: shardId,
        loading: true,
      });

      try {
        const calculationService = CalculationService.getInstance();

        // Check if there's an active override for this shard
        const activeOverride = recipeOverrides.find((override) => override.shardId === shardId);
        const updatedContext = {
          ...context,
          currentRecipe: activeOverride ? activeOverride.recipe : context.currentRecipe,
        };

        const alternatives = await calculationService.getAlternativesForTreeNode(shardId, params, updatedContext, recipeOverrides);
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
          alternatives: { direct: null, grouped: {} },
          loading: false,
        }));
      }
    },
    [params, recipeOverrides]
  );

  const handleRecipeSelect = useCallback(
    async (selectedRecipe: Recipe | null) => {
      if (!popupState.shardId) return;

      try {
        const calculationService = CalculationService.getInstance();
        const newResult = await calculationService.applyRecipeOverride(popupState.shardId, selectedRecipe, targetShard, requiredQuantity, params, recipeOverrides);

        const newOverride: RecipeOverride = {
          shardId: popupState.shardId,
          recipe: selectedRecipe,
        };

        const filtered = recipeOverrides.filter((o) => o.shardId !== popupState.shardId);
        const updatedOverrides = [...filtered, newOverride];
        onRecipeOverridesUpdate(updatedOverrides);

        onResultUpdate(newResult);
        closePopup();
      } catch (error) {
        console.error("Failed to apply recipe override:", error);
      }
    },
    [popupState.shardId, targetShard, requiredQuantity, params, recipeOverrides, onRecipeOverridesUpdate, onResultUpdate, closePopup]
  );

  const resetAlternatives = useCallback(async () => {
    try {
      onResetRecipeOverrides();
      const calculationService = CalculationService.getInstance();
      const newResult = await calculationService.calculateOptimalPath(targetShard, requiredQuantity, params);
      onResultUpdate(newResult);
    } catch (error) {
      console.error("Failed to reset alternatives:", error);
    }
  }, [targetShard, requiredQuantity, params, onResetRecipeOverrides, onResultUpdate]);

  return (
    <>
      {children({ showAlternatives, recipeOverrides, resetAlternatives })}
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
