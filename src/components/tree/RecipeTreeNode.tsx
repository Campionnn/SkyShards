import React from "react";
import { getRarityColor, getShardDetails } from "../../utils/index";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatNumber } from "../../utils/index";
import type { RecipeTreeNodeProps } from "../../types/index";

export const RecipeTreeNode: React.FC<RecipeTreeNodeProps> = ({
                                                                tree,
                                                                data,
                                                                isTopLevel = false,
                                                                totalShardsProduced = tree.quantity,
                                                                nodeId,
                                                                expandedStates,
                                                                onToggle
                                                              }) => {
  const shard = data.shards[tree.shard];

  if (tree.method === "cycle") {
        const isExpanded = expandedStates.get(nodeId) ?? true;
        const shard = data.shards[tree.shard];

        return (
            <div className="flex flex-col border border-amber-700 rounded-md bg-amber-900/40">
                <button
                    className="flex items-center justify-between w-full px-3 py-1 text-left cursor-pointer hover:bg-amber-800/40 transition-colors"
                    onClick={() => onToggle(nodeId)}
                >
                    <div className="flex items-center space-x-2">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4 text-amber-400" />}
                        <div className="flex flex-col">
                            <div className="flex items-center space-x-2">
                                <span className="text-slate-300 font-medium text-sm">{tree.quantity}x</span>
                                <span className={`font-medium text-sm ${getRarityColor(shard.rarity)}`}>
                                {shard.name}
                            </span>
                                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-md">
                                CYCLE
                            </span>
                            </div>
                            <div className="text-xs text-amber-300 mt-1">
                                {tree.cycles.reduce((sum, cycle) => sum + cycle.expectedCrafts, 0) * 2} runs
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-slate-300">
                            {formatNumber(shard.rate)}
                            <span className="text-slate-500 mx-0.5">/</span>
                            <span className="text-slate-400">hr</span>
                        </div>
                        <div className="text-xs text-slate-400 capitalize">
                            {shard.type} • {shard.family}
                        </div>
                    </div>
                </button>

                {isExpanded && tree.cycles.length > 0 && (
                    <div className="border-t border-amber-700 pl-4 pr-0.5 py-0.5 space-y-2">
                        {tree.cycles.map((cycle, cycleIndex) => (
                            <div key={cycleIndex} className="pt-2">
                                <div className="text-xs font-semibold text-amber-400 pb-1">
                                </div>
                                <div className="space-y-1.5">
                                    {cycle.steps.map((step, stepIndex) => {
                                        const recipe = step.recipe;
                                        const outputShardData = data.shards[step.outputShard];
                                        const input1Shard = data.shards[recipe.inputs[0]];
                                        const input2Shard = data.shards[recipe.inputs[1]];

                                        // Calculate quantities
                                        const input1Quantity = input1Shard.fuse_amount;
                                        const input2Quantity = input2Shard.fuse_amount;
                                        let outputQuantity = recipe.outputQuantity;
                                        if (recipe.isReptile) {
                                            outputQuantity = outputQuantity * cycle.multiplier;
                                        }

                                        return (
                                            <div key={stepIndex} className="p-2 bg-amber-800/20 rounded border border-amber-700/50">
                                                <div className="text-sm font-medium text-amber-200">
                                                    Step {stepIndex+1}: {outputShardData.name}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-1 text-sm">
                                                    <span className={`${getRarityColor(input1Shard.rarity)}`}>{input1Shard.name}</span>
                                                    <span className="text-slate-400">x {input1Quantity}</span>
                                                    <span> + </span>
                                                    <span className={`${getRarityColor(input2Shard.rarity)}`}>{input2Shard.name}</span>
                                                    <span className="text-slate-400">x {input2Quantity}</span>
                                                    <span> → </span>
                                                    <span className={`${getRarityColor(outputShardData.rarity)}`}>{outputShardData.name}</span>
                                                    <span className="text-slate-400">x {outputQuantity}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

  // Direct nodes remain the same
  if (tree.method === "direct") {
    return (
      <div className="flex items-center justify-between px-3 py-1 bg-slate-800 rounded-md border border-slate-600">
        <div className="flex items-center space-x-2 p-0.5">
          <div className="w-2 h-2 bg-green-400 rounded-full" />
          <span className="text-slate-300 font-medium text-sm">{tree.quantity}x</span>
          <img src={`${import.meta.env.BASE_URL}shardIcons/${shard.id}.png`} alt={shard.name} className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
          <span className={`font-medium text-sm ${getRarityColor(shard.rarity)}`} title={getShardDetails(shard, true)}>
            {shard.name}
          </span>
          <span className="px-1 py-0.4 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-md flex-shrink-0">Direct</span>
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

  // Recipe nodes with expand/collapse functionality
  const isExpanded = expandedStates.get(nodeId) ?? true;
  const input1 = tree.inputs![0];
  const input2 = tree.inputs![1];
  const input1Shard = data.shards[input1.shard];
  const input2Shard = data.shards[input2.shard];
  const displayQuantity = isTopLevel ? totalShardsProduced : tree.quantity;

  return (
    <div className={`${isTopLevel ? "bg-slate-800 border border-slate-600" : "bg-slate-800 border border-slate-600"} rounded-md overflow-hidden`}>
      <button onClick={() => onToggle(nodeId)} className={`w-full px-3 py-1 text-left cursor-pointer hover:bg-slate-700/50 transition-colors`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 p-0.5">
            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            <div className="text-white flex items-center">
              <span className="font-medium text-sm">{displayQuantity}x</span>
              <img
                src={`${import.meta.env.BASE_URL}shardIcons/${shard.id}.png`}
                alt={shard.name}
                className="w-5 h-5 object-contain inline-block align-middle mx-2 flex-shrink-0"
                loading="lazy"
                style={{ verticalAlign: "middle" }}
              />
              <span className={`font-medium ${getRarityColor(shard.rarity)} text-sm whitespace-nowrap truncate`} style={{ maxWidth: "8rem" }} title={getShardDetails(shard, false)}>
                {shard.name}
              </span>
              <span className="text-slate-400 text-sm font-medium flex items-center">
                <span className="mx-2 text-white">=</span>
                <span>{input1.quantity}x</span>
                <img
                  src={`${import.meta.env.BASE_URL}shardIcons/${input1Shard.id}.png`}
                  alt={input1Shard.name}
                  className="w-5 h-5 object-contain inline-block align-middle mx-2 flex-shrink-0"
                  loading="lazy"
                  style={{ verticalAlign: "middle" }}
                />
                <span className={getRarityColor(input1Shard.rarity) + " whitespace-nowrap truncate"} style={{ maxWidth: "8rem" }}>
                  {input1Shard.name}
                </span>
                <span className="mx-2 text-white">+</span>
                <span>{input2.quantity}x</span>
                <img
                  src={`${import.meta.env.BASE_URL}shardIcons/${input2Shard.id}.png`}
                  alt={input2Shard.name}
                  className="w-5 h-5 object-contain inline-block align-middle mx-2 flex-shrink-0"
                  loading="lazy"
                  style={{ verticalAlign: "middle" }}
                />
                <span className={getRarityColor(input2Shard.rarity) + " whitespace-nowrap truncate"} style={{ maxWidth: "8rem" }}>
                  {input2Shard.name}
                </span>
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end space-x-1.5">
              <span className="text-xs text-slate-500">fusions</span>
              <span className={`font-medium text-white ${isTopLevel ? "text-xs" : "text-xs"}`}>{displayQuantity}</span>
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