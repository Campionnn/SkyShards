import React, { useState, useCallback } from "react";
import { CalculationService } from "../../services";
import { AlternativeRecipeModal } from "../modals";
import type { RecipeOverrideManagerProps, AlternativeRecipeOption, AlternativeSelectionContext, Recipe, RecipeOverride, Data } from "../../types/types";

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
  targetShard,
  requiredQuantity,
  params,
  onResultUpdate,
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
        const newResult = await calculationService.applyRecipeOverride(modalState.shardId, selectedRecipe, targetShard, requiredQuantity, params, recipeOverrides);

        const newOverride: RecipeOverride = {
          shardId: modalState.shardId,
          recipe: selectedRecipe,
        };

        const filtered = recipeOverrides.filter((o) => o.shardId !== modalState.shardId);
        const updatedOverrides = [...filtered, newOverride];
        onRecipeOverridesUpdate(updatedOverrides);

        onResultUpdate(newResult);
        closeModal();
      } catch (error) {
        console.error("Failed to apply recipe override:", error);
      }
    },
    [modalState.shardId, targetShard, requiredQuantity, params, recipeOverrides, onRecipeOverridesUpdate, onResultUpdate, closeModal]
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
      <AlternativeRecipeModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        alternatives={modalState.alternatives}
        onSelect={handleRecipeSelect}
        shardName={modalState.shardName || ""}
        data={modalState.data || ({} as Data)}
        loading={modalState.loading}
        requiredQuantity={modalState.requiredQuantity}
        crocodileLevel={params.crocodileLevel}
        seaSerpentLevel={params.seaSerpentLevel}
        tiamatLevel={params.tiamatLevel}
      />
    </>
  );
};
