import React from "react";
import { getRarityColor, getShardDetails } from "../../utils/index";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatNumber } from "../../utils/index";
import type { RecipeTreeNodeProps } from "../../types/index";

export const RecipeTreeNode: React.FC<RecipeTreeNodeProps> = ({ tree, data, isTopLevel = false, totalShardsProduced = tree.quantity, nodeId, expandedStates, onToggle }) => {
  const shard = data.shards[tree.shard];
  const isExpanded = expandedStates.get(nodeId) ?? true;

  if (tree.method === "direct") {
    return (
      <div className="flex items-center justify-between px-3 py-1 bg-slate-800 rounded-md border border-slate-600">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full" />
          <img src={`${import.meta.env.BASE_URL}shardIcons/${shard.id}.png`} alt={shard.name} className="w-6 h-6 object-contain flex-shrink-0" loading="lazy" />
          <div className="flex items-center space-x-2">
            <span className="text-slate-300 font-medium text-sm">{tree.quantity}x</span>
            <span className={`font-medium text-sm ${getRarityColor(shard.rarity)}`} title={getShardDetails(shard, true)}>
              {shard.name}
            </span>
            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-md">DIRECT</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-300">
            {formatNumber(shard.rate)}
            <span className="text-slate-500 mx-0.5">/</span>
            <span className="text-slate-400">hr</span>
          </div>
        </div>
      </div>
    );
  }

  const input1 = tree.inputs![0];
  const input2 = tree.inputs![1];
  const input1Shard = data.shards[input1.shard];
  const input2Shard = data.shards[input2.shard];
  const displayQuantity = isTopLevel ? totalShardsProduced : tree.quantity;

  return (
    <div className={`${isTopLevel ? "bg-slate-800 border border-slate-600" : "bg-slate-800 border border-slate-600"} rounded-md overflow-hidden`}>
      <button onClick={() => onToggle(nodeId)} className={`w-full px-3 py-1 text-left cursor-pointer hover:bg-slate-700/50 transition-colors`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            <img src={`${import.meta.env.BASE_URL}shardIcons/${shard.id}.png`} alt={shard.name} className="w-6 h-6 object-contain flex-shrink-0" loading="lazy" />
            <div className="text-white">
              <span className="font-medium text-sm">{displayQuantity}x </span>
              <span className={`font-medium ${getRarityColor(shard.rarity)} text-sm`} title={getShardDetails(shard, false)}>
                {shard.name}
              </span>
              <span className={"text-slate-400 ml-1.5 text-sm"}>
                = {input1.quantity}x <span className={getRarityColor(input1Shard.rarity)}>{input1Shard.name}</span> + {input2.quantity}x{" "}
                <span className={getRarityColor(input2Shard.rarity)}>{input2Shard.name}</span>
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end space-x-1.5">
              <span className="text-xs text-slate-500">fusions</span>
              <span className={`font-medium text-white ${isTopLevel ? "text-sm" : "text-xs"}`}>{displayQuantity}</span>
            </div>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-600 pl-3 pr-0.5 py-0.5 space-y-0.5">
          <RecipeTreeNode tree={input1} data={data} nodeId={`${nodeId}-0`} expandedStates={expandedStates} onToggle={onToggle} />
          <RecipeTreeNode tree={input2} data={data} nodeId={`${nodeId}-1`} expandedStates={expandedStates} onToggle={onToggle} />
        </div>
      )}
    </div>
  );
};
