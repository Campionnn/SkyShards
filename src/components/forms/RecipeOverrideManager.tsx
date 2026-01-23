import React, { useState, useCallback } from "react";
import { CalculationService } from "../../services";
import { AlternativeRecipeModal } from "../modals";
import type { RecipeOverrideManagerProps, AlternativeRecipeOption, AlternativeSelectionContext, Recipe, Data } from "../../types/types";

interface ModalState {
  isOpen: boolean;
  alternatives: { direct: AlternativeRecipeOption | null; grouped: Record<string, AlternativeRecipeOption[]> };
  shardId?: string;
  shardName?: string;
  loading: boolean;
  data?: Data;
  requiredQuantity?: number;
}

export const RecipeOverrideManager: React.FC<RecipeOverrideManagerProps> = ({
  params,
  recipeOverrides,
  onRecipeOverridesUpdate,
  onResetRecipeOverrides,
  children,
}) => {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    alternatives: { direct: null, grouped: {} },
    loading: false,
  });

  const closeModal = useCallback(() => {
    setModalState({
      isOpen: false,
      alternatives: { direct: null, grouped: {} },
      loading: false,
    });
  }, []);

  const showAlternatives = useCallback(
    async (shardId: string, context: AlternativeSelectionContext) => {
      setModalState({
        isOpen: true,
        alternatives: { direct: null, grouped: {} },
        shardId,
        shardName: shardId,
        loading: true,
        requiredQuantity: context.requiredQuantity,
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

        setModalState((prev) => ({
          ...prev,
          alternatives,
          shardName,
          data,
          loading: false,
        }));
      } catch (error) {
        console.error("Failed to load alternatives:", error);
        setModalState((prev) => ({
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
      if (!modalState.shardId) return;

      try {
        const calculationService = CalculationService.getInstance();
        const updatedOverrides = calculationService.applyRecipeOverride(modalState.shardId, selectedRecipe, recipeOverrides);

        onRecipeOverridesUpdate(updatedOverrides);
        closeModal();
      } catch (error) {
        console.error("Failed to apply recipe override:", error);
      }
    },
    [modalState.shardId, recipeOverrides, onRecipeOverridesUpdate, closeModal]
  );

  const resetAlternatives = useCallback(() => {
    onResetRecipeOverrides();
  }, [onResetRecipeOverrides]);

  return (
    <>
      {children({ showAlternatives, recipeOverrides, resetAlternatives })}
      <AlternativeRecipeModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        alternatives={modalState.alternatives}
        onSelect={handleRecipeSelect}
        shardName={modalState.shardName || ""}
        data={modalState.data || ({} as Data)}
        loading={modalState.loading}
        requiredQuantity={modalState.requiredQuantity}
        params={params}
      />
    </>
  );
};
