import { useMemo, useState } from "react";
import type { CalculationResult, CalculationParams, Data, RecipeOverride } from "../../types/types";
import { RecipeTreeNode, useTreeExpansion } from "../tree";
import { useCopyToClipboard } from "../../hooks";
import { CopyTreeModal } from "../modals";
import { FusionTreePanel } from "./FusionTreePanel";
import { noFrillsTreeString, skyHanniTreeString, skyOceanTreeString } from "./treeExport";

interface FusionTreeViewProps {
  result: CalculationResult;
  data: Data;
  params: CalculationParams;
  recipeOverrides: RecipeOverride[];
  onRecipeOverridesUpdate: (overrides: RecipeOverride[]) => void;
  onShowActiveAlternatives: () => void;
  ironManView: boolean;
}

/** The fusion tree of a standard (non-inventory) result, with copy-to-mod export. */
export const FusionTreeView = ({
  result,
  data,
  params,
  recipeOverrides,
  onRecipeOverridesUpdate,
  onShowActiveAlternatives,
  ironManView,
}: FusionTreeViewProps) => {
  // Keyed by content, not identity: a recalculation that yields the same tree keeps what the user expanded.
  const treeKey = useMemo(() => JSON.stringify(result.tree), [result.tree]);
  const { expandedStates, toggle, expandAll, collapseAll } = useTreeExpansion(treeKey);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const copyToClipboard = useCopyToClipboard();

  const { tree } = result;
  if (!tree) return null;

  return (
    <>
      <FusionTreePanel
        params={params}
        recipeOverrides={recipeOverrides}
        onRecipeOverridesUpdate={onRecipeOverridesUpdate}
        onShowActiveAlternatives={onShowActiveAlternatives}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        onCopyTree={() => setCopyModalOpen(true)}
      >
        {(showAlternatives) => (
          <RecipeTreeNode
            tree={tree}
            data={data}
            isTopLevel
            totalShardsProduced={result.totalShardsProduced}
            nodeId="root"
            expandedStates={expandedStates}
            onToggle={toggle}
            onShowAlternatives={showAlternatives}
            ironManView={ironManView}
          />
        )}
      </FusionTreePanel>
      <CopyTreeModal
        open={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        onCopySkyOcean={() => void copyToClipboard(skyOceanTreeString(tree), "SkyOcean")}
        onCopyNoFrills={() => void copyToClipboard(noFrillsTreeString(tree, data), "NoFrills")}
        onCopySkyHanni={() => void copyToClipboard(skyHanniTreeString(tree, data), "SkyHanni")}
      />
    </>
  );
};
