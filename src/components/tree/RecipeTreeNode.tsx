import React from "react";
import { getRarityColor, getShardDetails } from "../../utils/index";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatNumber } from "../../utils/index";
import type { RecipeTreeNodeProps } from "../../types/index";

export const RecipeTreeNode: React.FC<RecipeTreeNodeProps> = ({ tree, data, isTopLevel = false, totalShardsProduced = tree.quantity, nodeId, expandedStates, onToggle }) => {
  const shard = data.shards[tree.shard];

  if (tree.method === "cycle") {
    const isExpanded = expandedStates.get(nodeId) ?? true;
    const shard = data.shards[tree.shard];
    const runCount = tree.cycles.reduce((sum, cycle) => sum + cycle.expectedCrafts, 0) * 2;

    return (
      <div className="flex flex-col border border-slate-400/70 rounded-md bg-slate-500/40">
        <button className="flex items-center justify-between w-full px-3 py-1.5 text-left cursor-pointer hover:bg-slate-800/40 transition-colors" onClick={() => onToggle(nodeId)}>
          <div className="flex items-center space-x-2">
            {isExpanded ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4 text-amber-400" />}
            <div className="flex items-center gap-3">
              <div className="text-xs text-amber-300">{runCount} crafts</div>
              <div className="w-1.5 h-1.5 bg-slate-50 rounded-full"></div>
              <div className="flex items-center space-x-2">
                <span className="text-white font-medium text-sm">{Math.floor(tree.quantity)}x</span>
                <img src={`${import.meta.env.BASE_URL}shardIcons/${shard.id}.png`} alt={shard.name} className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
                <span className={`font-medium text-sm ${getRarityColor(shard.rarity)}`}>{shard.name}</span>
                <span className="px-1 bg-amber-500/20 text-amber-400 border border-amber-400/40 text-[11px] font-medium rounded-md">CYCLE !</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-300">
              {formatNumber(shard.rate)}
              <span className="text-slate-500 mx-0.5">/</span>
              <span className="text-slate-400">hr</span>
            </div>
          </div>
        </button>

        {isExpanded && tree.cycles.length > 0 && (
          <div className="border-t border-slate-400/70 pl-3 pr-0.5 py-0.5 space-y-2">
            {tree.cycles.map((cycle, cycleIndex) => (
              <div key={cycleIndex} className="">
                <div className="text-xs font-semibold text-amber-400"></div>
                <div className="space-y-0.5">
                  {[...cycle.steps]
                    .slice()
                    .reverse()
                    .map((step, stepIndex) => {
                      // Calculate quantities
                      const recipe = step.recipe;
                      const outputShardData = data.shards[step.outputShard];
                      const input1Shard = data.shards[recipe.inputs[0]];
                      const input2Shard = data.shards[recipe.inputs[1]];
                      const input1Quantity = input1Shard.fuse_amount;
                      const input2Quantity = input2Shard.fuse_amount;
                      let outputQuantity = recipe.outputQuantity;
                      if (recipe.isReptile) {
                        outputQuantity = outputQuantity * cycle.multiplier;
                      }
                      // Step number should be from the end (so Step 2, Step 1, ...)
                      const stepNumber = cycle.steps.length - stepIndex;
                      return (
                        <div key={stepIndex}>
                          <div className="px-3 py-1.5 bg-slate-600/20 rounded border border-slate-300/50 flex items-center justify-between">
                            <div className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
                              <span className="font-normal text-xs text-amber-300">Step {stepNumber} :</span>
                              <span className="text-white">{outputQuantity}x</span>
                              <img src={`${import.meta.env.BASE_URL}shardIcons/${outputShardData.id}.png`} alt={outputShardData.name} className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
                              <span className={`${getRarityColor(outputShardData.rarity)}`}>{outputShardData.name}</span>
                              <span> = </span>
                              <span className="text-slate-400">{input1Quantity}x</span>
                              <img src={`${import.meta.env.BASE_URL}shardIcons/${input1Shard.id}.png`} alt={input1Shard.name} className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
                              <span className={`${getRarityColor(input1Shard.rarity)}`}>{input1Shard.name}</span>
                              <span> + </span>
                              <span className="text-slate-400">{input2Quantity}x</span>
                              <img src={`${import.meta.env.BASE_URL}shardIcons/${input2Shard.id}.png`} alt={input2Shard.name} className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
                              <span className={`${getRarityColor(input2Shard.rarity)}`}>{input2Shard.name}</span>
                            </div>
                            <div className="text-right min-w-[80px] ml-2">
                              <span className="text-slate-300 text-xs font-medium">{formatNumber(outputShardData.rate)}</span>
                              <span className="text-slate-500 text-xs mx-0.5">/</span>
                              <span className="text-slate-400 text-xs">hr</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
                {/* Generalized summary for all unique input shards in the cycle */}
                {(() => {
                  // Exclude input shards that are also output shards in any step of this cycle
                  const outputShardIds = new Set(cycle.steps.map((step) => step.outputShard));
                  const inputShardTotals: Record<string, { quantity: number; shard: any }> = {};
                  cycle.steps.forEach((step) => {
                    const recipe = step.recipe;
                    recipe.inputs.forEach((inputId: string) => {
                      const inputShard = data.shards[inputId];
                      if (!inputShard) return;
                      // Exclude if this input is also an output in this cycle
                      if (outputShardIds.has(inputId)) return;
                      if (!inputShardTotals[inputId]) {
                        inputShardTotals[inputId] = { quantity: 0, shard: inputShard };
                      }
                      inputShardTotals[inputId].quantity = inputShard.fuse_amount;
                    });
                  });
                  // Always show the summary div, only unique shards by id
                  return (
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      {Object.values(inputShardTotals).map(({ quantity, shard }) => (
                        <div key={shard.id} className="bg-slate-600/20 rounded border border-slate-300/50 flex items-center justify-between px-3 py-1.5 text-sm font-medium gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2 h-2 bg-green-400 rounded-full" />
                            <span className="text-slate-300 font-medium text-sm">{quantity * runCount}x</span>
                            <img src={`${import.meta.env.BASE_URL}shardIcons/${shard.id}.png`} alt={shard.name} className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
                            <span className={getRarityColor(shard.rarity)}>{shard.name}</span>
                            <span className="px-1 py-0.4 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-md flex-shrink-0">Direct</span>
                          </div>
                          <div className="text-right min-w-[80px] ml-2">
                            <span className="text-slate-300 text-xs font-medium">{formatNumber(shard.rate)}</span>
                            <span className="text-slate-500 text-xs mx-0.5">/</span>
                            <span className="text-slate-400 text-xs">hr</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
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
              <span className="font-medium text-sm">{Math.floor(displayQuantity)}x</span>
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
                <span>{Math.floor(input1.quantity)}x</span>
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
                <span>{Math.floor(input2.quantity)}x</span>
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
