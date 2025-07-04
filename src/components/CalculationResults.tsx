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
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-800/60 to-slate-700/60 rounded-xl border-2 border-slate-600/50 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg ring-2 ring-green-400/30" />
          <div className="flex items-center space-x-4">
            <span className="text-slate-300 font-semibold bg-slate-800/50 px-3 py-1 rounded-lg">{tree.quantity}x</span>
            <span className={`font-bold cursor-help ${getRarityColor(shard.rarity)} hover:scale-105 transition-transform duration-200`} title={getShardDetails(shard, true)}>
              {shard.name}
            </span>
            <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full border-2 border-green-500/40 shadow-lg">DIRECT</span>
          </div>
        </div>
        <div className="text-right flex flex-col items-end space-y-1">
          <div className="text-sm text-slate-300 font-semibold">{formatNumber(shard.rate)}/hour</div>
          <div className="text-xs text-slate-400 capitalize font-medium">
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
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      <button onClick={() => onToggle(nodeId)} className="w-full p-4 text-left hover:bg-white/5 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
            <div className="text-white">
              <span className="font-semibold">{displayQuantity}x </span>
              <span className={`font-medium cursor-help ${getRarityColor(shard.rarity)}`} title={getShardDetails(shard, false)}>
                {shard.name}
              </span>
              <span className="text-slate-400 ml-2">
                = {input1.quantity}x <span className={getRarityColor(input1Shard.rarity)}>{input1Shard.name}</span> + {input2.quantity}x{" "}
                <span className={getRarityColor(input2Shard.rarity)}>{input2Shard.name}</span>
              </span>
            </div>
          </div>
          <div className="text-right flex flex-col items-end space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500">fusions</span>
              <span className="text-sm font-medium text-white">{displayQuantity}</span>
            </div>
            <div className="text-xs text-slate-400 capitalize">
              {shard.type} • {shard.family}
            </div>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-white/10 p-4 space-y-3">
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

  const handleToggleAll = () => {
    const newStates = new Map(expandedStates);
    const allExpanded = Array.from(newStates.values()).every((expanded) => expanded);

    // Toggle all states
    for (const key of newStates.keys()) {
      newStates.set(key, !allExpanded);
    }

    setExpandedStates(newStates);
  };

  const handleNodeToggle = (nodeId: string) => {
    const newStates = new Map(expandedStates);
    newStates.set(nodeId, !newStates.get(nodeId));
    setExpandedStates(newStates);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-xl border border-purple-500/20 rounded-xl p-4 hover:scale-[1.02] transition-transform duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Time per Shard</p>
              <p className="text-white font-semibold">{formatTime(result.timePerShard)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl border border-blue-500/20 rounded-xl p-4 hover:scale-[1.02] transition-transform duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Time</p>
              <p className="text-white font-semibold">{formatTime(result.totalTime)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl border border-green-500/20 rounded-xl p-4 hover:scale-[1.02] transition-transform duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Shards Produced</p>
              <p className="text-white font-semibold">{result.totalShardsProduced}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-xl border border-orange-500/20 rounded-xl p-4 hover:scale-[1.02] transition-transform duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Hammer className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Fusions</p>
              <p className="text-white font-semibold">
                {result.totalFusions}x{result.craftTime > 1 / 12 && <span className="text-xs text-slate-400 block">{formatTime(result.craftTime)}</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Materials Needed */}
      <div
        className="
        bg-gradient-to-br from-slate-800/90 to-slate-900/90 
        backdrop-blur-xl border-2 border-slate-700/50 
        rounded-2xl p-8 shadow-2xl
        hover:border-slate-600/70 transition-all duration-300
        ring-1 ring-white/5
      "
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Hammer className="w-6 h-6 text-blue-400" />
            </div>
            Materials Needed
          </h3>
          <div className="text-sm text-slate-300 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-600/30">
            for {result.totalShardsProduced} {targetShardName} ({result.craftsNeeded} craft{result.craftsNeeded > 1 ? "s" : ""})
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from(result.totalQuantities).map(([shardId, quantity]) => {
            const shard = data.shards[shardId];
            const timeNeeded = quantity / shard.rate;

            return (
              <div key={shardId} className="bg-white/5 border border-white/10 rounded-lg p-3 hover:scale-[1.02] transition-transform duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {quantity}x <span className={getRarityColor(shard.rarity)}>{shard.name}</span>
                    </div>
                    <div className="text-xs text-slate-400">{formatNumber(shard.rate)}/hour</div>
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
      <div
        className="
        bg-gradient-to-br from-slate-800/90 to-slate-900/90 
        backdrop-blur-xl border-2 border-slate-700/50 
        rounded-2xl p-8 shadow-2xl
        hover:border-slate-600/70 transition-all duration-300
        ring-1 ring-white/5
      "
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-400" />
            </div>
            Fusion Tree
          </h3>
          <button
            onClick={handleToggleAll}
            className="
              px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-600 
              hover:from-slate-600 hover:to-slate-500 
              text-white rounded-xl transition-all duration-200 
              font-semibold shadow-lg hover:shadow-xl
              hover:scale-105 active:scale-95
              ring-1 ring-white/10
            "
          >
            {Array.from(expandedStates.values()).every((expanded) => expanded) ? "Collapse All" : "Expand All"}
          </button>
        </div>

        <RecipeTreeNode tree={result.tree} data={data} isTopLevel={true} totalShardsProduced={result.totalShardsProduced} nodeId="root" expandedStates={expandedStates} onToggle={handleNodeToggle} />
      </div>
    </div>
  );
};
