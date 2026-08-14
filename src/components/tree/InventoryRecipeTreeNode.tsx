import React from "react";
import { formatLargeNumber, formatNumber, isOrderSensitiveRecipe } from "../../utilities";
import { Package } from "lucide-react";
import type { AlternativeSelectionContext, Data, InventoryRecipeTree, Shard } from "../../types/types";
import { ShardInfo, RecipeDisplay, RecipeSummary, CrocodileProcsBadge, AlternativesButton, CycleHeader } from "./shared";
import { getCrocodileProcs, renderChevron, useExpansionState } from "./treeHelpers";

interface InventoryRecipeTreeNodeProps {
  tree: InventoryRecipeTree;
  data: Data;
  isTopLevel?: boolean;
  totalShardsProduced?: number;
  nodeId: string;
  expandedStates: Map<string, boolean>;
  onToggle: (nodeId: string) => void;
  onShowAlternatives?: (shardId: string, context: AlternativeSelectionContext) => void;
  ironManView: boolean;
  isInCycle?: boolean;
  remainingInventory?: Map<string, number>;
}

export const InventoryRecipeTreeNode: React.FC<InventoryRecipeTreeNodeProps> = ({
  tree,
  data,
  isTopLevel = false,
  totalShardsProduced,
  nodeId,
  expandedStates,
  onToggle,
  onShowAlternatives,
  ironManView,
  isInCycle = false,
  remainingInventory,
}) => {
  // Must run before any early return so hook order is stable across renders —
  // `tree` flips between array and single node as the inventory substitution changes.
  const getExpansionState = useExpansionState(expandedStates);

  // Handle array of trees
  if (Array.isArray(tree)) {
    return (
      <>
        {tree.map((subtree, index) => (
          <InventoryRecipeTreeNode
            key={`${nodeId}-${index}`}
            tree={subtree}
            data={data}
            isTopLevel={false}
            nodeId={`${nodeId}-${index}`}
            expandedStates={expandedStates}
            onToggle={onToggle}
            onShowAlternatives={onShowAlternatives}
            ironManView={ironManView}
            isInCycle={isInCycle}
            remainingInventory={remainingInventory}
          />
        ))}
      </>
    );
  }

  const shard = data.shards[tree.shard];

  const renderInventoryShard = (quantity: number, inventoryShard: Shard, inCycle: boolean) => {
    const remaining = remainingInventory?.get(inventoryShard.id) ?? 0;
    return (
      <div className={`flex items-center justify-between pl-3.5 pr-1 py-1 ${inCycle ? 'bg-purple-900/40' : 'bg-purple-900/30'} rounded-md border border-purple-500/50`}>
        <div className="flex items-center space-x-2 p-0.5 text-sm">
          <Package className="w-3.5 h-3.5 text-purple-400 mr-1" />
          <ShardInfo quantity={quantity} shard={inventoryShard} ironManView={ironManView} showRate={false} />
          <span className="px-1 py-0.4 text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-md flex-shrink-0">Inventory</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400">remaining</span>
              <span className="text-slate-300 text-xs font-medium">{remaining}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDirectShard = (quantity: number, shard: Shard, inCycle = false) => {
    return (
      <div className={`flex items-center justify-between pl-3.5 pr-1 py-1 ${inCycle ? 'bg-slate-900' : 'bg-slate-800'} rounded-md border border-slate-600`}>
        <div className="flex items-center space-x-2 p-0.5 text-sm">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2.5" />
          <ShardInfo quantity={quantity} shard={shard} ironManView={ironManView} showRate={false} />
          <span className="px-1 py-0.4 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-md flex-shrink-0">{ironManView ? "Direct" : "Bazaar"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            {ironManView && (
              <div>
                <span className="text-slate-300 text-xs font-medium">{formatNumber(shard.rate)}</span>
                <span className="text-slate-500 text-xs mx-0.5">/</span>
                <span className="text-slate-400 text-xs">hr</span>
              </div>
            )}
            {!ironManView && (
              <div>
                <span className="text-slate-300 text-xs font-medium">{formatLargeNumber(quantity * shard.rate)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSubRecipe = (recipeTree: InventoryRecipeTree, inputShard: Shard, nodePrefix: string, inCycle = false): React.ReactNode => {
    if (Array.isArray(recipeTree)) {
      return recipeTree.map((subtree, index) => (
        <div key={`${nodePrefix}-${index}`}>
          {renderSubRecipe(subtree, Array.isArray(subtree) ? inputShard : data.shards[subtree.shard], `${nodePrefix}-${index}`, inCycle)}
        </div>
      ));
    }

    if (recipeTree.method === "inventory") return renderInventoryShard(recipeTree.quantity, inputShard, inCycle);
    if (recipeTree.method === "direct") return renderDirectShard(recipeTree.quantity, inputShard, inCycle);
    if (recipeTree.method !== "recipe") return null;

    const input1Shard = data.shards[recipeTree.recipe.inputs[0]];
    const input2Shard = data.shards[recipeTree.recipe.inputs[1]];
    const input1Quantity = input1Shard.fuse_amount * recipeTree.craftsNeeded;
    const input2Quantity = input2Shard.fuse_amount * recipeTree.craftsNeeded;
    const orderMatters = isOrderSensitiveRecipe(recipeTree.shard, recipeTree.recipe, data.recipes);
    const subNodeId = `${nodePrefix}-${inputShard.id}`;
    const isExpanded = getExpansionState(subNodeId, true);

    return (
      <div className="rounded border border-slate-400/50 overflow-hidden">
        <div
          className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-slate-800/50 transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(subNodeId);
          }}
        >
          <div className="flex-1 text-left">
            <div className="flex items-center space-x-2">
              {renderChevron(isExpanded)}
              <RecipeDisplay outputQuantity={recipeTree.quantity} outputShard={inputShard} input1Quantity={input1Quantity} input1Shard={input1Shard} input2Quantity={input2Quantity} input2Shard={input2Shard} orderMatters={orderMatters} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right min-w-[80px] ml-2">
              <div className="flex items-center justify-end space-x-1.5">
                <span className="text-xs text-slate-500">fusions</span>
                <span className="font-medium text-white text-xs">{recipeTree.craftsNeeded}</span>
              </div>
            </div>
          </div>
        </div>
        {isExpanded && (
          <div className="border-t border-slate-400/70 pl-3 pr-0.5 py-0.5 flex flex-col gap-0.5">
            <InventoryRecipeTreeNode
              tree={recipeTree.inputs[0]}
              data={data}
              nodeId={`${subNodeId}-0`}
              expandedStates={expandedStates}
              onToggle={onToggle}
              onShowAlternatives={onShowAlternatives}
              ironManView={ironManView}
              isInCycle={inCycle}
              remainingInventory={remainingInventory}
            />
            <InventoryRecipeTreeNode
              tree={recipeTree.inputs[1]}
              data={data}
              nodeId={`${subNodeId}-1`}
              expandedStates={expandedStates}
              onToggle={onToggle}
              onShowAlternatives={onShowAlternatives}
              ironManView={ironManView}
              isInCycle={inCycle}
              remainingInventory={remainingInventory}
            />
          </div>
        )}
      </div>
    );
  };

  // Handle inventory method
  if (tree.method === "inventory") {
    return renderInventoryShard(tree.quantity, shard, isInCycle);
  }

  // Handle direct method
  if (tree.method === "direct") {
    return (
      <div className={`flex items-center justify-between pl-3.5 pr-1 py-1 ${isInCycle ? 'bg-slate-900' : 'bg-slate-800'} rounded-md border border-slate-600`}>
        <div className="flex items-center space-x-2 p-0.5 text-sm">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2.5" />
          <ShardInfo quantity={tree.quantity} shard={shard} ironManView={ironManView} showRate={false} />
          <span className="px-1 py-0.4 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-md flex-shrink-0">{ironManView ? "Direct" : "Bazaar"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            {ironManView && (
              <div>
                <span className="text-slate-300 text-xs font-medium">{formatNumber(shard.rate)}</span>
                <span className="text-slate-500 text-xs mx-0.5">/</span>
                <span className="text-slate-400 text-xs">hr</span>
              </div>
            )}
            {!ironManView && (
              <div>
                <span className="text-slate-300 text-xs font-medium">{formatLargeNumber(tree.quantity * shard.rate)}</span>
              </div>
            )}
          </div>
          {onShowAlternatives && (
            <AlternativesButton
              onClick={(e) => {
                e.stopPropagation();
                onShowAlternatives(tree.shard, {
                  currentRecipe: null,
                  requiredQuantity: tree.quantity,
                });
              }}
            />
          )}
        </div>
      </div>
    );
  }

  // Handle recipe method
  if (tree.method === "recipe") {
    const isExpanded = getExpansionState(nodeId, true);
    const input1 = tree.inputs[0];
    const input2 = tree.inputs[1];

    // Get the shard ID from the input tree
    const getShardId = (t: InventoryRecipeTree): string => {
      if (Array.isArray(t)) return t[0] ? getShardId(t[0]) : "";
      return t.shard;
    };

    const input1ShardId = getShardId(input1);
    const input2ShardId = getShardId(input2);
    const input1Shard = data.shards[input1ShardId];
    const input2Shard = data.shards[input2ShardId];

    const crafts = tree.craftsNeeded ?? 1;
    const displayQuantity = isTopLevel && totalShardsProduced ? totalShardsProduced : tree.quantity;
    const crocProcs = getCrocodileProcs(tree, data);

    // A split node's quantity is spread across its branches, so sum them back up.
    const getQuantity = (t: InventoryRecipeTree): number => {
      if (Array.isArray(t)) {
        return t.reduce((sum, subtree) => sum + getQuantity(subtree), 0);
      }
      return t.quantity;
    };

    const input1Quantity = getQuantity(input1);
    const input2Quantity = getQuantity(input2);
    const orderMatters = isOrderSensitiveRecipe(tree.shard, tree.recipe, data.recipes);

    return (
      <div className={`${isInCycle ? 'bg-slate-900' : 'bg-slate-800'} border border-slate-600 rounded-md overflow-hidden`}>
        <div
          className="flex items-center justify-between w-full pl-3 pr-1 py-1 hover:bg-slate-700/30 transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(nodeId);
          }}
        >
          <div className="flex-1 text-left">
            <div className="flex items-center space-x-1.5">
              {renderChevron(isExpanded)}
              <RecipeSummary
                outputQuantity={displayQuantity}
                outputShard={shard}
                input1Quantity={input1Quantity}
                input1Shard={input1Shard}
                input2Quantity={input2Quantity}
                input2Shard={input2Shard}
                orderMatters={orderMatters}
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="text-right">
              <div className="flex py-1 px-1.5 gap-1 items-center cursor-pointer">
                <span className="text-xs text-slate-400">fusions</span>
                <span className="font-medium text-slate-300 text-xs">{crafts}</span>
              </div>
            </div>
            {crocProcs !== null && <CrocodileProcsBadge procs={crocProcs} />}
            {onShowAlternatives && (
              <AlternativesButton
                onClick={(e) => {
                  e.stopPropagation();
                  onShowAlternatives(tree.shard, {
                    currentRecipe: tree.recipe,
                    requiredQuantity: tree.quantity,
                  });
                }}
              />
            )}
          </div>
        </div>
        {isExpanded && (
          <div className="border-t border-slate-600 pl-3 pr-0.5 py-0.5 space-y-0.5">
            <InventoryRecipeTreeNode
              tree={input1}
              data={data}
              nodeId={`${nodeId}-0`}
              expandedStates={expandedStates}
              onToggle={onToggle}
              onShowAlternatives={onShowAlternatives}
              ironManView={ironManView}
              isInCycle={isInCycle}
              remainingInventory={remainingInventory}
            />
            <InventoryRecipeTreeNode
              tree={input2}
              data={data}
              nodeId={`${nodeId}-1`}
              expandedStates={expandedStates}
              onToggle={onToggle}
              onShowAlternatives={onShowAlternatives}
              ironManView={ironManView}
              isInCycle={isInCycle}
              remainingInventory={remainingInventory}
            />
          </div>
        )}
      </div>
    );
  }

  // Handle cycle method
  if (tree.method === "cycle") {
    const isExpanded = getExpansionState(nodeId, true);
    const runCount = tree.craftsNeeded;
    const crocProcs = getCrocodileProcs(tree, data);

    return (
      <div className="flex flex-col border border-slate-400/50 rounded-md bg-slate-900">
        <CycleHeader
          shard={shard}
          quantity={tree.quantity}
          runCount={runCount}
          crocProcs={crocProcs}
          isExpanded={isExpanded}
          ironManView={ironManView}
          onToggle={() => onToggle(nodeId)}
          onShowAlternatives={
            onShowAlternatives &&
            (() => {
              // The recipe that produces the target shard within the cycle
              const step = tree.steps.find((step) => step.outputShard === tree.shard);
              onShowAlternatives(tree.shard, {
                currentRecipe: step?.recipe || null,
                requiredQuantity: tree.quantity,
              });
            })
          }
        />

        {isExpanded && (
          <div className="border-t border-slate-400/50 pl-3 pr-0.5 py-0.5 space-y-0.5">
            <div className="">
              {[...tree.steps]
                .reverse()
                .map((step, stepIndex) => {
                  const recipe = step.recipe;
                  const outputShardData = data.shards[step.outputShard];
                  const input1Shard = data.shards[recipe.inputs[0]];
                  const input2Shard = data.shards[recipe.inputs[1]];
                  const input1Quantity = input1Shard.fuse_amount;
                  const input2Quantity = input2Shard.fuse_amount;
                  let outputQuantity = recipe.outputQuantity;
                  if (recipe.isReptile) outputQuantity *= tree.multiplier;
                  const stepNumber = tree.steps.length - stepIndex;
                  const orderMatters = isOrderSensitiveRecipe(step.outputShard, recipe, data.recipes);

                  const alternativesButton = onShowAlternatives && (
                    <AlternativesButton
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowAlternatives(step.outputShard, {
                          currentRecipe: recipe,
                          requiredQuantity: tree.craftsNeeded * outputQuantity,
                        });
                      }}
                    />
                  );

                  if (stepNumber === 1) {
                    const stepNodeId = `${nodeId}-step-${stepNumber}`;
                    const stepIsExpanded = getExpansionState(stepNodeId, true);

                    return (
                      <div key={stepIndex} className="rounded border border-slate-400/50 overflow-hidden">
                        <div
                          className="flex items-center justify-between w-full pl-3 pr-1 py-1 hover:bg-slate-800/50 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggle(stepNodeId);
                          }}
                        >
                          <div className="flex-1 text-left">
                            <div className="flex items-center space-x-2">
                              {renderChevron(stepIsExpanded)}
                              <RecipeDisplay outputQuantity={outputQuantity} outputShard={outputShardData} input1Quantity={input1Quantity} input1Shard={input1Shard} input2Quantity={input2Quantity} input2Shard={input2Shard} showStep stepNumber={stepNumber} orderMatters={orderMatters} />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">{alternativesButton}</div>
                        </div>
                        {stepIsExpanded && (
                          <div className="border-t border-slate-400/50 pl-3 pr-0.5 py-0.5 space-y-1">
                            <div key={Array.isArray(tree.inputRecipe) ? "input-array" : tree.inputRecipe.shard} className="space-y-1">
                              {renderSubRecipe(tree.inputRecipe, Array.isArray(tree.inputRecipe) ? shard : data.shards[tree.inputRecipe.shard], stepNodeId, true)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <div key={stepIndex} className="pl-3 pr-1 py-1 rounded border border-slate-400/50 flex items-center justify-between">
                        <RecipeDisplay outputQuantity={outputQuantity} outputShard={outputShardData} input1Quantity={input1Quantity} input1Shard={input1Shard} input2Quantity={input2Quantity} input2Shard={input2Shard} showStep stepNumber={stepNumber} orderMatters={orderMatters} />
                        <div className="flex items-center gap-2">{alternativesButton}</div>
                      </div>
                    );
                  }
                })}
            </div>

            <div className="flex gap-1.5 py-1 pl-2">
              <div className="text-slate-400 text-xs border-l-1 border-slate-500 pl-1.5">Cycle Fodder</div>
            </div>

            {/* Cycle inputs/fodder */}
            <div className="flex flex-col gap-0.5 mt-0.5">
              {tree.cycleInputs.map((cycleTree, index) => {
                const subNodeId = `${nodeId}-cycle-input-${index}`;
                const cycleTreeShard = Array.isArray(cycleTree)
                  ? (cycleTree[0] && !Array.isArray(cycleTree[0]) ? data.shards[cycleTree[0].shard] : shard)
                  : data.shards[cycleTree.shard];
                return <div key={`${subNodeId}`}>{renderSubRecipe(cycleTree, cycleTreeShard, subNodeId, true)}</div>;
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};
