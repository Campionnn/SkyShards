import React from "react";
import { getRarityColor, getShardDetails, formatShardDescription } from "../../utils/index";
import { ChevronDown, ChevronRight, MoveRight, Settings } from "lucide-react";
import { formatNumber } from "../../utils/index";
import type { RecipeTreeNodeProps, Recipe } from "../../types/index";
import { Tooltip } from "../Tooltip";
import { SHARD_DESCRIPTIONS } from "../../constants";

export const RecipeTreeNode: React.FC<RecipeTreeNodeProps> = ({ tree, data, isTopLevel = false, totalShardsProduced = tree.quantity, nodeId, expandedStates, onToggle, onShowAlternatives }) => {
  const shard = data.shards[tree.shard];

  const findRecipeForShard = (shardId: string) => {
    const recipesForShard = data.recipes[shardId];
    if (!recipesForShard?.length) return null;

    const specificRecipes = {
      U8: (recipe: any) => recipe.inputs.includes("C35") && recipe.inputs.includes("U38"),
      C35: (recipe: any) => recipe.inputs.includes("C23") && recipe.inputs.includes("U38"),
    };

    const finder = specificRecipes[shardId as keyof typeof specificRecipes];
    return finder ? recipesForShard.find(finder) : recipesForShard.sort((a, b) => b.outputQuantity - a.outputQuantity)[0];
  };

  const renderChevron = (isExpanded: boolean) => (isExpanded ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4 text-amber-400" />);

  const renderShardInfo = (quantity: number, shard: any, showRate = true) => {
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
          className="cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}shardIcons/${shard.id}.png`} alt={shard.name} className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
            <span className={getRarityColor(shard.rarity)}>{shard.name}</span>
          </div>
        </Tooltip>
        {showRate && (
          <div className="text-right min-w-[80px] ml-2">
            <span className="text-slate-300 text-xs font-medium">{formatNumber(shard.rate)}</span>
            <span className="text-slate-500 text-xs mx-0.5">/</span>
            <span className="text-slate-400 text-xs">hr</span>
          </div>
        )}
      </>
    );
  };

  const renderRecipeDisplay = (outputQuantity: number, outputShard: any, input1Quantity: number, input1Shard: any, input2Quantity: number, input2Shard: any, showStep = false, stepNumber?: number) => {
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

  const renderDirectShard = (quantity: number, shard: any, context?: { otherInputShard?: string; outputShard?: string; currentRecipe?: Recipe | null }) => (
    <div className="bg-slate-600/20 rounded border border-slate-300/50 flex items-center justify-between px-3 py-1.5 text-sm font-medium gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-2 h-2 bg-green-400 rounded-full" />
        {renderShardInfo(quantity, shard, false)}
        <span className="px-1 py-0.4 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-md flex-shrink-0">Direct</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right min-w-[80px] ml-2">
          <span className="text-slate-300 text-xs font-medium">{formatNumber(shard.rate)}</span>
          <span className="text-slate-500 text-xs mx-0.5">/</span>
          <span className="text-slate-400 text-xs">hr</span>
        </div>
        {onShowAlternatives && context && (
          <button
            onClick={() =>
              onShowAlternatives(shard.id, {
                isDirectInput: true,
                inputShard: shard.id,
                otherInputShard: context.otherInputShard,
                outputShard: context.outputShard,
                currentRecipe: context.currentRecipe,
              })
            }
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Show alternatives"
          >
            <Settings className="w-4 h-4 text-slate-400 hover:text-slate-300" />
          </button>
        )}
      </div>
    </div>
  );

  const renderSubRecipe = (recipe: any, inputShard: any, nodePrefix: string, level = 1) => {
    const maxOutputQuantity = recipe.outputQuantity;
    const input1Shard = data.shards[recipe.inputs[0]];
    const input2Shard = data.shards[recipe.inputs[1]];
    const input1Quantity = input1Shard.fuse_amount;
    const input2Quantity = input2Shard.fuse_amount;
    const subNodeId = `${nodePrefix}-${inputShard.id}`;
    const isExpanded = expandedStates.get(subNodeId) ?? true;

    return (
      <div className="bg-slate-600/20 rounded border border-slate-300/50 overflow-hidden">
        <div className="flex items-center justify-between w-full px-3 py-1.5">
          <button onClick={() => onToggle(subNodeId)} className="flex-1 text-left cursor-pointer hover:bg-slate-800/40 transition-colors rounded p-0.5">
            <div className="flex items-center space-x-2">
              {renderChevron(isExpanded)}
              {renderRecipeDisplay(maxOutputQuantity, inputShard, input1Quantity, input1Shard, input2Quantity, input2Shard)}
            </div>
          </button>
          <div className="text-right min-w-[80px] ml-2">
            <div className="flex items-center justify-end space-x-1.5">
              <span className="text-xs text-slate-500">fusions</span>
              <span className="font-medium text-white text-xs">1</span>
            </div>
          </div>
        </div>
        {isExpanded && (
          <div className="border-t border-slate-400/70 pl-3 pr-0.5 py-0.5 flex flex-col gap-0.5">
            {recipe.inputs.map((directInputId: string) => {
              const directShard = data.shards[directInputId];
              if (!directShard) return null;

              const subRecipe = findRecipeForShard(directInputId);
              const isDirect = directInputId === "C11" || directInputId === "U38" || directInputId === "C23";

              if (isDirect) {
                return <div key={`direct-${directInputId}`}>{renderDirectShard(directShard.fuse_amount, directShard)}</div>;
              } else if (subRecipe && level < 2) {
                return <div key={`sub-${directInputId}`}>{renderSubRecipe(subRecipe, directShard, subNodeId, level + 1)}</div>;
              }
              return null;
            })}
          </div>
        )}
      </div>
    );
  };

  if (tree.method === "cycle") {
    const isExpanded = expandedStates.get(nodeId) ?? true;
    const runCount = tree.cycles.reduce((sum, cycle) => sum + cycle.expectedCrafts, 0);

    return (
      <div className="flex flex-col border border-slate-400/70 rounded-md bg-slate-500/40">
        <div className="flex items-center justify-between w-full px-3 py-1.5">
          <button className="flex-1 text-left cursor-pointer hover:bg-slate-800/40 transition-colors rounded p-0.5" onClick={() => onToggle(nodeId)}>
            <div className="flex items-center space-x-2">
              {renderChevron(isExpanded)}
              <div className="flex items-center gap-3">
                <div className="text-xs text-amber-300">{runCount} crafts</div>
                <MoveRight className="w-4 text-amber-400" />
                <div className="flex items-center space-x-2">
                  {renderShardInfo(Math.floor(tree.quantity), shard, false)}
                  <span className="px-1 bg-amber-500/20 text-amber-400 border border-amber-400/40 text-[11px] font-medium rounded-md">CYCLE !</span>
                </div>
              </div>
            </div>
          </button>
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
                  onShowAlternatives(tree.shard, {
                    currentRecipe: null, // Cycles don't have a single recipe
                  });
                }}
                className="p-1 hover:bg-slate-700 rounded transition-colors"
                title="Show alternatives"
              >
                <Settings className="w-4 h-4 text-slate-400 hover:text-slate-300" />
              </button>
            )}
          </div>
        </div>

        {isExpanded && tree.cycles.length > 0 && (
          <div className="border-t border-slate-400/70 pl-3 pr-0.5 py-0.5 space-y-2">
            {tree.cycles.map((cycle, cycleIndex) => (
              <div key={cycleIndex}>
                <div className="space-y-0.5">
                  {[...cycle.steps]
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
                      if (recipe.isReptile) outputQuantity *= cycle.multiplier;
                      const stepNumber = cycle.steps.length - stepIndex;

                      if (stepNumber === 1) {
                        const stepNodeId = `${nodeId}-step-${stepNumber}`;
                        const stepIsExpanded = expandedStates.get(stepNodeId) ?? true;

                        return (
                          <div key={stepIndex} className="bg-slate-600/20 rounded border border-slate-300/50 overflow-hidden">
                            <div className="flex items-center justify-between w-full px-3 py-1.5">
                              <button onClick={() => onToggle(stepNodeId)} className="flex-1 text-left cursor-pointer hover:bg-slate-800/40 transition-colors rounded p-0.5">
                                <div className="flex items-center space-x-2">
                                  {renderChevron(stepIsExpanded)}
                                  {renderRecipeDisplay(outputQuantity, outputShardData, input1Quantity, input1Shard, input2Quantity, input2Shard, true, stepNumber)}
                                </div>
                              </button>
                              <div className="flex items-center gap-2">
                                <div className="text-right min-w-[80px] ml-2">
                                  <div className="flex items-center justify-end space-x-1.5">
                                    <span className="text-xs text-slate-500">fusions</span>
                                    <span className="font-medium text-white text-xs">{cycle.expectedCrafts}</span>
                                  </div>
                                </div>
                                {onShowAlternatives && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onShowAlternatives(step.outputShard, {
                                        currentRecipe: recipe,
                                      });
                                    }}
                                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                                    title="Show alternatives"
                                  >
                                    <Settings className="w-4 h-4 text-slate-400 hover:text-slate-300" />
                                  </button>
                                )}
                              </div>
                            </div>
                            {stepIsExpanded && (
                              <div className="border-t border-slate-400/70 pl-3 pr-0.5 py-0.5 space-y-1">
                                {recipe.inputs.map((inputId: string) => {
                                  const inputShard = data.shards[inputId];
                                  const inputRecipe = findRecipeForShard(inputId);

                                  if (inputRecipe && inputShard && inputId !== "C11" && inputId !== "U38" && inputId !== "C23") {
                                    return (
                                      <div key={inputId} className="space-y-1">
                                        {renderSubRecipe(inputRecipe, inputShard, nodeId)}
                                      </div>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        return (
                          <div key={stepIndex} className="px-3 py-1.5 bg-slate-600/20 rounded border border-slate-300/50 flex items-center justify-between">
                            {renderRecipeDisplay(outputQuantity, outputShardData, input1Quantity, input1Shard, input2Quantity, input2Shard, true, stepNumber)}
                            <div className="flex items-center gap-2">
                              <div className="text-right min-w-[80px] ml-2">
                                <div className="flex items-center justify-end space-x-1.5">
                                  <span className="text-xs text-slate-500">fusions</span>
                                  <span className="font-medium text-white text-xs">{cycle.expectedCrafts}</span>
                                </div>
                              </div>
                              {onShowAlternatives && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onShowAlternatives(step.outputShard, {
                                      currentRecipe: recipe,
                                    });
                                  }}
                                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                                  title="Show alternatives"
                                >
                                  <Settings className="w-4 h-4 text-slate-400 hover:text-slate-300" />
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
                  const outputShardIds = new Set(cycle.steps.map((step) => step.outputShard));
                  const inputShardTotals: Record<string, { quantity: number; shard: any }> = {};
                  cycle.steps.forEach((step) => {
                    step.recipe.inputs.forEach((inputId: string) => {
                      const inputShard = data.shards[inputId];
                      if (!inputShard || outputShardIds.has(inputId)) return;
                      if (!inputShardTotals[inputId]) {
                        inputShardTotals[inputId] = { quantity: 0, shard: inputShard };
                      }
                      inputShardTotals[inputId].quantity += inputShard.fuse_amount;
                    });
                  });

                  return (
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      {Object.values(inputShardTotals).map(({ quantity, shard }) => (
                        <div key={shard.id}>{renderDirectShard(quantity * runCount, shard)}</div>
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

  if (tree.method === "direct") {
    return (
      <div className="flex items-center justify-between px-3 py-1 bg-slate-800 rounded-md border border-slate-600">
        <div className="flex items-center space-x-2 p-0.5">
          <div className="w-2 h-2 bg-green-400 rounded-full" />
          {renderShardInfo(tree.quantity, shard, false)}
          <span className="px-1 py-0.4 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-md flex-shrink-0">Direct</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs text-slate-300">
              {formatNumber(shard.rate)}
              <span className="text-slate-500 text-xs mx-0.5">/</span>
              <span className="text-slate-400 text-xs">hr</span>
            </div>
          </div>
          {onShowAlternatives && (
            <button onClick={() => onShowAlternatives(tree.shard, { currentRecipe: null })} className="p-1 hover:bg-slate-700 rounded transition-colors" title="Show alternatives">
              <Settings className="w-4 h-4 text-slate-400 hover:text-slate-300" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Recipe nodes
  const isExpanded = expandedStates.get(nodeId) ?? true;
  const input1 = tree.inputs![0];
  const input2 = tree.inputs![1];
  const input1Shard = data.shards[input1.shard];
  const input2Shard = data.shards[input2.shard];
  const crafts = "craftsNeeded" in tree ? tree.craftsNeeded ?? 1 : 1;
  const displayQuantity = isTopLevel ? totalShardsProduced : tree.quantity;

  const shardDesc = SHARD_DESCRIPTIONS[shard.id as keyof typeof SHARD_DESCRIPTIONS];
  const input1ShardDesc = SHARD_DESCRIPTIONS[input1Shard.id as keyof typeof SHARD_DESCRIPTIONS];
  const input2ShardDesc = SHARD_DESCRIPTIONS[input2Shard.id as keyof typeof SHARD_DESCRIPTIONS];

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-md overflow-hidden">
      <div className="flex items-center justify-between w-full px-3 py-1">
        <button onClick={() => onToggle(nodeId)} className="flex-1 text-left cursor-pointer hover:bg-slate-700/50 transition-colors rounded p-0.5">
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
                className="cursor-pointer mx-2"
              >
                <div className="flex items-center gap-2">
                  <img src={`${import.meta.env.BASE_URL}shardIcons/${shard.id}.png`} alt={shard.name} className="w-5 h-5 object-contain inline-block align-middle flex-shrink-0" loading="lazy" />
                  <span className={`font-medium ${getRarityColor(shard.rarity)} text-sm whitespace-nowrap truncate`} style={{ maxWidth: "8rem" }} title={getShardDetails(shard, false)}>
                    {shard.name}
                  </span>
                </div>
              </Tooltip>

              <span className="text-slate-400 text-sm font-medium flex items-center">
                <span className="mx-2 text-white">=</span>
                <span>{Math.floor(input1.quantity)}x</span>

                <Tooltip
                  content={formatShardDescription(input1ShardDesc?.description || "No description available.")}
                  title={input1ShardDesc?.title}
                  shardName={input1Shard.name}
                  shardIcon={input1Shard.id}
                  rarity={input1ShardDesc?.rarity?.toLowerCase() || input1Shard.rarity}
                  family={input1ShardDesc?.family}
                  type={input1ShardDesc?.type}
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

                <span className="mx-2 text-white">+</span>
                <span>{Math.floor(input2.quantity)}x</span>

                <Tooltip
                  content={formatShardDescription(input2ShardDesc?.description || "No description available.")}
                  title={input2ShardDesc?.title}
                  shardName={input2Shard.name}
                  shardIcon={input2Shard.id}
                  rarity={input2ShardDesc?.rarity?.toLowerCase() || input2Shard.rarity}
                  family={input2ShardDesc?.family}
                  type={input2ShardDesc?.type}
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
              </span>
            </div>
          </div>
        </button>
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
                });
              }}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
              title="Show alternatives"
            >
              <Settings className="w-4 h-4 text-slate-400 hover:text-slate-300" />
            </button>
          )}
        </div>
      </div>
      {isExpanded && (
        <div className="border-t border-slate-600 pl-3 pr-0.5 py-0.5 space-y-0.5">
          <RecipeTreeNode tree={input1} data={data} nodeId={`${nodeId}-0`} expandedStates={expandedStates} onToggle={onToggle} onShowAlternatives={onShowAlternatives} />
          <RecipeTreeNode tree={input2} data={data} nodeId={`${nodeId}-1`} expandedStates={expandedStates} onToggle={onToggle} onShowAlternatives={onShowAlternatives} />
        </div>
      )}
    </div>
  );
};
