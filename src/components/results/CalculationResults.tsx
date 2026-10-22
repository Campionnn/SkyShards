import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import type { CalculationParams, CalculationResult, Data, RecipeOverride, Shard } from "../../types/types";
import { useCopyToClipboard } from "../../hooks";
import { CopyTreeModal } from "../modals";
import { ResultSummaryCards } from "./ResultSummaryCards";
import { FusionTreeView } from "./FusionTreeView";
import { MaterialTreeSelector } from "./MaterialTreeSelector";
import { FusionTreeSortDropdown, type FusionTreeSort } from "./FusionTreeSortDropdown";
import { MaterialsNeeded } from "./MaterialsNeeded";
import { noFrillsMaterialsString, skyHanniMaterialsString } from "./treeExport";

interface CalculationResultsProps {
  result: CalculationResult;
  data: Data;
  targetShardName: string;
  targetShard: string;
  params: CalculationParams;
  recipeOverrides: RecipeOverride[];
  onRecipeOverridesUpdate: (overrides: RecipeOverride[]) => void;
  onShowActiveAlternatives: () => void;
  ironManView: boolean;
  materialsOnly?: boolean;
  /** Multi-shard mode: each selected shard's own result, so its tree can be viewed. */
  materialShardResults?: Map<string, CalculationResult>;
  materialTreeShardKey?: string;
  onMaterialTreeShardChange?: (key: string) => void;
}

const byName = (a: Shard, b: Shard) => a.name.localeCompare(b.name);

/** Unknown times sort last. */
const byShortestTime = (results: Map<string, CalculationResult>) => (a: Shard, b: Shard) => {
  const timeA = results.get(a.id)?.totalTime;
  const timeB = results.get(b.id)?.totalTime;
  if (timeA === undefined) return timeB === undefined ? 0 : 1;
  if (timeB === undefined) return -1;
  return timeA - timeB;
};

export const CalculationResults = ({
  result,
  data,
  targetShardName,
  targetShard,
  params,
  recipeOverrides,
  onRecipeOverridesUpdate,
  onShowActiveAlternatives,
  ironManView,
  materialsOnly = false,
  materialShardResults,
  materialTreeShardKey = "",
  onMaterialTreeShardChange,
}: CalculationResultsProps) => {
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [materialTreeSort, setMaterialTreeSort] = useState<FusionTreeSort>("default");
  const copyToClipboard = useCopyToClipboard();

  // The selected target shards, offered for viewing one tree at a time.
  const sortedShards = useMemo<Shard[]>(() => {
    if (!materialShardResults) return [];
    const shards = Array.from(materialShardResults.keys())
      .filter((key) => data.shards[key])
      .map((key) => ({ ...data.shards[key], key }));

    switch (materialTreeSort) {
      case "shortest":
        return shards.sort(byShortestTime(materialShardResults));
      case "rarity":
        // Not implemented: keeps the order the shards were selected in.
        return shards;
      default:
        return shards.sort(byName);
    }
  }, [materialShardResults, data, materialTreeSort]);

  const selectedTreeResult = materialTreeShardKey ? materialShardResults?.get(materialTreeShardKey) : undefined;

  const treeProps = { data, params, recipeOverrides, onRecipeOverridesUpdate, onShowActiveAlternatives, ironManView };

  return (
    <div className="space-y-3">
      <ResultSummaryCards result={result} data={data} targetShard={targetShard} ironManView={ironManView} materialsOnly={materialsOnly} />

      <MaterialsNeeded
        totalQuantities={result.totalQuantities}
        data={data}
        params={params}
        targetShardName={targetShardName}
        totalShardsProduced={result.totalShardsProduced}
        craftsNeeded={result.craftsNeeded}
        ironManView={ironManView}
        materialBreakdown={materialsOnly ? result.materialBreakdown : undefined}
        actions={
          materialsOnly && (
            <button
              onClick={() => setCopyModalOpen(true)}
              className="px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/20 hover:border-purple-500/30"
            >
              <span>Copy Materials</span>
            </button>
          )
        }
      />

      {/* Multi-shard mode: pick one of the shards to view its tree */}
      {materialsOnly && sortedShards.length > 0 && (
        <div className="bg-slate-800 border border-slate-600 rounded-md p-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-slate-700 rounded-md">
              <BarChart3 className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">View Fusion Tree</h3>
          </div>
          <p className="text-sm text-slate-400">Select one of your shards to view its full fusion tree. Alternatives you set here apply to every shard.</p>
          <div className="flex items-center gap-2">
            <MaterialTreeSelector
              shards={sortedShards}
              shardCalculationData={materialShardResults}
              value={materialTreeShardKey}
              onChange={(key) => onMaterialTreeShardChange?.(key)}
            />
            <FusionTreeSortDropdown value={materialTreeSort} onChange={setMaterialTreeSort} />
          </div>
        </div>
      )}
      {materialsOnly && selectedTreeResult && data.shards[materialTreeShardKey] && (
        <>
          <ResultSummaryCards result={selectedTreeResult} data={data} targetShard={materialTreeShardKey} ironManView={ironManView} />
          <FusionTreeView result={selectedTreeResult} {...treeProps} />
        </>
      )}

      {!materialsOnly && result.tree && <FusionTreeView result={result} {...treeProps} />}

      <CopyTreeModal
        open={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        onCopySkyOcean={() => void copyToClipboard("", "SkyOcean", "list")}
        onCopyNoFrills={() => void copyToClipboard(noFrillsMaterialsString(result.totalQuantities, data), "NoFrills", "list")}
        onCopySkyHanni={() => void copyToClipboard(skyHanniMaterialsString(result.totalQuantities, data), "SkyHanni", "list")}
        materialsOnly
      />
    </div>
  );
};
