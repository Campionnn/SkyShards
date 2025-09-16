import React from "react";
import { getRarityColor, formatShardDescription, formatLargeNumber } from "../../utilities";
import { ChevronDown, ChevronRight, MoveRight, Settings } from "lucide-react";
import { formatNumber } from "../../utilities";
import type { RecipeTreeNodeProps, Recipe, Shard, RecipeTree } from "../../types/types";
import { Tooltip } from "../ui";
import { SHARD_DESCRIPTIONS } from "../../constants";

export const RecipeTreeNode: React.FC<RecipeTreeNodeProps> = ({
  tree,
  data,
  isTopLevel = false,
  totalShardsProduced = tree.quantity,
  nodeId,
  expandedStates,
  onToggle,
  onShowAlternatives,
  noWoodenBait = false,
  ironManView,
}) => {
  const shard = data.shards[tree.shard];

  // Helper function to get expansion state and ensure it's initialized
  const getExpansionState = (id: string, defaultState: boolean = true) => {
    if (!expandedStates.has(id)) {
      expandedStates.set(id, defaultState);
    }
    return expandedStates.get(id)!;
  };

  const isDirectShard = (shardId: string) => {
    const shard = data.shards[shardId];
    if (!shard) return false;
    if (shard.rate === 0) return false;
    return shard.rate && shard.rate > 0;
  };

  const isReptileRecipe = (recipe: Recipe | undefined, input1Shard: Shard | undefined, input2Shard: Shard | undefined): boolean => {
    return (recipe?.isReptile || input1Shard?.family?.toLowerCase().includes("reptile") || input2Shard?.family?.toLowerCase().includes("reptile")) as boolean;
  };

  const getCrocodileProcs = (tree: RecipeTree): number | null => {
    if (tree.method === "cycle") {
      const hasReptile = tree.steps.some((step) => {
        const recipe = step.recipe;
        const input1Shard = data.shards[recipe.inputs[0]];
        const input2Shard = data.shards[recipe.inputs[1]];
        return isReptileRecipe(recipe, input1Shard, input2Shard);
      });
      return hasReptile ? Math.ceil(tree.quantity / 2) : null;
    }
    if (tree.method === "recipe") {
      const recipe = tree.recipe;
      const input1Shard = data.shards[recipe.inputs[0]];
      const input2Shard = data.shards[recipe.inputs[1]];
      if (isReptileRecipe(recipe, input1Shard, input2Shard)) {
        const requiredOutputQuantity = tree.quantity;
        let inputQuantityOfReptile = 0;
        let inputFuseAmount = 0;
        if (input1Shard?.family?.toLowerCase().includes("reptile")) {
          inputQuantityOfReptile = tree.inputs[0].quantity;
          inputFuseAmount = input1Shard.fuse_amount;
        } else if (input2Shard?.family?.toLowerCase().includes("reptile")) {
          inputQuantityOfReptile = tree.inputs[1].quantity;
          inputFuseAmount = input2Shard.fuse_amount;
        }
        return Math.ceil(requiredOutputQuantity / tree.recipe.outputQuantity - inputQuantityOfReptile / inputFuseAmount);
      }
    }
    return null;
  };

  const renderChevron = (isExpanded: boolean) => (isExpanded ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4 text-amber-400" />);

  const renderShardInfo = (quantity: number, shard: Shard, showRate = true) => {
    const shardDesc = SHARD_DESCRIPTIONS[shard.id as keyof typeof SHARD_DESCRIPTIONS];
    return (
      <>
        <span className="text-white">{quantity}x</span>
        <Tooltip
          content={formatShardDescription(shardDesc?.description || "No description available.")}
          title={shardDesc?.title}
          shardName={shard.name}
          shardIcon={shard.id}
          rarity={shardDesc?.rarity?.toLowerCase() || shard.rarity}
          family={shardDesc?.family}
          type={shardDesc?.type}
          shardId={shard.id}
          className="cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}shardIcons/${shard.id}.png`} alt={shard.name} className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
            <span className={getRarityColor(shard.rarity)}>{shard.name}</span>
          </div>
        </Tooltip>
        {showRate && (
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
        )}
      </>
    );
  };

  const renderRecipeDisplay = (
    outputQuantity: number,
    outputShard: Shard,
    input1Quantity: number,
    input1Shard: Shard,
    input2Quantity: number,
    input2Shard: Shard,
    showStep = false,
    stepNumber?: number
  ) => {
    const outputShardDesc = SHARD_DESCRIPTIONS[outputShard.id as keyof typeof SHARD_DESCRIPTIONS];
    const input1ShardDesc = SHARD_DESCRIPTIONS[input1Shard.id as keyof typeof SHARD_DESCRIPTIONS];
    const input2ShardDesc = SHARD_DESCRIPTIONS[input2Shard.id as keyof typeof SHARD_DESCRIPTIONS];

    return (
      <div className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
        {showStep && <span className="font-normal text-xs text-amber-300">Step {stepNumber} :</span>}

        <span className="text-white">{outputQuantity}x</span>
        <Tooltip
          content={formatShardDescription(outputShardDesc?.description || "No description available.")}
          title={outputShardDesc?.title}
          shardName={outputShard.name}
          shardIcon={outputShard.id}
          rarity={outputShardDesc?.rarity?.toLowerCase() || outputShard.rarity}
          family={outputShardDesc?.family}
          type={outputShardDesc?.type}
          shardId={outputShard.id}
          className="cursor-pointer"
        >
          <div className="flex items-center gap-1">
            <img src={`${import.meta.env.BASE_URL}shardIcons/${outputShard.id}.png`} alt={outputShard.name} className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
            <span className={getRarityColor(outputShard.rarity)}>{outputShard.name}</span>
          </div>
        </Tooltip>

        <span> = </span>

        <span className="text-slate-400">{input1Quantity}x</span>
        <Tooltip
          content={formatShardDescription(input1ShardDesc?.description || "No description available.")}
          title={input1ShardDesc?.title}
          shardName={input1Shard.name}
          shardIcon={input1Shard.id}
          rarity={input1ShardDesc?.rarity?.toLowerCase() || input1Shard.rarity}
          family={input1ShardDesc?.family}
          type={input1ShardDesc?.type}
          shardId={input1Shard.id}
          className="cursor-pointer"
        >
          <div className="flex items-center gap-1">
            <img src={`${import.meta.env.BASE_URL}shardIcons/${input1Shard.id}.png`} alt={input1Shard.name} className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
            <span className={getRarityColor(input1Shard.rarity)}>{input1Shard.name}</span>
          </div>
        </Tooltip>

        <span> + </span>

        <span className="text-slate-400">{input2Quantity}x</span>
        <Tooltip
          content={formatShardDescription(input2ShardDesc?.description || "No description available.")}
          title={input2ShardDesc?.title || input2Shard.name}
          shardName={input2Shard.name}
          shardIcon={input2Shard.id}
          rarity={input2ShardDesc?.rarity?.toLowerCase() || input2Shard.rarity}
          family={input2ShardDesc?.family}
          type={input2ShardDesc?.type}
          shardId={input2Shard.id}
          className="cursor-pointer"
        >
          <div className="flex items-center gap-1">
            <img src={`${import.meta.env.BASE_URL}shardIcons/${input2Shard.id}.png`} alt={input2Shard.name} className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
            <span className={getRarityColor(input2Shard.rarity)}>{input2Shard.name}</span>
          </div>
        </Tooltip>
      </div>
    );
  };

  const renderDirectShard = (quantity: number, shard: Shard) => (
    <div className="rounded border border-slate-400/50 flex items-center justify-between px-3 py-1.5 text-sm font-medium gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-2 h-2 bg-green-400 rounded-full" />
        {renderShardInfo(Math.ceil(quantity), shard, false)}
        <span className="px-1 py-0.4 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-md flex-shrink-0">{ironManView ? "Direct" : "Bazaar"}</span>
      </div>
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
  );

  const renderSubRecipe = (recipeTree: RecipeTree, inputShard: Shard, nodePrefix: string) => {
    if (recipeTree.method === "direct") return renderDirectShard(recipeTree.quantity, inputShard);
    if (recipeTree.method !== "recipe") return null;
    const input1Shard = data.shards[recipeTree.recipe.inputs[0]];
    const input2Shard = data.shards[recipeTree.recipe.inputs[1]];
    const input1Quantity = input1Shard.fuse_amount * recipeTree.craftsNeeded;
    const input2Quantity = input2Shard.fuse_amount * recipeTree.craftsNeeded;
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
              {renderRecipeDisplay(recipeTree.quantity, inputShard, input1Quantity, input1Shard, input2Quantity, input2Shard)}
            </div>
          </div>
          <div className="text-right min-w-[80px] ml-2">
            <div className="flex items-center justify-end space-x-1.5">
              <span className="text-xs text-slate-500">fusions</span>
              <span className="font-medium text-white text-xs">{recipeTree.craftsNeeded}</span>
            </div>
          </div>
        </div>
        {isExpanded && (
          <div className="border-t border-slate-400/70 pl-3 pr-0.5 py-0.5 flex flex-col gap-0.5">
            {recipeTree.inputs.map((subTree: RecipeTree) => {
              const directShard = data.shards[subTree.shard];
              if (!directShard) return null;
              const isDirect = isDirectShard(subTree.shard);

              if (isDirect) {
                return <div key={`direct-${subTree.shard}`}>{renderDirectShard(directShard.fuse_amount * recipeTree.craftsNeeded, directShard)}</div>;
              } else {
                if (!recipeTree) return null;
                return <div key={`sub-${subTree.shard}`}>{renderSubRecipe(subTree, directShard, subNodeId)}</div>;
              }
            })}
          </div>
        )}
      </div>
    );
  };

  if (tree.method === "cycle") {
    const isExpanded = getExpansionState(nodeId, true);
    const runCount = tree.craftsNeeded;
    const crocProcs = getCrocodileProcs(tree);

    return (
      <div className="flex flex-col border border-slate-400/50 rounded-md bg-slate-900">
        <div
          className="flex items-center justify-between w-full pl-3 pr-2 py-1 hover:bg-slate-800/50 transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(nodeId);
          }}
        >
          <div className="flex-1 text-left">
            <div className="flex items-center space-x-2">
              {renderChevron(isExpanded)}
              <div className="flex items-center gap-3">
                <div className="text-xs text-amber-300">{runCount} crafts</div>
                <MoveRight className="w-4 text-amber-400" />
                <div className="flex items-center space-x-2 text-sm">
                  {renderShardInfo(Math.floor(tree.quantity), shard, false)}
                  <span className="px-1 py-0.4 text-xs bg-amber-500/20 text-amber-400 border border-amber-400/40 text-[11px] font-medium rounded-md">CYCLE !</span>
                  {crocProcs !== null && (
                    <Tooltip
                      content={`Crocodile has a chance to double the output of reptile recipes. You need ${crocProcs} Pure Reptile triggers to have enough shards for the craft. This is based on average luck`}
                      title="Crocodile - Pure Reptile"
                      className="cursor-help"
                      showRomanNumerals={false}
                    >
                      <span className="px-1 py-0.4 text-xs bg-blue-500/15 text-blue-400 border border-blue-400/40 rounded-md flex-shrink-0 ml-2 flex items-center gap-1">
                        <span className="font-medium">Pure Reptile needed</span>
                        <span className="font-bold">{crocProcs}</span>
                      </span>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="flex items-center justify-end space-x-1.5">
                <span className="text-xs text-slate-500">fusions</span>
                <span className="font-medium text-white text-xs">{runCount}</span>
              </div>
            </div>
            {onShowAlternatives && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Find the recipe that produces the target shard in the cycle
                  const step = tree.steps.find((step) => step.outputShard === tree.shard);
                  const targetRecipe = step?.recipe || null;
                  onShowAlternatives(tree.shard, {
                    currentRecipe: targetRecipe,
                    requiredQuantity: tree.quantity,
                  });
                }}
                className="p-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/20 hover:border-blue-500/30 rounded transition-colors cursor-pointer"
                title="Show alternatives"
              >
                <Settings className="w-4 h-4 text-blue-300 hover:text-blue-200" />
              </button>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-slate-400/50 pl-3 pr-0.5 py-0.5 space-y-2">
            <div className="space-y-0.5">
              {[...tree.steps]
                .slice()
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

                  if (stepNumber === 1) {
                    const stepNodeId = `${nodeId}-step-${stepNumber}`;
                    const stepIsExpanded = getExpansionState(stepNodeId, true);

                    return (
                      <div key={stepIndex} className="rounded border border-slate-400/50 overflow-hidden">
                        <div
                          className="flex items-center justify-between w-full pl-3 pr-2 py-1 hover:bg-slate-800/50 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggle(stepNodeId);
                          }}
                        >
                          <div className="flex-1 text-left">
                            <div className="flex items-center space-x-2">
                              {renderChevron(stepIsExpanded)}
                              {renderRecipeDisplay(outputQuantity, outputShardData, input1Quantity, input1Shard, input2Quantity, input2Shard, true, stepNumber)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {onShowAlternatives && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onShowAlternatives(step.outputShard, {
                                    currentRecipe: recipe,
                                    requiredQuantity: tree.craftsNeeded * outputQuantity,
                                  });
                                }}
                                className="p-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/20 hover:border-blue-500/30 rounded transition-colors cursor-pointer"
                                title="Show alternatives"
                              >
                                <Settings className="w-4 h-4 text-blue-300 hover:text-blue-200" />
                              </button>
                            )}
                          </div>
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
                      <div key={stepIndex} className="pl-3 pr-2 py-1 rounded border border-slate-400/50 flex items-center justify-between">
                        {renderRecipeDisplay(outputQuantity, outputShardData, input1Quantity, input1Shard, input2Quantity, input2Shard, true, stepNumber)}
                        <div className="flex items-center gap-2">
                          {onShowAlternatives && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onShowAlternatives(step.outputShard, {
                                  currentRecipe: recipe,
                                  requiredQuantity: tree.craftsNeeded * outputQuantity,
                                });
                              }}
                              className="p-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/20 hover:border-blue-500/30 rounded transition-colors cursor-pointer"
                              title="Show alternatives"
                            >
                              <Settings className="w-4 h-4 text-blue-300 hover:text-blue-200" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }
                })}
            </div>

            {/* Cycle summary */}
            {(() => {
              return (
                <div className="flex flex-col gap-0.5 mt-0.5">
                  {Object.values(tree.cycleInputs).map((cycleTree) => {
                    const subNodeId = `${nodeId}-cycle-input`;
                    return <div key={cycleTree.shard}>{renderSubRecipe(cycleTree, data.shards[cycleTree.shard], subNodeId)}</div>;
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  if (tree.method === "direct") {
    return (
      <div className="flex items-center justify-between px-3 py-1 bg-slate-800 rounded-md border border-slate-600">
        <div className="flex items-center space-x-2 p-0.5 text-sm">
          <div className="w-2 h-2 bg-green-400 rounded-full" />
          {renderShardInfo(tree.quantity, shard, false)}
          <span className="px-1 py-0.4 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-md flex-shrink-0">{ironManView ? "Direct" : "Bazaar"}</span>
        </div>
        <div className="text-right">
          {ironManView && (
            <>
              <span className="text-slate-300 text-xs font-medium">{formatNumber(shard.rate)}</span>
              <span className="text-slate-500 text-xs mx-0.5">/</span>
              <span className="text-slate-400 text-xs">hr</span>
            </>
          )}
          {!ironManView && (
            <>
              <span className="text-slate-300 text-xs font-medium">{formatLargeNumber(tree.quantity * shard.rate)}</span>
            </>
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
  const crocProcs = getCrocodileProcs(tree);

  const shardDesc = SHARD_DESCRIPTIONS[shard.id as keyof typeof SHARD_DESCRIPTIONS];
  const input1ShardDesc = SHARD_DESCRIPTIONS[input1Shard.id as keyof typeof SHARD_DESCRIPTIONS];
  const input2ShardDesc = SHARD_DESCRIPTIONS[input2Shard.id as keyof typeof SHARD_DESCRIPTIONS];

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-md overflow-hidden">
      <div
        className="flex items-center justify-between w-full pl-3 pr-2 py-1 hover:bg-slate-700/30 transition-colors cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(nodeId);
        }}
      >
        <div className="flex-1 text-left">
          <div className="flex items-center space-x-1.5">
            {renderChevron(isExpanded)}
            <div className="text-white flex items-center">
              <span className="font-medium text-sm">{Math.floor(displayQuantity)}x</span>

              <Tooltip
                content={formatShardDescription(shardDesc?.description || "No description available.")}
                title={shardDesc?.title}
                shardName={shard.name}
                shardIcon={shard.id}
                rarity={shardDesc?.rarity?.toLowerCase() || shard.rarity}
                family={shardDesc?.family}
                type={shardDesc?.type}
                shardId={shard.id}
                className="cursor-pointer mx-2"
              >
                <div className="flex items-center gap-2">
                  <img src={`${import.meta.env.BASE_URL}shardIcons/${shard.id}.png`} alt={shard.name} className="w-5 h-5 object-contain inline-block align-middle flex-shrink-0" loading="lazy" />
                  <span className={`font-medium ${getRarityColor(shard.rarity)} text-sm whitespace-nowrap truncate`} style={{ maxWidth: "8rem" }} title={shard.name}>
                    {shard.name}
                  </span>
                </div>
              </Tooltip>

              <span className="text-slate-400 text-sm font-medium flex items-center">
                <span className="mr-2 text-white">=</span>
                <span>{Math.floor(input1.quantity)}x</span>

                <Tooltip
                  content={formatShardDescription(input1ShardDesc?.description || "No description available.")}
                  title={input1ShardDesc?.title}
                  shardName={input1Shard.name}
                  shardIcon={input1Shard.id}
                  rarity={input1ShardDesc?.rarity?.toLowerCase() || input1Shard.rarity}
                  family={input1ShardDesc?.family}
                  type={input1ShardDesc?.type}
                  shardId={input1Shard.id}
                  className="cursor-pointer mx-2"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={`${import.meta.env.BASE_URL}shardIcons/${input1Shard.id}.png`}
                      alt={input1Shard.name}
                      className="w-5 h-5 object-contain inline-block align-middle flex-shrink-0"
                      loading="lazy"
                    />
                    <span className={getRarityColor(input1Shard.rarity) + " whitespace-nowrap truncate"} style={{ maxWidth: "8rem" }}>
                      {input1Shard.name}
                    </span>
                  </div>
                </Tooltip>

                <span className="mr-2 text-white">+</span>
                <span>{Math.floor(input2.quantity)}x</span>

                <Tooltip
                  content={formatShardDescription(input2ShardDesc?.description || "No description available.")}
                  title={input2ShardDesc?.title}
                  shardName={input2Shard.name}
                  shardIcon={input2Shard.id}
                  rarity={input2ShardDesc?.rarity?.toLowerCase() || input2Shard.rarity}
                  family={input2ShardDesc?.family}
                  type={input2ShardDesc?.type}
                  shardId={input2Shard.id}
                  className="cursor-pointer mx-2"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={`${import.meta.env.BASE_URL}shardIcons/${input2Shard.id}.png`}
                      alt={input2Shard.name}
                      className="w-5 h-5 object-contain inline-block align-middle flex-shrink-0"
                      loading="lazy"
                    />
                    <span className={getRarityColor(input2Shard.rarity) + " whitespace-nowrap truncate"} style={{ maxWidth: "8rem" }}>
                      {input2Shard.name}
                    </span>
                  </div>
                </Tooltip>
                {crocProcs !== null && (
                  <Tooltip
                    content={`Crocodile has a chance to double the output of reptile recipes. You need ${crocProcs} Pure Reptile triggers to have enough shards for the craft. This is based on average luck`}
                    title="Crocodile - Pure Reptile"
                    className="cursor-help"
                    showRomanNumerals={false}
                  >
                    <span className="px-1 py-0.4 text-xs bg-blue-500/15 text-blue-400 border border-blue-400/40 rounded-md flex-shrink-0 ml-2 flex items-center gap-1">
                      <span className="font-medium">Pure Reptile needed</span>
                      <span className="font-bold">{crocProcs}</span>
                    </span>
                  </Tooltip>
                )}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="flex items-center justify-end space-x-1.5">
              <span className="text-xs text-slate-500">fusions</span>
              <span className="font-medium text-white text-xs">{crafts}</span>
            </div>
          </div>
          {onShowAlternatives && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowAlternatives(tree.shard, {
                  currentRecipe: "recipe" in tree ? tree.recipe : null,
                  requiredQuantity: tree.quantity,
                });
              }}
              className="p-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/20 hover:border-blue-500/30 rounded transition-colors cursor-pointer"
              title="Show alternatives"
            >
              <Settings className="w-4 h-4 text-blue-300 hover:text-blue-200" />
            </button>
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
            noWoodenBait={noWoodenBait}
            ironManView={ironManView}
          />
          <RecipeTreeNode
            tree={input2}
            data={data}
            nodeId={`${nodeId}-1`}
            expandedStates={expandedStates}
            onToggle={onToggle}
            onShowAlternatives={onShowAlternatives}
            noWoodenBait={noWoodenBait}
            ironManView={ironManView}
          />
        </div>
      )}
    </div>
  );
};
