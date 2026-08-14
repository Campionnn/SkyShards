import React from "react";
import { formatLargeNumber, formatNumber, isOrderSensitiveRecipe } from "../../utilities";
import type { AlternativeSelectionContext, Data, RecipeTree, Shard } from "../../types/types";
import { ShardInfo, RecipeDisplay, RecipeSummary, CrocodileProcsBadge, AlternativesButton, CycleHeader } from "./shared";
import { getCrocodileProcs, renderChevron, useExpansionState } from "./treeHelpers";

interface RecipeTreeNodeProps {
  tree: RecipeTree;
  data: Data;
  isTopLevel?: boolean;
  totalShardsProduced?: number;
  nodeId: string;
  expandedStates: Map<string, boolean>;
  onToggle: (nodeId: string) => void;
  onShowAlternatives?: (shardId: string, context: AlternativeSelectionContext) => void;
  ironManView: boolean;
}

export const RecipeTreeNode: React.FC<RecipeTreeNodeProps> = ({
  tree,
  data,
  isTopLevel = false,
  totalShardsProduced = tree.quantity,
  nodeId,
  expandedStates,
  onToggle,
  onShowAlternatives,
  ironManView,
}) => {
  const getExpansionState = useExpansionState(expandedStates);

  const shard = data.shards[tree.shard];

  const renderDirectShard = (quantity: number, shard: Shard) => (
    <div className="rounded border border-slate-400/50 flex items-center justify-between px-3 py-1.5 text-sm font-medium gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-2 h-2 bg-green-400 rounded-full" />
        <ShardInfo quantity={Math.ceil(quantity)} shard={shard} ironManView={ironManView} showRate={false} />
        <span className="px-1 py-0.4 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-md flex-shrink-0">{ironManView ? "Direct" : "Bazaar"}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right min-w-[80px] ml-2">
          {ironManView && (
            <>
              <span className="text-slate-300 text-xs font-medium">{formatNumber(shard.rate)}</span>
              <span className="text-slate-500 text-xs mx-0.5">/</span>
              <span className="text-slate-400 text-xs">hr</span>
            </>
          )}
          {!ironManView && (
            <>
              <span className="text-slate-300 text-xs font-medium">{formatLargeNumber(quantity * shard.rate)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderSubRecipe = (recipeTree: RecipeTree, inputShard: Shard, nodePrefix: string) => {
    if (recipeTree.method === "direct") return renderDirectShard(recipeTree.quantity, inputShard);
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
            {recipeTree.inputs.map((subTree: RecipeTree) => {
              const directShard = data.shards[subTree.shard];
              if (!directShard || !recipeTree) return null;
              return <div key={`sub-${subTree.shard}`}>{renderSubRecipe(subTree, directShard, subNodeId)}</div>;
            })}
          </div>
        )}
      </div>
    );
  };

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
                            <div key={tree.inputRecipe.shard} className="space-y-1">
                              {renderSubRecipe(tree.inputRecipe, data.shards[tree.inputRecipe.shard], stepNodeId)}
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

            {/* Cycle summary */}
            <div className="flex flex-col gap-0.5 mt-0.5">
              {Object.values(tree.cycleInputs).map((cycleTree, index) => {
                // Index the id: without it every cycle input shares one expansion
                // entry, so expanding one expanded all of them.
                const subNodeId = `${nodeId}-cycle-input-${index}`;
                return <div key={cycleTree.shard}>{renderSubRecipe(cycleTree, data.shards[cycleTree.shard], subNodeId)}</div>;
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (tree.method === "direct") {
    return (
      <div className="flex items-center justify-between pl-3.5 pr-1 py-1 bg-slate-800 rounded-md border border-slate-600">
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

  // Recipe nodes
  const isExpanded = getExpansionState(nodeId, true);
  const input1 = tree.inputs![0];
  const input2 = tree.inputs![1];
  const input1Shard = data.shards[input1.shard];
  const input2Shard = data.shards[input2.shard];
  const crafts = "craftsNeeded" in tree ? tree.craftsNeeded ?? 1 : 1;
  const displayQuantity = isTopLevel ? totalShardsProduced : tree.quantity;
  const crocProcs = getCrocodileProcs(tree, data);
  const orderMatters = tree.method === "recipe" && isOrderSensitiveRecipe(tree.shard, tree.recipe, data.recipes);

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-md overflow-hidden">
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
              input1Quantity={input1.quantity}
              input1Shard={input1Shard}
              input2Quantity={input2.quantity}
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
                  currentRecipe: "recipe" in tree ? tree.recipe : null,
                  requiredQuantity: tree.quantity,
                });
              }}
            />
          )}
        </div>
      </div>
      {isExpanded && (
        <div className="border-t border-slate-600 pl-3 pr-0.5 py-0.5 space-y-0.5">
          <RecipeTreeNode
            tree={input1}
            data={data}
            nodeId={`${nodeId}-0`}
            expandedStates={expandedStates}
            onToggle={onToggle}
            onShowAlternatives={onShowAlternatives}
            ironManView={ironManView}
          />
          <RecipeTreeNode
            tree={input2}
            data={data}
            nodeId={`${nodeId}-1`}
            expandedStates={expandedStates}
            onToggle={onToggle}
            onShowAlternatives={onShowAlternatives}
            ironManView={ironManView}
          />
        </div>
      )}
    </div>
  );
};
