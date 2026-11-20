import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import type { AlternativeSelectionContext, CalculationParams, RecipeOverride } from "../../types/types";
import { RecipeOverrideManager } from "../forms";

const BUTTON = "px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer border";

interface FusionTreePanelProps {
  params: CalculationParams;
  recipeOverrides: RecipeOverride[];
  onRecipeOverridesUpdate: (overrides: RecipeOverride[]) => void;
  onShowActiveAlternatives: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  /** Shows a "Copy Tree" button when set. */
  onCopyTree?: () => void;
  /** Renders the tree; `showAlternatives` opens the alternative-recipe picker for a node. */
  children: (showAlternatives: (shardId: string, context: AlternativeSelectionContext) => void) => ReactNode;
}

/** The "Fusion Tree" card: header buttons and the recipe-override picker around a tree. */
export const FusionTreePanel = ({
  params,
  recipeOverrides,
  onRecipeOverridesUpdate,
  onShowActiveAlternatives,
  onExpandAll,
  onCollapseAll,
  onCopyTree,
  children,
}: FusionTreePanelProps) => {
  // With the Copy button present the order flips on mobile so Collapse/Expand come first.
  // Literal class strings: Tailwind only emits classes it finds verbatim.
  const order = onCopyTree
    ? { alternatives: " order-3 sm:order-2", expand: " order-2 sm:order-3", collapse: " order-1 sm:order-4" }
    : { alternatives: "", expand: "", collapse: "" };

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-md p-3">
      <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        <div className="min-w-[810px]">
          <RecipeOverrideManager params={params} recipeOverrides={recipeOverrides} onRecipeOverridesUpdate={onRecipeOverridesUpdate}>
            {(showAlternatives) => (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <div className="p-1 bg-slate-700 rounded-md">
                      <BarChart3 className="w-5 h-5 text-purple-400" />
                    </div>
                    Fusion Tree
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {onCopyTree && (
                      <button
                        onClick={onCopyTree}
                        className={`${BUTTON} bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/20 hover:border-blue-500/30 order-4 sm:order-1`}
                      >
                        <span>Copy Tree</span>
                      </button>
                    )}
                    <button
                      onClick={onShowActiveAlternatives}
                      className={`${BUTTON} bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/20 hover:border-purple-500/30${order.alternatives}`}
                    >
                      <span>Alternatives{recipeOverrides.length > 0 ? ` (${recipeOverrides.length})` : ""}</span>
                    </button>
                    <button
                      onClick={onExpandAll}
                      className={`${BUTTON} bg-green-500/20 hover:bg-green-500/30 text-green-300 border-green-500/20 hover:border-green-500/30${order.expand}`}
                    >
                      <span>Expand All</span>
                    </button>
                    <button
                      onClick={onCollapseAll}
                      className={`${BUTTON} bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border-orange-500/20 hover:border-orange-500/30${order.collapse}`}
                    >
                      <span>Collapse All</span>
                    </button>
                  </div>
                </div>
                {children(showAlternatives)}
              </>
            )}
          </RecipeOverrideManager>
        </div>
      </div>
    </div>
  );
};
