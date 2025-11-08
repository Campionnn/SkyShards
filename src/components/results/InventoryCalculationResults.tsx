import React from "react";
import { Clock, Coins, Hammer, Target, BarChart3, TicketPercent } from "lucide-react";
import { formatLargeNumber, formatNumber, formatTime } from "../../utilities";
import type { InventoryCalculationResult, Data } from "../../types/types";
import { InventoryRecipeTreeNode } from "../tree";
import { SummaryCard, MaterialItem } from "../ui";

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
}

export const InventoryCalculationResults: React.FC<InventoryCalculationResultsProps> = ({
  result,
  data,
  targetShardName,
  targetShard,
  ironManView,
  expandedStates,
  onToggle,
  onExpandAll,
  onCollapseAll,
}) => {

  return (
    <div className="space-y-3">
      {/* Summary Cards */}
      <div className={`grid grid-cols-2 ${ironManView ? "lg:grid-cols-4" : "lg:grid-cols-5"} gap-3`}>
        {ironManView && (
          <>
            <SummaryCard icon={Clock} iconColor="text-purple-400" label="Time per Shard" value={formatTime(result.timePerShard)} />
            <SummaryCard icon={Target} iconColor="text-blue-400" label="Total Time" value={formatTime(result.totalTime)} />
          </>
        )}
        {!ironManView && (
          <>
            <SummaryCard icon={Coins} iconColor="text-yellow-400" label="Cost per Shard" value={formatLargeNumber(result.timePerShard)} />
            <SummaryCard icon={Target} iconColor="text-blue-400" label="Total Cost" value={formatLargeNumber(result.totalTime)} />
            <SummaryCard
              icon={TicketPercent}
              iconColor="text-purple-400"
              label="Total Coins Saved"
              value={formatLargeNumber(result.totalShardsProduced * data.shards[targetShard].rate - result.totalTime)}
            />
          </>
        )}
        <SummaryCard icon={BarChart3} iconColor="text-green-400" label="Shards Produced" value={formatNumber(result.totalShardsProduced).toString()} />
        <SummaryCard
          icon={Hammer}
          iconColor="text-orange-400"
          label="Total Fusions"
          value={`${result.craftsNeeded}x`}
          additionalValue={ironManView ? formatTime(result.craftTime) : formatLargeNumber(result.craftTime)}
        />
      </div>

      {/* Materials Needed */}
      {result.totalQuantities && result.totalQuantities.size > 0 && (
        <div className="bg-slate-800 border border-slate-600 rounded-md p-3">
          <div className="flex flex-col sm:flex-row gap-2.5 flex-wrap items-start sm:items-center sm:justify-between mb-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <div className="p-1 bg-slate-700 rounded-md">
                <Hammer className="w-5 h-5 text-blue-400" />
              </div>
              Materials Needed
            </h3>
            <div className="px-3 py-1.5 flex gap-1 bg-sky-500/20 border border-sky-500/30 text-sky-400 text-sm font-medium rounded-md min-w-0">
              <span className="text-slate-300">{Math.floor(result.totalShardsProduced)}x</span>
              <span className="truncate">{targetShardName}</span>
              {result.craftsNeeded > 0 && (
                <span className="text-slate-400 whitespace-nowrap">
                  {Math.floor(result.craftsNeeded)} craft{Math.floor(result.craftsNeeded) > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {Array.from(result.totalQuantities)
              .sort(([, quantityA], [, quantityB]) => quantityB - quantityA)
              .map(([shardId, quantity]) => {
                const shard = data.shards[shardId];
                if (!shard) return null;

                return <MaterialItem key={shardId} shard={shard} quantity={quantity} ironManView={ironManView} />;
              })}
          </div>
        </div>
      )}

      {/* Fusion Tree */}
      {result.tree && (
        <div className="bg-slate-800 border border-slate-600 rounded-md p-3">
          <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
            <div className="min-w-[810px]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <div className="p-1 bg-slate-700 rounded-md">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                  </div>
                  Optimal Fusion Path
                </h3>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={onExpandAll}
                    className="px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/20 hover:border-green-500/30"
                  >
                    <span>Expand All</span>
                  </button>
                  <button
                    onClick={onCollapseAll}
                    className="px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/20 hover:border-orange-500/30"
                  >
                    <span>Collapse All</span>
                  </button>
                </div>
              </div>
              <InventoryRecipeTreeNode
                tree={result.tree}
                data={data}
                isTopLevel={true}
                totalShardsProduced={result.totalShardsProduced}
                nodeId="root"
                expandedStates={expandedStates}
                onToggle={onToggle}
                ironManView={ironManView}
                remainingInventory={result.remainingInventory}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

