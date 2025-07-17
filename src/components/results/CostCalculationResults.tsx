import React, { useState } from "react";
import { Clock, Hammer, Target, BarChart3 } from "lucide-react";
import { formatMoney, formatTime } from "../../utilities";
import type { RecipeTree, CalculationResultsProps } from "../../types/types";
import { CostRecipeTreeNode } from "../tree";
import { SummaryCard, CostMaterialItem } from "../ui";

// Utility function to manage expanded states
const useTreeExpansion = (tree: RecipeTree | null) => {
  const [expandedStates, setExpandedStates] = useState<Map<string, boolean>>(new Map());
  const [lastTreeHash, setLastTreeHash] = useState<string>("");

  const initializeExpandedStates = (tree: RecipeTree, nodeId: string = "root"): Map<string, boolean> => {
    const states = new Map<string, boolean>();
    const traverse = (node: RecipeTree, id: string) => {
      if (node.method === "recipe" && node.inputs) {
        states.set(id, true);
        node.inputs.forEach((input, index) => {
          traverse(input, `${id}-${index}`);
        });
      }
    };
    traverse(tree, nodeId);
    return states;
  };

  React.useEffect(() => {
    if (tree) {
      const treeHash = JSON.stringify(tree);
      if (treeHash !== lastTreeHash) {
        const initialStates = initializeExpandedStates(tree);
        setExpandedStates(initialStates);
        setLastTreeHash(treeHash);
      }
    }
  }, [tree, lastTreeHash]);

  const handleExpandAll = () => {
    const newStates = new Map(expandedStates);
    for (const key of newStates.keys()) {
      newStates.set(key, true);
    }
    setExpandedStates(newStates);
  };

  const handleCollapseAll = () => {
    const newStates = new Map(expandedStates);
    for (const key of newStates.keys()) {
      newStates.set(key, false);
    }
    setExpandedStates(newStates);
  };

  const handleNodeToggle = (nodeId: string) => {
    const newStates = new Map(expandedStates);
    newStates.set(nodeId, !newStates.get(nodeId));
    setExpandedStates(newStates);
  };

  return { expandedStates, handleExpandAll, handleCollapseAll, handleNodeToggle };
};

export const CostCalculationResults: React.FC<CalculationResultsProps> = ({
  result,
  data,
  targetShardName,
}) => {
  const { expandedStates, handleExpandAll, handleCollapseAll, handleNodeToggle } = useTreeExpansion(result.tree);

  return (
    <div className="space-y-3">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard icon={Clock} iconColor="text-purple-400" label="Cost per Shard" value={formatMoney(result.timePerShard)} />
        <SummaryCard icon={Target} iconColor="text-blue-400" label="Total Cost" value={formatMoney(result.totalTime)} />
        <SummaryCard icon={BarChart3} iconColor="text-green-400" label="Coins Saved" value={"idk"} />
        <SummaryCard
          icon={Hammer}
          iconColor="text-orange-400"
          label="Total Fusions"
          value={`${result.totalFusions}x`}
          additionalValue={result.craftTime > 1 / 12 ? formatTime(result.craftTime) : undefined}
        />
      </div>
      {/* Materials Needed */}
      <div className="bg-slate-800 border border-slate-600 rounded-md p-3">
        <div className="flex flex-col sm:flex-row gap-2.5 flex-wrap items-start sm:items-center sm:justify-between mb-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <div className="p-1 bg-slate-700 rounded-md">
              <Hammer className="w-5 h-5 text-blue-400" />
            </div>
            Materials Needed
          </h3>
          <div className="flex gap-2">
            <div className="px-3 py-1.5 flex gap-1 bg-sky-500/20 border border-sky-500/30 text-sky-400 text-sm font-medium rounded-md min-w-0">
              <span className="text-slate-300">{Math.floor(result.totalShardsProduced)}x</span>
              <span className="truncate">{targetShardName}</span>
              <span className="text-slate-400 whitespace-nowrap">
                {Math.floor(result.craftsNeeded)} craft{Math.floor(result.craftsNeeded) > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {Array.from(result.totalQuantities).map(([shardId, quantity]) => {
            const shard = data.shards[shardId];
            return <CostMaterialItem key={shardId} shard={shard} quantity={quantity} />;
          })}
        </div>
      </div>{" "}
      {/* Fusion Tree */}
      <div className="bg-slate-800 border border-slate-600 rounded-md p-3">
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          <div className="min-w-[650px]">
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <div className="p-1 bg-slate-700 rounded-md">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                  </div>
                  Fusion Tree
                </h3>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleExpandAll}
                    className="px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/20 hover:border-green-500/30 order-2 sm:order-2"
                  >
                    <span>Expand All</span>
                  </button>
                  <button
                    onClick={handleCollapseAll}
                    className="px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/20 hover:border-orange-500/30 order-1 sm:order-3"
                  >
                    <span>Collapse All</span>
                  </button>
                </div>
              </div>
              <CostRecipeTreeNode
                tree={result.tree}
                data={data}
                isTopLevel={true}
                totalShardsProduced={result.totalShardsProduced}
                nodeId="root"
                expandedStates={expandedStates}
                onToggle={handleNodeToggle}
              />
            </>
          </div>
        </div>
      </div>
    </div>
  );
};
