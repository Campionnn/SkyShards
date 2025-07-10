import React, { useState } from "react";
import { Clock, Hammer, Target, BarChart3 } from "lucide-react";
import { formatTime, formatNumber, getRarityColor, formatShardDescription } from "../utils";
import type { RecipeTree } from "../types";
import type { CalculationResultsProps } from "../types";
import { RecipeTreeNode } from "./tree/RecipeTreeNode";
import { RecipeOverrideManager } from "./RecipeOverrideManager";
import { Tooltip } from "./Tooltip";
import { SHARD_DESCRIPTIONS } from "../constants";

export const CalculationResults: React.FC<CalculationResultsProps> = ({ result, data, targetShardName, targetShard, requiredQuantity, params, onResultUpdate }) => {
  const [expandedStates, setExpandedStates] = useState<Map<string, boolean>>(new Map());
  const [lastTreeHash, setLastTreeHash] = useState<string>("");

  // Initialize expanded states for all nodes (default to true)
  const initializeExpandedStates = (tree: RecipeTree, nodeId: string = "root"): Map<string, boolean> => {
    const states = new Map<string, boolean>();

    const traverse = (node: RecipeTree, id: string) => {
      if (node.method === "recipe" && node.inputs) {
        states.set(id, true); // Default to expanded
        node.inputs.forEach((input, index) => {
          traverse(input, `${id}-${index}`);
        });
      }
    };

    traverse(tree, nodeId);
    return states;
  };

  // Initialize states when result changes
  React.useEffect(() => {
    if (result.tree) {
      const treeHash = JSON.stringify(result.tree);
      if (treeHash !== lastTreeHash) {
        const initialStates = initializeExpandedStates(result.tree);
        setExpandedStates(initialStates);
        setLastTreeHash(treeHash);
      }
    }
  }, [result.tree, lastTreeHash]);

  const handleExpandAll = () => {
    const newStates = new Map(expandedStates);

    // Set all states to true (expanded)
    for (const key of newStates.keys()) {
      newStates.set(key, true);
    }

    setExpandedStates(newStates);
  };

  const handleCollapseAll = () => {
    const newStates = new Map(expandedStates);

    // Set all states to false (collapsed)
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

  return (
    <div className="space-y-3">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-800 border border-slate-600 rounded-md p-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-slate-700 rounded-md flex items-center justify-center">
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-slate-400 text-xs">Time per Shard</p>
              <p className="text-white font-medium text-sm">{formatTime(result.timePerShard)}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-600 rounded-md p-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-slate-700 rounded-md flex items-center justify-center">
              <Target className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-slate-400 text-xs">Total Time</p>
              <p className="text-white font-medium text-sm">{formatTime(result.totalTime)}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-600 rounded-md p-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-slate-700 rounded-md flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-slate-400 text-xs">Shards Produced</p>
              <p className="text-white font-medium text-sm">{Math.floor(result.totalShardsProduced)}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-600 rounded-md p-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-slate-700 rounded-md flex items-center justify-center">
              <Hammer className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <p className="text-slate-400 text-xs">Total Fusions</p>
              <p className="text-white font-medium text-sm">
                {result.totalFusions}x{result.craftTime > 1 / 12 && <span className="text-slate-400 mx-1">•</span>}
                {result.craftTime > 1 / 12 && <span className="text-slate-400">{formatTime(result.craftTime)}</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Materials Needed */}
      <div className="bg-slate-800 border border-slate-600 rounded-md p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <div className="p-1 bg-slate-700 rounded-md">
              <Hammer className="w-5 h-5 text-blue-400" />
            </div>
            Materials Needed
          </h3>
          <div className="px-3 py-1.5 bg-sky-500/20 border border-sky-500/30 text-sky-400 text-sm font-medium rounded-md">
            for {Math.floor(result.totalShardsProduced)} {targetShardName}{" "}
            <span className="text-slate-400">
              {Math.floor(result.craftsNeeded)} craft{Math.floor(result.craftsNeeded) > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {Array.from(result.totalQuantities).map(([shardId, quantity]) => {
            const shard = data.shards[shardId];
            const displayQuantity = quantity; // Use the quantity as calculated, no additional multiplication
            const timeNeeded = displayQuantity / shard.rate;
            const shardDesc = SHARD_DESCRIPTIONS[shard.id as keyof typeof SHARD_DESCRIPTIONS];
            return (
              <div key={shardId} className="bg-slate-700 border border-slate-600 rounded-md px-3 pt-1 pb-2 flex flex-row items-center justify-between">
                {/* Left side: quantity, then icon+name underneath */}
                <div className="flex flex-col items-start min-w-0 justify-center h-full">
                  <span className="text-slate-300 font-medium text-base flex-shrink-0">{displayQuantity}x</span>
                  <Tooltip
                    content={formatShardDescription(shardDesc?.description || "No description available.")}
                    title={shardDesc?.title}
                    shardName={shard.name}
                    shardIcon={shard.id}
                    rarity={shardDesc?.rarity?.toLowerCase() || shard.rarity}
                    family={shardDesc?.family}
                    type={shardDesc?.type}
                    className="cursor-pointer"
                  >
                    <span className={`mt-0 font-medium text-sm ${getRarityColor(shard.rarity)} flex items-center flex-shrink-0`}>
                      <img
                        src={`${import.meta.env.BASE_URL}shardIcons/${shard.id}.png`}
                        alt={shard.name}
                        className="w-5 h-5 object-contain flex-shrink-0 inline-block align-middle mr-2"
                        loading="lazy"
                      />
                      {shard.name}
                    </span>
                  </Tooltip>
                </div>
                {/* Right side: rate, then time underneath */}
                <div className="flex flex-col items-end ml-2 justify-center h-full">
                  <div className="text-sm text-slate-400 whitespace-nowrap">
                    {formatNumber(shard.rate)} <span className="text-slate-500"> / </span> <span className="text-slate-500">hr</span>
                  </div>
                  <div className="text-xs text-slate-400 whitespace-nowrap mt-1">{formatTime(timeNeeded)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fusion Tree */}
      <div className="bg-slate-800 border border-slate-600 rounded-md p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <div className="p-1 bg-slate-700 rounded-md">
              <BarChart3 className="w-5 h-5 text-purple-400" />
            </div>
            Fusion Tree
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleExpandAll}
              className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 hover:border-green-400/30 text-white text-xs font-medium rounded-md hover:bg-green-500/20 transition-all duration-200 cursor-pointer"
            >
              Expand All
            </button>
            <button
              onClick={handleCollapseAll}
              className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 hover:border-orange-400/30 text-white text-xs font-medium rounded-md hover:bg-orange-500/20 transition-all duration-200 cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Only the outer container is scrollable */}
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          <div className="min-w-[650px]">
            <RecipeOverrideManager targetShard={targetShard} requiredQuantity={requiredQuantity} params={params} onResultUpdate={onResultUpdate}>
              {({ showAlternatives }) => (
                <RecipeTreeNode
                  tree={result.tree}
                  data={data}
                  isTopLevel={true}
                  totalShardsProduced={result.totalShardsProduced}
                  nodeId="root"
                  expandedStates={expandedStates}
                  onToggle={handleNodeToggle}
                  onShowAlternatives={showAlternatives}
                />
              )}
            </RecipeOverrideManager>
          </div>
        </div>
      </div>
    </div>
  );
};
