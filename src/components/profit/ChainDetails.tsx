import { useMemo } from "react";
import { RecipeTreeNode, useTreeExpansion } from "../tree";
import { CHAIN_BATCH_SIZE, type ChainResult, type ChainRow } from "../../services";
import { formatLargeNumber, formatQuantity } from "../../utilities";
import type { Data } from "../../types/types";
import { ShardName } from "./controls";

/**
 * A Fusion chains row opened up: the cheapest fusion tree for a batch of the shard, drawn with
 * the calculator's tree, and the shopping list of raw shards it needs.
 */
export const ChainDetails = ({ row, chains, data, buyPrices }: { row: ChainRow; chains: ChainResult; data: Data; buyPrices: Record<string, number> }) => {
  const tree = useMemo(() => chains.treeFor(row.outputId), [chains, row.outputId]);
  const { expandedStates, toggle } = useTreeExpansion(row.outputId);
  const materials = [...row.materials].sort(([, a], [, b]) => b - a);
  const materialCost = materials.reduce((sum, [shardId, amount]) => sum + amount * (buyPrices[shardId] ?? 0), 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_auto] whitespace-normal">
      <div className="min-w-0 space-y-2">
        <div className="text-xs text-slate-400">
          Cheapest way to make {CHAIN_BATCH_SIZE} with your Crocodile level, buying every raw shard instantly. Click a step to expand it.
        </div>
        {/* The tree's coin labels read rate as a price here: chains price every shard at its buy price. */}
        <RecipeTreeNode
          tree={tree}
          data={chains.pricedData}
          isTopLevel
          nodeId={`chain-${row.outputId}`}
          expandedStates={expandedStates}
          onToggle={toggle}
          ironManView={false}
        />
      </div>
      <div className="min-w-[16rem] space-y-1">
        <h4 className="text-sm font-semibold text-white">Shopping list</h4>
        <table className="w-full text-xs">
          <tbody>
            {materials.map(([shardId, amount]) => (
              <tr key={shardId} className="border-b border-slate-700/50">
                <td className="py-1 pr-2">
                  <ShardName data={data} shardId={shardId} />
                </td>
                <td className="py-1 px-2 text-right text-slate-300">{formatQuantity(amount)}×</td>
                <td className="py-1 pl-2 text-right text-slate-400">{formatLargeNumber(amount * (buyPrices[shardId] ?? 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between text-xs pt-1">
          <span className="text-slate-400">
            {row.fusionsPerBatch} fusion{row.fusionsPerBatch === 1 ? "" : "s"}, total
          </span>
          <span className="font-medium text-white">{formatLargeNumber(materialCost)}</span>
        </div>
      </div>
    </div>
  );
};
