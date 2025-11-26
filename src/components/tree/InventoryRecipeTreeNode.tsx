import React from "react";
import { getRarityColor, formatShardDescription, formatLargeNumber } from "../../utilities";
import { GiGecko } from "react-icons/gi";
import { ChevronDown, ChevronRight, Settings, Package, MoveRight } from "lucide-react";
import { formatNumber } from "../../utilities";
import type { InventoryRecipeTreeNodeProps, Recipe, Shard, InventoryRecipeTree } from "../../types/types";
import { Tooltip } from "../ui";
import { SHARD_DESCRIPTIONS } from "../../constants";

export const InventoryRecipeTreeNode: React.FC<InventoryRecipeTreeNodeProps> = ({
  tree,
  data,
  isTopLevel = false,
  totalShardsProduced,
  nodeId,
  expandedStates,
  onToggle,
  onShowAlternatives,
  noWoodenBait = false,
  ironManView,
  isInCycle = false,
  remainingInventory,
}) => {
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
            noWoodenBait={noWoodenBait}
            ironManView={ironManView}
            isInCycle={isInCycle}
            remainingInventory={remainingInventory}
          />
        ))}
      </>
    );
  }

  const shard = data.shards[tree.shard];

  // Helper function to get expansion state and ensure it's initialized
  const getExpansionState = (id: string, defaultState: boolean = true) => {
    if (!expandedStates.has(id)) {
      expandedStates.set(id, defaultState);
    }
    return expandedStates.get(id)!;
  };

  const isReptileRecipe = (recipe: Recipe | undefined, input1Shard: Shard | undefined, input2Shard: Shard | undefined): boolean => {
    return (recipe?.isReptile || input1Shard?.family?.toLowerCase().includes("reptile") || input2Shard?.family?.toLowerCase().includes("reptile")) as boolean;
  };

  const getCrocodileProcs = (tree: InventoryRecipeTree): number | null => {
    if (Array.isArray(tree)) return null;

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
          inputQuantityOfReptile = Array.isArray(tree.inputs[0]) ? 0 : tree.inputs[0].quantity;
          inputFuseAmount = input1Shard.fuse_amount;
        } else if (input2Shard?.family?.toLowerCase().includes("reptile")) {
          inputQuantityOfReptile = Array.isArray(tree.inputs[1]) ? 0 : tree.inputs[1].quantity;
          inputFuseAmount = input2Shard.fuse_amount;
        }
        return Math.ceil(requiredOutputQuantity / tree.recipe.outputQuantity - inputQuantityOfReptile / inputFuseAmount);
      }
    }
    return null;
  };

  const renderChevron = (isExpanded: boolean) => (isExpanded ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4 text-amber-400" />);

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
          rarity={outputShard.rarity}
          family={outputShard.family}
          type={outputShard.type}
          shardId={outputShard.id}
          className="cursor-pointer"
        >
          <div className="flex items-center gap-2">
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
          rarity={input1Shard.rarity}
          family={input1Shard.family}
          type={input1Shard.type}
          shardId={input1Shard.id}
          className="cursor-pointer"
        >
          <div className="flex items-center gap-2">
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
          rarity={input2Shard.rarity}
          family={input2Shard.family}
          type={input2Shard.type}
          shardId={input2Shard.id}
          className="cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}shardIcons/${input2Shard.id}.png`} alt={input2Shard.name} className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
            <span className={getRarityColor(input2Shard.rarity)}>{input2Shard.name}</span>
          </div>
        </Tooltip>
      </div>
    );
  };

  const renderDirectShard = (quantity: number, shard: Shard, inCycle = false) => {
    return (
      <div className={`flex items-center justify-between pl-3.5 pr-1 py-1 ${inCycle ? 'bg-slate-900' : 'bg-slate-800'} rounded-md border border-slate-600`}>
        <div className="flex items-center space-x-2 p-0.5 text-sm">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2.5" />
          {renderShardInfo(quantity, shard, false)}
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

    if (recipeTree.method === "inventory") {
      const remaining = remainingInventory?.get(inputShard.id) ?? 0;
      return (
        <div className={`flex items-center justify-between pl-3.5 pr-1 py-1 ${inCycle ? 'bg-purple-900/40' : 'bg-purple-900/30'} rounded-md border border-purple-500/50`}>
          <div className="flex items-center space-x-2 p-0.5 text-sm">
            <Package className="w-3.5 h-3.5 text-purple-400 mr-1" />
            {renderShardInfo(recipeTree.quantity, inputShard, false)}
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
    }

    if (recipeTree.method === "direct") return renderDirectShard(recipeTree.quantity, inputShard, inCycle);
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
              noWoodenBait={noWoodenBait}
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
              noWoodenBait={noWoodenBait}
              ironManView={ironManView}
              isInCycle={inCycle}
              remainingInventory={remainingInventory}
            />
          </div>
        )}
      </div>
    );
  };

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
          rarity={shard.rarity}
          family={shard.family}
          type={shard.type}
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

  // Handle inventory method
  if (tree.method === "inventory") {
    const remaining = remainingInventory?.get(shard.id) ?? 0;
    return (
      <div className={`flex items-center justify-between pl-3.5 pr-1 py-1 ${isInCycle ? 'bg-purple-900/40' : 'bg-purple-900/30'} rounded-md border border-purple-500/50`}>
        <div className="flex items-center space-x-2 p-0.5 text-sm">
          <Package className="w-3.5 h-3.5 text-purple-400 mr-1" />
          {renderShardInfo(tree.quantity, shard, false)}
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
  }

  // Handle direct method
  if (tree.method === "direct") {
    return (
      <div className={`flex items-center justify-between pl-3.5 pr-1 py-1 ${isInCycle ? 'bg-slate-900' : 'bg-slate-800'} rounded-md border border-slate-600`}>
        <div className="flex items-center space-x-2 p-0.5 text-sm">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2.5" />
          {renderShardInfo(tree.quantity, shard, false)}
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowAlternatives(tree.shard, {
                  currentRecipe: null,
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
    const crocProcs = getCrocodileProcs(tree);

    const shardDesc = SHARD_DESCRIPTIONS[shard.id as keyof typeof SHARD_DESCRIPTIONS];
    const input1ShardDesc = SHARD_DESCRIPTIONS[input1Shard.id as keyof typeof SHARD_DESCRIPTIONS];
    const input2ShardDesc = SHARD_DESCRIPTIONS[input2Shard.id as keyof typeof SHARD_DESCRIPTIONS];

    // Calculate input quantities
    const getQuantity = (t: InventoryRecipeTree): number => {
      if (Array.isArray(t)) {
        return t.reduce((sum, subtree) => sum + getQuantity(subtree), 0);
      }
      return t.quantity;
    };

    const input1Quantity = getQuantity(input1);
    const input2Quantity = getQuantity(input2);

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
              <div className="text-white flex items-center">
                <span className="font-medium text-sm">{Math.floor(displayQuantity)}x</span>

                <Tooltip
                  content={formatShardDescription(shardDesc?.description || "No description available.")}
                  title={shardDesc?.title}
                  shardName={shard.name}
                  shardIcon={shard.id}
                  rarity={shard.rarity}
                  family={shard.family}
                  type={shard.type}
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
                  <span>{Math.floor(input1Quantity)}x</span>

                  <Tooltip
                    content={formatShardDescription(input1ShardDesc?.description || "No description available.")}
                    title={input1ShardDesc?.title}
                    shardName={input1Shard.name}
                    shardIcon={input1Shard.id}
                    rarity={input1Shard.rarity}
                    family={input1Shard.family}
                    type={input1Shard.type}
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
                  <span>{Math.floor(input2Quantity)}x</span>

                  <Tooltip
                    content={formatShardDescription(input2ShardDesc?.description || "No description available.")}
                    title={input2ShardDesc?.title}
                    shardName={input2Shard.name}
                    shardIcon={input2Shard.id}
                    rarity={input2Shard.rarity}
                    family={input2Shard.family}
                    type={input2Shard.type}
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
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="text-right">
              <div className="flex py-1 px-1.5 gap-1 items-center cursor-pointer">
                <span className="text-xs text-slate-400">fusions</span>
                <span className="font-medium text-slate-300 text-xs">{crafts}</span>
              </div>
            </div>
            {crocProcs !== null && (
              <Tooltip
                content={`Crocodile has a chance to double the output of reptile recipes. You need <span class="text-green-400">${crocProcs} Pure Reptile </span> triggers to have enough shards for the craft. This is based on average luck`}
                title={`Pure Reptile`}
                shardName="Crocodile"
                shardIcon="R45"
                rarity="rare"
                className="cursor-help"
                showRomanNumerals={false}
              >
                <div className="flex items-center gap-1 px-[5px] py-1 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded">
                  <span className="text-xs text-green-300 font-extralight">{crocProcs}</span>
                  <GiGecko className="w-3 h-3 text-green-400" />
                </div>
              </Tooltip>
            )}
            {onShowAlternatives && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShowAlternatives(tree.shard, {
                    currentRecipe: tree.recipe,
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
            <InventoryRecipeTreeNode
              tree={input1}
              data={data}
              nodeId={`${nodeId}-0`}
              expandedStates={expandedStates}
              onToggle={onToggle}
              onShowAlternatives={onShowAlternatives}
              noWoodenBait={noWoodenBait}
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
              noWoodenBait={noWoodenBait}
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
    const crocProcs = getCrocodileProcs(tree);

    return (
      <div className="flex flex-col border border-slate-400/50 rounded-md bg-slate-900">
        <div
          className="flex items-center justify-between w-full pl-3 pr-1 py-1 hover:bg-slate-800/50 transition-colors cursor-pointer"
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
                      <span className="px-1 py-0.4 text-xs bg-blue-500/15 text-blue-400 border border-blue-400/40 rounded-md mx-2 flex items-center gap-1">
                        <span className="font-medium">Pure Reptile needed</span>
                        <span className="font-bold">{crocProcs}</span>
                      </span>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center justify-end space-x-1.5 pl-3">
                <span className="text-xs text-slate-500">fusions</span>
                <span className="font-medium text-white text-xs">{runCount}</span>
              </div>
            </div>
            {onShowAlternatives && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
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
          <div className="border-t border-slate-400/50 pl-3 pr-0.5 py-0.5 space-y-0.5">
            <div className="">
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
                          className="flex items-center justify-between w-full pl-3 pr-1 py-1 hover:bg-slate-800/50 transition-colors cursor-pointer"
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

            <div className="flex gap-1.5 py-1 pl-2">
              <div className="text-slate-400 text-xs border-l-1 border-slate-500 pl-1.5">Cycle Fodder</div>
            </div>

            {/* Cycle inputs/fodder */}
            {(() => {
              return (
                <div className="flex flex-col gap-0.5 mt-0.5">
                  {tree.cycleInputs.map((cycleTree, index) => {
                    const subNodeId = `${nodeId}-cycle-input-${index}`;
                    const cycleTreeShard = Array.isArray(cycleTree)
                      ? (cycleTree[0] && !Array.isArray(cycleTree[0]) ? data.shards[cycleTree[0].shard] : shard)
                      : data.shards[cycleTree.shard];
                    return <div key={`${subNodeId}`}>{renderSubRecipe(cycleTree, cycleTreeShard, subNodeId, true)}</div>;
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  return null;
};

