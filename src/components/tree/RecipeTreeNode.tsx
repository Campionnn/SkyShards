import React from "react";
import { getRarityColor, getShardDetails, formatShardDescription } from "../../utils/index";
import { ChevronDown, ChevronRight, MoveRight } from "lucide-react";
import { formatNumber } from "../../utils/index";
import type { RecipeTreeNodeProps } from "../../types/index";
import { Tooltip } from "../Tooltip";
import { SHARD_DESCRIPTIONS } from "../../constants";

export const RecipeTreeNode: React.FC<RecipeTreeNodeProps> = ({ tree, data, isTopLevel = false, totalShardsProduced = tree.quantity, nodeId, expandedStates, onToggle }) => {
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

  const renderChevron = (isExpanded: boolean) => (isExpanded ? <ChevronDown className="w-6 h-6 text-amber-400" /> : <ChevronRight className="w-6 h-6 text-amber-400" />);

  const renderShardInfo = (quantity: number, shard: any, showRate = true) => {
    const shardDesc = SHARD_DESCRIPTIONS[shard.id as keyof typeof SHARD_DESCRIPTIONS];
    return (
      <>
        <span className="text-white flex-shrink-0 text-sm">{quantity}x</span>
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
          <div className="flex items-center gap-2 flex-shrink-0">
            <img src={`${import.meta.env.BASE_URL}shardIcons/${shard.id}.png`} alt={shard.name} className="w-6 h-6 object-contain flex-shrink-0" loading="lazy" />
            <span className={`${getRarityColor(shard.rarity)} whitespace-nowrap text-sm`}>{shard.name}</span>
          </div>
        </Tooltip>
        {showRate && (
          <div className="text-right flex-shrink-0">
            <span className="text-slate-300 text-sm font-medium">{formatNumber(shard.rate)}</span>
            <span className="text-slate-500 text-sm mx-0.5">/</span>
            <span className="text-slate-400 text-sm">hr</span>
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
      <div className="flex items-center gap-2 text-sm font-medium min-w-0">
        {showStep && <span className="font-normal text-sm text-amber-300 flex-shrink-0 mr-2">Step {stepNumber}:</span>}

        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <span className="text-white flex-shrink-0 text-sm">{outputQuantity}x</span>
          <Tooltip
            content={formatShardDescription(outputShardDesc?.description || "No description available.")}
            title={outputShardDesc?.title}
            shardName={outputShard.name}
            shardIcon={outputShard.id}
            rarity={outputShardDesc?.rarity?.toLowerCase() || outputShard.rarity}
            family={outputShardDesc?.family}
            type={outputShardDesc?.type}
            className="cursor-pointer min-w-0"
          >
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              <img src={`${import.meta.env.BASE_URL}shardIcons/${outputShard.id}.png`} alt={outputShard.name} className="w-6 h-6 object-contain flex-shrink-0" loading="lazy" />
              <span className={`${getRarityColor(outputShard.rarity)} whitespace-nowrap text-sm`}>{outputShard.name}</span>
            </div>
          </Tooltip>
        </div>

        <span className="flex-shrink-0 text-sm">=</span>

        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <span className="text-slate-400 flex-shrink-0 text-sm">{input1Quantity}x</span>
          <Tooltip
            content={formatShardDescription(input1ShardDesc?.description || "No description available.")}
            title={input1ShardDesc?.title}
            shardName={input1Shard.name}
            shardIcon={input1Shard.id}
            rarity={input1ShardDesc?.rarity?.toLowerCase() || input1Shard.rarity}
            family={input1ShardDesc?.family}
            type={input1ShardDesc?.type}
            className="cursor-pointer min-w-0"
          >
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              <img src={`${import.meta.env.BASE_URL}shardIcons/${input1Shard.id}.png`} alt={input1Shard.name} className="w-6 h-6 object-contain flex-shrink-0" loading="lazy" />
              <span className={`${getRarityColor(input1Shard.rarity)} whitespace-nowrap text-sm`}>{input1Shard.name}</span>
            </div>
          </Tooltip>
        </div>

        <span className="flex-shrink-0 text-sm">+</span>

        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <span className="text-slate-400 flex-shrink-0 text-sm">{input2Quantity}x</span>
          <Tooltip
            content={formatShardDescription(input2ShardDesc?.description || "No description available.")}
            title={input2ShardDesc?.title || input2Shard.name}
            shardName={input2Shard.name}
            shardIcon={input2Shard.id}
            rarity={input2ShardDesc?.rarity?.toLowerCase() || input2Shard.rarity}
            family={input2ShardDesc?.family}
            type={input2ShardDesc?.type}
            className="cursor-pointer min-w-0"
          >
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              <img src={`${import.meta.env.BASE_URL}shardIcons/${input2Shard.id}.png`} alt={input2Shard.name} className="w-6 h-6 object-contain flex-shrink-0" loading="lazy" />
              <span className={`${getRarityColor(input2Shard.rarity)} whitespace-nowrap text-sm`}>{input2Shard.name}</span>
            </div>
          </Tooltip>
        </div>
      </div>
    );
  };

  const renderDirectShard = (quantity: number, shard: any) => (
    <div className="bg-slate-600/20 rounded border border-slate-300/50 flex items-center justify-between px-3 py-1.5 text-sm font-medium">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />
        <div className="flex-shrink-0 flex items-center gap-2">{renderShardInfo(quantity, shard, false)}</div>
        <span className="px-1 py-0.4 text-sm bg-green-500/20 text-green-400 border border-green-500/30 rounded-md flex-shrink-0">Direct</span>
      </div>
      <div className="text-right flex-shrink-0">
        <span className="text-slate-300 text-sm font-medium">{formatNumber(shard.rate)}</span>
        <span className="text-slate-500 text-sm mx-0.5">/</span>
        <span className="text-slate-400 text-sm">hr</span>
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
        <button onClick={() => onToggle(subNodeId)} className="w-full px-3 py-1.5 text-left cursor-pointer hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-2 sm:gap-8">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
            {renderChevron(isExpanded)}
            <div className="min-w-0 flex-shrink-0 overflow-hidden">{renderRecipeDisplay(maxOutputQuantity, inputShard, input1Quantity, input1Shard, input2Quantity, input2Shard)}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="flex items-center justify-end gap-1">
              <span className="text-xs text-slate-500">fusions</span>
              <span className="font-medium text-white text-xs">1</span>
            </div>
          </div>
        </button>
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
    const runCount = Math.ceil(tree.quantity / (tree.cycles[0].expectedOutput - tree.cycles[0].baseOutput));

    return (
      <div className="flex flex-col border border-slate-400/70 rounded-md bg-slate-500/40">
        <button className="flex items-center justify-between w-full px-3 py-1.5 text-left cursor-pointer hover:bg-slate-800/40 transition-colors gap-2 sm:gap-8" onClick={() => onToggle(nodeId)}>
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
            {renderChevron(isExpanded)}
            <div className="flex items-center gap-1 sm:gap-2 min-w-0 overflow-hidden">
              <div className="text-sm text-amber-300 flex-shrink-0">{runCount} crafts</div>
              <MoveRight className="w-6 text-amber-400 flex-shrink-0" />
              <div className="flex items-center gap-1 sm:gap-2 min-w-0 overflow-hidden">
                {renderShardInfo(Math.floor(tree.quantity), shard, false)}
                <span className="px-1 bg-amber-500/20 text-amber-400 border border-amber-400/40 text-sm font-medium rounded-md flex-shrink-0">CYCLE !</span>
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="flex items-center justify-end gap-1">
              <span className="text-xs text-slate-500">fusions</span>
              <span className="font-medium text-white text-xs">{runCount}</span>
            </div>
          </div>
        </button>

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
                            <button
                              onClick={() => onToggle(stepNodeId)}
                              className="w-full px-3 py-1.5 text-left cursor-pointer hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-2 sm:gap-8"
                            >
                              <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
                                {renderChevron(stepIsExpanded)}
                                <div className="min-w-0 flex-shrink-0 overflow-hidden">
                                  {renderRecipeDisplay(outputQuantity, outputShardData, input1Quantity, input1Shard, input2Quantity, input2Shard, true, stepNumber)}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-xs text-slate-500">fusions</span>
                                  <span className="font-medium text-white text-xs">{cycle.expectedCrafts}</span>
                                </div>
                              </div>
                            </button>
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
                          <div key={stepIndex} className="px-3 py-1.5 bg-slate-600/20 rounded border border-slate-300/50 flex items-center justify-between gap-2 sm:gap-8">
                            <div className="min-w-0 flex-1 overflow-hidden">
                              {renderRecipeDisplay(outputQuantity, outputShardData, input1Quantity, input1Shard, input2Quantity, input2Shard, true, stepNumber)}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-xs text-slate-500">fusions</span>
                                <span className="font-medium text-white text-xs">{cycle.expectedCrafts}</span>
                              </div>
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
        <div className="flex items-center gap-2 p-0.5">
          <div className="w-2 h-2 bg-green-400 rounded-full" />
          {renderShardInfo(tree.quantity, shard, false)}
          <span className="px-1 py-0.4 text-sm bg-green-500/20 text-green-400 border border-green-500/30 rounded-md flex-shrink-0">Direct</span>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-300">
            {formatNumber(shard.rate)}
            <span className="text-slate-500 text-xs font-bold mx-0.5">/</span>
            <span className="text-slate-400 text-xs">hr</span>
          </div>
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
      <button onClick={() => onToggle(nodeId)} className="w-full px-3 py-1 text-left cursor-pointer hover:bg-slate-700/50 transition-colors">
        <div className="flex items-center justify-between gap-15 sm:gap-8 min-w-0">
          <div className="flex items-center gap-1 sm:gap-2 p-0.5 min-w-0 flex-1">
            {renderChevron(isExpanded)}
            <div className="text-white flex items-center gap-1 sm:gap-2 min-w-0 flex-shrink-0 overflow-hidden">
              <span className="font-medium text-sm flex-shrink-0">{Math.floor(displayQuantity)}x</span>

              <Tooltip
                content={formatShardDescription(shardDesc?.description || "No description available.")}
                title={shardDesc?.title}
                shardName={shard.name}
                shardIcon={shard.id}
                rarity={shardDesc?.rarity?.toLowerCase() || shard.rarity}
                family={shardDesc?.family}
                type={shardDesc?.type}
                className="cursor-pointer min-w-0"
              >
                <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-shrink-0">
                  <img src={`${import.meta.env.BASE_URL}shardIcons/${shard.id}.png`} alt={shard.name} className="w-6 h-6 object-contain flex-shrink-0" loading="lazy" />
                  <span className={`font-medium ${getRarityColor(shard.rarity)} text-sm truncate`} title={getShardDetails(shard, false)}>
                    {shard.name}
                  </span>
                </div>
              </Tooltip>

              <span className="text-slate-400 text-sm font-medium flex items-center gap-1 min-w-0 flex-shrink-0 overflow-hidden">
                <span className="text-white flex-shrink-0 text-sm">=</span>

                <span className="flex-shrink-0 text-sm">{Math.floor(input1.quantity)}x</span>

                <Tooltip
                  content={formatShardDescription(input1ShardDesc?.description || "No description available.")}
                  title={input1ShardDesc?.title}
                  shardName={input1Shard.name}
                  shardIcon={input1Shard.id}
                  rarity={input1ShardDesc?.rarity?.toLowerCase() || input1Shard.rarity}
                  family={input1ShardDesc?.family}
                  type={input1ShardDesc?.type}
                  className="cursor-pointer min-w-0"
                >
                  <div className="flex items-center gap-1 min-w-0 flex-shrink-0">
                    <img src={`${import.meta.env.BASE_URL}shardIcons/${input1Shard.id}.png`} alt={input1Shard.name} className="w-6 h-6 object-contain flex-shrink-0" loading="lazy" />
                    <span className={`${getRarityColor(input1Shard.rarity)} text-sm truncate`}>{input1Shard.name}</span>
                  </div>
                </Tooltip>

                <span className="flex-shrink-0 text-white text-sm">+</span>

                <span className="flex-shrink-0 text-sm">{Math.floor(input2.quantity)}x</span>

                <Tooltip
                  content={formatShardDescription(input2ShardDesc?.description || "No description available.")}
                  title={input2ShardDesc?.title}
                  shardName={input2Shard.name}
                  shardIcon={input2Shard.id}
                  rarity={input2ShardDesc?.rarity?.toLowerCase() || input2Shard.rarity}
                  family={input2ShardDesc?.family}
                  type={input2ShardDesc?.type}
                  className="cursor-pointer min-w-0"
                >
                  <div className="flex items-center gap-1 min-w-0 flex-shrink-0">
                    <img src={`${import.meta.env.BASE_URL}shardIcons/${input2Shard.id}.png`} alt={input2Shard.name} className="w-6 h-6 object-contain flex-shrink-0" loading="lazy" />
                    <span className={`${getRarityColor(input2Shard.rarity)} text-sm truncate`}>{input2Shard.name}</span>
                  </div>
                </Tooltip>
              </span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="flex items-center justify-end gap-1">
              <span className="text-xs text-slate-500">fusions</span>
              <span className="font-medium text-white text-xs">{crafts}</span>
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
