import type React from "react";
import type { AlternativeSelectionContext, Data, RecipeTree } from "../../types/types";
import { CycleNode, DirectShardNode, DirectShardRow, RecipeNode, SubRecipeRow } from "./shared";
import { getCrocodileProcs, useExpansionState } from "./treeHelpers";

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

export const RecipeTreeNode = ({
  tree,
  data,
  isTopLevel = false,
  totalShardsProduced = tree.quantity,
  nodeId,
  expandedStates,
  onToggle,
  onShowAlternatives,
  ironManView,
}: RecipeTreeNodeProps) => {
  const getExpansionState = useExpansionState(expandedStates);
  const shard = data.shards[tree.shard];

  // Inside a cycle the tree is drawn with compact rows rather than full nodes.
  const renderSubRecipe = (subTree: RecipeTree, nodePrefix: string): React.ReactNode => {
    const subShard = data.shards[subTree.shard];
    if (subTree.method === "direct") return <DirectShardRow quantity={subTree.quantity} shard={subShard} ironManView={ironManView} />;
    if (subTree.method !== "recipe") return null;

    const subNodeId = `${nodePrefix}-${subShard.id}`;
    return (
      <SubRecipeRow
        quantity={subTree.quantity}
        craftsNeeded={subTree.craftsNeeded}
        recipe={subTree.recipe}
        outputShard={subShard}
        shards={data.shards}
        isExpanded={getExpansionState(subNodeId, true)}
        onToggle={() => onToggle(subNodeId)}
      >
        {subTree.inputs.map((input) => data.shards[input.shard] && <div key={`sub-${input.shard}`}>{renderSubRecipe(input, subNodeId)}</div>)}
      </SubRecipeRow>
    );
  };

  if (tree.method === "cycle") {
    const firstStepId = `${nodeId}-step-1`;
    return (
      <CycleNode
        tree={tree}
        shards={data.shards}
        crocProcs={getCrocodileProcs(tree, data)}
        isExpanded={getExpansionState(nodeId, true)}
        ironManView={ironManView}
        onToggle={() => onToggle(nodeId)}
        onShowAlternatives={onShowAlternatives}
        firstStepExpanded={getExpansionState(firstStepId, true)}
        onToggleFirstStep={() => onToggle(firstStepId)}
        firstStepInput={renderSubRecipe(tree.inputRecipe, firstStepId)}
        // Index the id: without it every cycle input shares one expansion entry,
        // so expanding one expanded all of them.
        fodder={tree.cycleInputs.map((cycleTree, index) => (
          <div key={cycleTree.shard}>{renderSubRecipe(cycleTree, `${nodeId}-cycle-input-${index}`)}</div>
        ))}
      />
    );
  }

  if (tree.method === "direct") {
    return (
      <DirectShardNode
        quantity={tree.quantity}
        shard={shard}
        ironManView={ironManView}
        onShowAlternatives={onShowAlternatives && (() => onShowAlternatives(tree.shard, { currentRecipe: null, requiredQuantity: tree.quantity }))}
      />
    );
  }

  const [input1, input2] = tree.inputs;
  const childProps = { data, expandedStates, onToggle, onShowAlternatives, ironManView };

  return (
    <RecipeNode
      outputQuantity={isTopLevel ? Math.floor(totalShardsProduced) : tree.quantity}
      outputShard={shard}
      input1Quantity={input1.quantity}
      input1Shard={data.shards[input1.shard]}
      input2Quantity={input2.quantity}
      input2Shard={data.shards[input2.shard]}
      crafts={tree.craftsNeeded ?? 1}
      crocProcs={getCrocodileProcs(tree, data)}
      isExpanded={getExpansionState(nodeId, true)}
      onToggle={() => onToggle(nodeId)}
      onShowAlternatives={onShowAlternatives && (() => onShowAlternatives(tree.shard, { currentRecipe: tree.recipe, requiredQuantity: tree.quantity }))}
    >
      <RecipeTreeNode tree={input1} nodeId={`${nodeId}-0`} {...childProps} />
      <RecipeTreeNode tree={input2} nodeId={`${nodeId}-1`} {...childProps} />
    </RecipeNode>
  );
};
