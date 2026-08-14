import React from "react";
import { GiGecko } from "react-icons/gi";
import { ArrowLeftRight, MoveRight, Settings } from "lucide-react";
import { formatLargeNumber, formatNumber, getRarityColor, shardIconUrl } from "../../utilities";
import { ShardChip, Tooltip } from "../ui";
import { ShardDescription } from "../ui/ShardDescription";
import { SHARD_DESCRIPTIONS } from "../../constants";
import { renderChevron } from "./treeHelpers";
import type { Shard } from "../../types/types";

/**
 * Presentation shared by RecipeTreeNode and InventoryRecipeTreeNode. `ironManView`
 * and `emphasis` are the two axes where the renderers differ, so they are props
 * rather than fixed styling.
 */

interface ShardInfoProps {
  quantity: number;
  shard: Shard;
  ironManView: boolean;
  showRate?: boolean;
}

/** `<n>x <icon> <name>` plus the per-hour rate (ironman) or coin value (bazaar). */
export const ShardInfo: React.FC<ShardInfoProps> = ({ quantity, shard, ironManView, showRate = true }) => (
  <>
    <span className="text-white">{quantity}x</span>
    <ShardChip shard={shard} />
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

export const OrderMattersBadge: React.FC<{ input1Shard: Shard; input2Shard: Shard }> = ({ input1Shard, input2Shard }) => (
  <Tooltip
    shardName="Order matters"
    content={
      <>
        <div>This fusion only works one way round. Add the shards to the fusion machine in this order:</div>
        <div className="flex flex-col gap-1 mt-1.5">
          {[input1Shard, input2Shard].map((shard, index) => (
            <div key={shard.id} className="flex items-center gap-1.5">
              <span className="text-slate-500">{index + 1}.</span>
              <img src={shardIconUrl(shard.id)} alt="" className="w-4 h-4 object-contain flex-shrink-0" loading="lazy" />
              <span className={getRarityColor(shard.rarity)}>{shard.name}</span>
            </div>
          ))}
        </div>
      </>
    }
    warning="Swapping them gives a different shard."
    className="cursor-help"
  >
    <div className="flex items-center gap-1 px-[5px] py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded whitespace-nowrap">
      <ArrowLeftRight className="w-3 h-3 flex-shrink-0" />
      <span className="text-[11px] font-medium">Order matters</span>
    </div>
  </Tooltip>
);

interface RecipeDisplayProps {
  outputQuantity: number;
  outputShard: Shard;
  input1Quantity: number;
  input1Shard: Shard;
  input2Quantity: number;
  input2Shard: Shard;
  showStep?: boolean;
  stepNumber?: number;
  orderMatters?: boolean;
}

/** Compact `<out> = <in1> + <in2>` used for cycle steps and sub-recipes. */
export const RecipeDisplay: React.FC<RecipeDisplayProps> = ({
  outputQuantity,
  outputShard,
  input1Quantity,
  input1Shard,
  input2Quantity,
  input2Shard,
  showStep = false,
  stepNumber,
  orderMatters = false,
}) => (
  <div className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
    {showStep && <span className="font-normal text-xs text-amber-300">Step {stepNumber} :</span>}

    <span className="text-white">{outputQuantity}x</span>
    <ShardChip shard={outputShard} />

    <span> = </span>

    <span className="text-slate-400">{input1Quantity}x</span>
    <ShardChip shard={input1Shard} />

    <span> + </span>

    <span className="text-slate-400">{input2Quantity}x</span>
    {/* Only this one falls back to the shard name when there is no description. */}
    <ShardChip shard={input2Shard} fallbackTitleToName />

    {orderMatters && <OrderMattersBadge input1Shard={input1Shard} input2Shard={input2Shard} />}
  </div>
);

interface TreeShardChipProps {
  shard: Shard;
  /** The node's own output shard is bolder and carries a native title tooltip. */
  emphasis?: boolean;
}

/**
 * Headline variant of the shard chip: names truncate at 8rem so a long recipe still
 * fits on one row. Distinct enough from ui/ShardChip (different spacing, truncation,
 * inline alignment) that sharing one component would mean styling both by prop.
 */
const TreeShardChip: React.FC<TreeShardChipProps> = ({ shard, emphasis = false }) => {
  const shardDesc = SHARD_DESCRIPTIONS[shard.id as keyof typeof SHARD_DESCRIPTIONS];

  return (
    <Tooltip
      content={<ShardDescription record={shardDesc} />}
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
        <img src={shardIconUrl(shard.id)} alt={shard.name} className="w-5 h-5 object-contain inline-block align-middle flex-shrink-0" loading="lazy" />
        {emphasis ? (
          <span className={`font-medium ${getRarityColor(shard.rarity)} text-sm whitespace-nowrap truncate`} style={{ maxWidth: "8rem" }} title={shard.name}>
            {shard.name}
          </span>
        ) : (
          <span className={getRarityColor(shard.rarity) + " whitespace-nowrap truncate"} style={{ maxWidth: "8rem" }}>
            {shard.name}
          </span>
        )}
      </div>
    </Tooltip>
  );
};

interface RecipeSummaryProps {
  outputQuantity: number;
  outputShard: Shard;
  input1Quantity: number;
  input1Shard: Shard;
  input2Quantity: number;
  input2Shard: Shard;
  orderMatters?: boolean;
}

/**
 * The headline row of an expanded recipe node: `<n>x Output = <a>x In1 + <b>x In2`.
 * Wider and truncating, unlike the compact RecipeDisplay used further down the tree.
 */
export const RecipeSummary: React.FC<RecipeSummaryProps> = ({ outputQuantity, outputShard, input1Quantity, input1Shard, input2Quantity, input2Shard, orderMatters = false }) => (
  <div className="text-white flex items-center">
    <span className="font-medium text-sm">{Math.floor(outputQuantity)}x</span>

    <TreeShardChip shard={outputShard} emphasis />

    <span className="text-slate-400 text-sm font-medium flex items-center">
      <span className="mr-2 text-white">=</span>
      <span>{Math.floor(input1Quantity)}x</span>

      <TreeShardChip shard={input1Shard} />

      <span className="mr-2 text-white">+</span>
      <span>{Math.floor(input2Quantity)}x</span>

      <TreeShardChip shard={input2Shard} />
    </span>

    {orderMatters && <OrderMattersBadge input1Shard={input1Shard} input2Shard={input2Shard} />}
  </div>
);

/** How many Pure Reptile procs the node needs, shown beside the fusion count. */
export const CrocodileProcsBadge: React.FC<{ procs: number }> = ({ procs }) => (
  <Tooltip
    content={<>Crocodile has a chance to double the output of reptile recipes. You need <span className="text-green-400">{procs} Pure Reptile </span> triggers to have enough shards for the craft. This is based on average luck</>}
    title="Pure Reptile"
    shardName="Crocodile"
    shardIcon="R45"
    rarity="rare"
    className="cursor-help"
    showRomanNumerals={false}
  >
    <div className="flex items-center gap-1 px-[5px] py-1 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded">
      <span className="text-xs text-green-300 font-extralight">{procs}</span>
      <GiGecko className="w-3 h-3 text-green-400" />
    </div>
  </Tooltip>
);

/** The gear that opens the alternative-recipe picker. Sits on every node kind. */
export const AlternativesButton: React.FC<{ onClick: (event: React.MouseEvent) => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="p-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/20 hover:border-blue-500/30 rounded transition-colors cursor-pointer"
    title="Show alternatives"
  >
    <Settings className="w-4 h-4 text-blue-300 hover:text-blue-200" />
  </button>
);

interface CycleHeaderProps {
  shard: Shard;
  quantity: number;
  runCount: number;
  crocProcs: number | null;
  isExpanded: boolean;
  ironManView: boolean;
  onToggle: () => void;
  onShowAlternatives?: () => void;
}

/** Header row of a cycle node — the toggle, craft count, and Pure Reptile badge. */
export const CycleHeader: React.FC<CycleHeaderProps> = ({ shard, quantity, runCount, crocProcs, isExpanded, ironManView, onToggle, onShowAlternatives }) => (
  <div
    className="flex items-center justify-between w-full pl-3 pr-1 py-1 hover:bg-slate-800/50 transition-colors cursor-pointer"
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
  >
    <div className="flex-1 text-left">
      <div className="flex items-center space-x-2">
        {renderChevron(isExpanded)}
        <div className="flex items-center gap-3">
          <div className="text-xs text-amber-300">{runCount} crafts</div>
          <MoveRight className="w-4 text-amber-400" />
          <div className="flex items-center space-x-2 text-sm">
            <ShardInfo quantity={Math.floor(quantity)} shard={shard} ironManView={ironManView} showRate={false} />
            <span className="px-1 py-0.4 text-xs bg-amber-500/20 text-amber-400 border border-amber-400/40 text-[11px] font-medium rounded-md">Cycle</span>
          </div>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-1">
      <div className="text-right">
        <div className="flex py-1 px-1.5 gap-1 items-center cursor-pointer">
          <span className="text-xs text-slate-400">fusions</span>
          <span className="font-medium text-slate-300 text-xs">{runCount}</span>
        </div>
      </div>
      {crocProcs !== null && <CrocodileProcsBadge procs={crocProcs} />}
      {onShowAlternatives && (
        <AlternativesButton
          onClick={(e) => {
            e.stopPropagation();
            onShowAlternatives();
          }}
        />
      )}
    </div>
  </div>
);
