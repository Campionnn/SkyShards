import { useCallback, useState, type ReactNode } from "react";
import { CalculationService } from "../../services";
import { AlternativeRecipeModal } from "../modals";
import type { AlternativeRecipeOption, AlternativeSelectionContext, CalculationParams, Data, Recipe, RecipeOverride } from "../../types/types";

type Alternatives = { direct: AlternativeRecipeOption | null; grouped: Record<string, AlternativeRecipeOption[]> };

const NO_ALTERNATIVES: Alternatives = { direct: null, grouped: {} };

interface RecipeOverrideManagerProps {
  params: CalculationParams;
  recipeOverrides: RecipeOverride[];
  onRecipeOverridesUpdate: (overrides: RecipeOverride[]) => void;
  /** Renders the tree; call `showAlternatives` from a node to open the picker for it. */
  children: (showAlternatives: (shardId: string, context: AlternativeSelectionContext) => void) => ReactNode;
}

interface ModalState {
  isOpen: boolean;
  alternatives: Alternatives;
  shardId?: string;
  shardName?: string;
  loading: boolean;
  data?: Data;
  requiredQuantity?: number;
}

const CLOSED: ModalState = { isOpen: false, alternatives: NO_ALTERNATIVES, loading: false };

/** Owns the alternative-recipe modal for a tree and turns a pick into a recipe override. */
export const RecipeOverrideManager = ({ params, recipeOverrides, onRecipeOverridesUpdate, children }: RecipeOverrideManagerProps) => {
  const [modalState, setModalState] = useState<ModalState>(CLOSED);

  const closeModal = useCallback(() => setModalState(CLOSED), []);

  const showAlternatives = useCallback(
    async (shardId: string, context: AlternativeSelectionContext) => {
      setModalState({
        isOpen: true,
        alternatives: NO_ALTERNATIVES,
        shardId,
        shardName: shardId,
        loading: true,
        requiredQuantity: context.requiredQuantity,
      });

      try {
        const calculationService = CalculationService.getInstance();
        // An active override is what the tree currently uses, so mark that as current.
        const activeOverride = recipeOverrides.find((override) => override.shardId === shardId);
        const updatedContext = { ...context, currentRecipe: activeOverride ? activeOverride.recipe : context.currentRecipe };

        const alternatives = await calculationService.getAlternativesForTreeNode(shardId, params, updatedContext, recipeOverrides);
        const data = await calculationService.parseData(params);
        const shardName = data.shards[shardId]?.name || shardId;

        setModalState((prev) => ({ ...prev, alternatives, shardName, data, loading: false }));
      } catch (error) {
        console.error("Failed to load alternatives:", error);
        setModalState((prev) => ({ ...prev, alternatives: NO_ALTERNATIVES, loading: false }));
      }
    },
    [params, recipeOverrides],
  );

  const handleRecipeSelect = (selectedRecipe: Recipe | null) => {
    if (!modalState.shardId) return;
    try {
      onRecipeOverridesUpdate(CalculationService.getInstance().applyRecipeOverride(modalState.shardId, selectedRecipe, recipeOverrides));
      closeModal();
    } catch (error) {
      console.error("Failed to apply recipe override:", error);
    }
  };

  return (
    <>
      {children(showAlternatives)}
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
