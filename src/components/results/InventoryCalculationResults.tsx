import { useState } from "react";
import type { InventoryCalculationResult, Data, CalculationParams, RecipeOverride } from "../../types/types";
import { useCopyToClipboard } from "../../hooks";
import { CopyTreeModal } from "../modals";
import { InventoryRecipeTreeNode } from "../tree";
import { ResultSummaryCards } from "./ResultSummaryCards";
import { MaterialsNeeded } from "./MaterialsNeeded";
import { FusionTreePanel } from "./FusionTreePanel";
import { ShardsUsed } from "./ShardsUsed";
import { noFrillsTreeString, skyHanniTreeString } from "./treeExport";

interface InventoryCalculationResultsProps {
  result: InventoryCalculationResult;
  data: Data;
  targetShardName: string;
  targetShard: string;
  ironManView: boolean;
  expandedStates: Map<string, boolean>;
  onToggle: (nodeId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  params: CalculationParams;
  recipeOverrides: RecipeOverride[];
  onRecipeOverridesUpdate: (overrides: RecipeOverride[]) => void;
  onShowActiveAlternatives: () => void;
  inventory: Map<string, number>;
  disabledShards: Set<string>;
  onDisabledShardsChange: (disabled: Set<string>) => void;
}

/** Results of an inventory-aware calculation: like the standard view, plus the owned shards it consumes. */
export const InventoryCalculationResults = ({
  result,
  data,
  targetShardName,
  targetShard,
  ironManView,
  expandedStates,
  onToggle,
  onExpandAll,
  onCollapseAll,
  params,
  recipeOverrides,
  onRecipeOverridesUpdate,
  onShowActiveAlternatives,
  inventory,
  disabledShards,
  onDisabledShardsChange,
}: InventoryCalculationResultsProps) => {
  const { tree } = result;
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const copyToClipboard = useCopyToClipboard();

  return (
    <div className="space-y-3">
      <ResultSummaryCards result={result} data={data} targetShard={targetShard} ironManView={ironManView} />

      {result.totalQuantities.size > 0 && (
        <MaterialsNeeded
          totalQuantities={result.totalQuantities}
          data={data}
          params={params}
          targetShardName={targetShardName}
          totalShardsProduced={result.totalShardsProduced}
          craftsNeeded={result.craftsNeeded}
          ironManView={ironManView}
        />
      )}

      {result.remainingInventory && (
        <ShardsUsed
          inventory={inventory}
          remainingInventory={result.remainingInventory}
          data={data}
          disabledShards={disabledShards}
          onDisabledShardsChange={onDisabledShardsChange}
        />
      )}

      {tree && (
        <FusionTreePanel
          params={params}
          recipeOverrides={recipeOverrides}
          onRecipeOverridesUpdate={onRecipeOverridesUpdate}
          onShowActiveAlternatives={onShowActiveAlternatives}
          onExpandAll={onExpandAll}
          onCollapseAll={onCollapseAll}
          onCopyTree={() => setCopyModalOpen(true)}
        >
          {(showAlternatives) => (
            <InventoryRecipeTreeNode
              tree={tree}
              data={data}
              isTopLevel
              totalShardsProduced={result.totalShardsProduced}
              nodeId="root"
              expandedStates={expandedStates}
              onToggle={onToggle}
              onShowAlternatives={showAlternatives}
              ironManView={ironManView}
              remainingInventory={result.remainingInventory}
            />
          )}
        </FusionTreePanel>
      )}

      {tree && (
        <CopyTreeModal
          open={copyModalOpen}
          onClose={() => setCopyModalOpen(false)}
          onCopyNoFrills={() => void copyToClipboard(noFrillsTreeString(tree, data), "NoFrills")}
          onCopySkyHanni={() => void copyToClipboard(skyHanniTreeString(tree, data), "SkyHanni")}
          note="Shards covered by your inventory are left out, so the export only lists what you still need to get."
        />
      )}
    </div>
  );
};
