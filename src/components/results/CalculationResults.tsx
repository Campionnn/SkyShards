import React, { useState } from "react";
import { Clock, Coins, Hammer, Target, BarChart3, TicketPercent } from "lucide-react";
import {formatLargeNumber, formatNumber, formatTime} from "../../utilities";
import type {RecipeTree, CalculationResultsProps, Shard} from "../../types/types";
import { RecipeTreeNode } from "../tree";
import { RecipeOverrideManager } from "../forms";
import { SummaryCard, MaterialItem } from "../ui";
import pako from 'pako';

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

export const CalculationResults: React.FC<CalculationResultsProps> = ({
  result,
  data,
  targetShardName,
  targetShard,
  requiredQuantity,
  params,
  onResultUpdate,
  recipeOverrides,
  onRecipeOverridesUpdate,
  onResetRecipeOverrides,
  ironManView
}) => {
  const { expandedStates, handleExpandAll, handleCollapseAll, handleNodeToggle } = useTreeExpansion(result.tree);

  function copyTree() {
    const convertTreeToSkyOcean = (tree: RecipeTree): any => {
      if (tree.method === "direct") {
        return {
          shard: tree.shard,
          method: "direct",
          quantity: tree.quantity
        };
      }

      if (tree.method === "cycle") {
        const pureReptile = tree.quantity / tree.cycle.steps[0].recipe.outputQuantity;

        return {
          shard: tree.shard,
          method: "cycle",
          quantity: tree.quantity,
          craftsExpected: tree.craftsNeeded,
          outputQuantity: tree.cycle.steps[0].recipe.outputQuantity,
          pureReptile: pureReptile,
          cycle: {
            steps: tree.cycle.steps.map(step => ({
              shard: step.outputShard,
              recipe: {
                inputs: step.recipe.inputs
              }
            }))
          },
          inputRecipe: tree.inputRecipe ? convertTreeToSkyOcean(tree.inputRecipe) : undefined
        };
      }

      if (tree.method === "recipe") {
        const pureReptile = (tree.quantity - (tree.craftsNeeded * tree.recipe.outputQuantity)) / tree.recipe.outputQuantity;

        return {
          shard: tree.shard,
          method: "recipe",
          quantity: tree.quantity,
          craftsExpected: tree.craftsNeeded,
          outputQuantity: tree.recipe.outputQuantity,
          pureReptile: pureReptile,
          inputs: tree.inputs ? tree.inputs.map(input => convertTreeToSkyOcean(input)) : []
        };
      }

      return tree;
    };

    const convertTreeToNoFrills = (tree: RecipeTree): any => {
      // Use a Map with key `${shardId}|${method}` to track quantities per method
      const shardQuantities: Map<string, number> = new Map();
      const traverse = (node: RecipeTree) => {
        if (node.method === "direct") {
          const key = `${node.shard}|Direct`;
          const currentQuantity = shardQuantities.get(key) || 0;
          shardQuantities.set(key, currentQuantity + node.quantity);
        } else if (node.method === "recipe") {
          const key = `${node.shard}|Fuse`;
          const currentQuantity = shardQuantities.get(key) || 0;
          shardQuantities.set(key, currentQuantity + node.quantity);
          if (node.inputs) {
            node.inputs.forEach(input => traverse(input));
          }
        } else if (node.method === "cycle") {
          const cycle = node.cycle;
          const outputShardIds = new Set(cycle.steps.map((step) => step.outputShard));
          const inputShardTotals: Record<string, { quantity: number; shard: Shard }> = {};
          cycle.steps.forEach((step) => {
            step.recipe.inputs.forEach((inputId: string) => {
              const inputShard = data.shards[inputId];
              if (!inputShard || outputShardIds.has(inputId)) return;
              if (inputShard.rate > 0) {
                if (!inputShardTotals[inputId]) {
                  inputShardTotals[inputId] = {
                    quantity: 0,
                    shard: inputShard,
                  };
                }
                inputShardTotals[inputId].quantity += inputShard.fuse_amount / cycle.steps.length;
              }
            });
          });
          Object.values(inputShardTotals).forEach(({ quantity, shard }) => {
            const key = `${shard.id}|Direct`;
            const currentQuantity = shardQuantities.get(key) || 0;
            shardQuantities.set(key, currentQuantity + quantity * node.craftsNeeded);
          });
          const key = `${node.shard}|Cycle`;
          shardQuantities.set(key, (shardQuantities.get(key) || 0) + node.quantity);
          traverse(node.inputRecipe)
        }
      }
      traverse(tree);

      const result: any[] = [];
      shardQuantities.forEach((quantity, key) => {
        const [shard, method] = key.split("|");
        result.push({
          name: data.shards[shard].name,
          needed: quantity,
          source: method,
        });
      });
      return result;
    }

    const convertedTree = convertTreeToSkyOcean(result.tree);
    console.log(convertTreeToNoFrills(result.tree));
    const treeString = JSON.stringify(convertedTree, null, 0);
    try {
      const gzipped = pako.gzip(treeString);
      const binary = String.fromCharCode(...gzipped);
      const base64Tree = btoa(binary);

      navigator.clipboard.writeText("(SkyOceanRecipe:v1):" + base64Tree).then(() => {
        alert("Fusion tree copied to clipboard! Paste it into SkyOcean(soon) to help with shard fusion in game. String is gzipped and base64 encoded.");
      }).catch((err) => {
        console.error("Failed to copy tree:", err);
        alert("Failed to copy tree to clipboard.");
      });
    } catch (err) {
      console.error("Failed to compress and encode tree:", err);
      alert("Failed to compress and encode tree.");
    }
  }

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
            <SummaryCard icon={TicketPercent} iconColor="text-purple-400" label="Total Coins Saved" value={formatLargeNumber((result.totalShardsProduced * data.shards[targetShard].rate) - result.totalTime)} />
          </>
        )}
        <SummaryCard icon={BarChart3} iconColor="text-green-400" label="Shards Produced" value={formatNumber(result.totalShardsProduced).toString()} />
        <SummaryCard
          icon={Hammer}
          iconColor="text-orange-400"
          label="Total Fusions"
          value={`${result.totalFusions}x`}
          additionalValue={
            ironManView
              ? formatTime(result.craftTime)
              : formatLargeNumber(result.craftTime)
          }
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
            {(() => {
              // Don't show Forest Essence if wooden bait is excluded
              if (params.noWoodenBait) return null;

              const forestEssenceShards = Array.from(result.totalQuantities).filter(([shardId]) =>
                ["shinyfish", "inferno koi", "abyssal lanternfish", "silentdepth"].includes(data.shards[shardId]?.name?.toLowerCase())
              );

              if (forestEssenceShards.length === 0) return null;

              const rarityBonuses = {
                common: 2 * params.newtLevel,
                uncommon: 2 * params.salamanderLevel,
                rare: params.lizardKingLevel,
                epic: params.leviathanLevel,
                legendary: 0,
              };

              const totalForestEssence = forestEssenceShards.reduce((total, [shardId, quantity]) => {
                const shardName = data.shards[shardId]?.name?.toLowerCase();
                const effectiveFortune = 1 + (params.hunterFortune + rarityBonuses[data.shards[shardId]?.rarity]) / 100;
                const essenceNeeded = (quantity * (shardName === "shinyfish" ? 446 : 1024)) / effectiveFortune;
                return total + essenceNeeded;
              }, 0);

              return (
                <div className="flex gap-1 items-center px-3 py-1.5 bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-400 text-sm font-medium rounded-md min-w-0">
                  <span className="text-slate-300">{formatLargeNumber(totalForestEssence)}</span>
                  <span className="truncate">Forest Essence</span>
                </div>
              );
            })()}
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
            return <MaterialItem key={shardId} shard={shard} quantity={quantity} ironManView={ironManView} />;
          })}
        </div>
      </div>{" "}
      {/* Fusion Tree */}
      <div className="bg-slate-800 border border-slate-600 rounded-md p-3">
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          <div className="min-w-[650px]">
            <RecipeOverrideManager
              targetShard={targetShard}
              requiredQuantity={requiredQuantity}
              params={params}
              onResultUpdate={onResultUpdate}
              recipeOverrides={recipeOverrides}
              onRecipeOverridesUpdate={onRecipeOverridesUpdate}
              onResetRecipeOverrides={onResetRecipeOverrides}
            >
              {({ showAlternatives, resetAlternatives }) => (
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
                        onClick={copyTree}
                        className="px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/20 hover:border-blue-500/30 order-4 sm:order-1"
                      >
                        <span>Copy Tree</span>
                      </button>
                      <button
                        onClick={resetAlternatives}
                        className="px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/20 hover:border-red-500/30 order-3 sm:order-2"
                      >
                        <span>Reset Alternatives</span>
                      </button>
                      <button
                        onClick={handleExpandAll}
                        className="px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/20 hover:border-green-500/30 order-2 sm:order-3"
                      >
                        <span>Expand All</span>
                      </button>
                      <button
                        onClick={handleCollapseAll}
                        className="px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/20 hover:border-orange-500/30 order-1 sm:order-4"
                      >
                        <span>Collapse All</span>
                      </button>
                    </div>
                  </div>
                  <RecipeTreeNode
                    tree={result.tree}
                    data={data}
                    isTopLevel={true}
                    totalShardsProduced={result.totalShardsProduced}
                    nodeId="root"
                    expandedStates={expandedStates}
                    onToggle={handleNodeToggle}
                    onShowAlternatives={showAlternatives}
                    noWoodenBait={params.noWoodenBait}
                    ironManView={ironManView}
                  />
                </>
              )}
            </RecipeOverrideManager>
          </div>
        </div>
      </div>
    </div>
  );
};
