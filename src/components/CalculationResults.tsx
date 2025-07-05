import React, { useState } from "react";
import { ChevronDown, ChevronRight, Clock, Hammer, Target, BarChart3 } from "lucide-react";
import { formatTime, formatNumber, getRarityColor, getShardDetails } from "../utils";
import type { CalculationResult, RecipeTree, Data } from "../types";

interface CalculationResultsProps {
  result: CalculationResult;
  data: Data;
  targetShardName: string;
}

interface RecipeTreeNodeProps {
  tree: RecipeTree;
  data: Data;
  isTopLevel?: boolean;
  totalShardsProduced?: number;
  nodeId: string;
  expandedStates: Map<string, boolean>;
  onToggle: (nodeId: string) => void;
}

const RecipeTreeNode: React.FC<RecipeTreeNodeProps> = ({ tree, data, isTopLevel = false, totalShardsProduced = tree.quantity, nodeId, expandedStates, onToggle }) => {
  const shard = data.shards[tree.shard];
  const isExpanded = expandedStates.get(nodeId) ?? true;

  if (tree.method === "direct") {
    return (
      <div className="flex items-center justify-between px-3 py-1 bg-slate-800 rounded-md border border-slate-600">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full" />
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
          <div className="text-xs text-slate-400 capitalize">
            {shard.type} • {shard.family}
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
            <div className={`text-slate-400 capitalize ${isTopLevel ? "text-xs" : "text-xs"}`}>
              {shard.type} • {shard.family}
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

export const CalculationResults: React.FC<CalculationResultsProps> = ({ result, data, targetShardName }) => {
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
              <p className="text-white font-medium text-sm">{result.totalShardsProduced}</p>
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
            for {result.totalShardsProduced} {targetShardName}{" "}
            <span className="text-slate-400">
              {result.craftsNeeded} craft{result.craftsNeeded > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {Array.from(result.totalQuantities).map(([shardId, quantity]) => {
            const shard = data.shards[shardId];
            const timeNeeded = quantity / shard.rate;

            return (
              <div key={shardId} className="bg-slate-700 border border-slate-600 rounded-md p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">
                      {quantity}x <span className={getRarityColor(shard.rarity)}>{shard.name}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatNumber(shard.rate)}
                      <span className="text-slate-600 mx-0.5">/</span>
                      <span className="text-slate-500">hr</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">{formatTime(timeNeeded)}</div>
                  </div>
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

        <div className="w-full">
          <RecipeTreeNode tree={result.tree} data={data} isTopLevel={true} totalShardsProduced={result.totalShardsProduced} nodeId="root" expandedStates={expandedStates} onToggle={handleNodeToggle} />
        </div>
      </div>
    </div>
  );
};
