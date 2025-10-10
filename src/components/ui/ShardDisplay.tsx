import { getRarityColor, formatShardDescription } from "../../utilities";
import { Tooltip } from "./Tooltip";
import { SHARD_DESCRIPTIONS } from "../../constants";
import type { FusionData } from "../../utilities";

interface ShardDisplayProps {
  shardId: string;
  quantity?: number;
  fusionData: FusionData;
  size?: "sm" | "md";
  tooltipVisible?: boolean;
}

export const ShardDisplay = ({ shardId, quantity, fusionData, size = "md", tooltipVisible }: ShardDisplayProps) => {
  const shard = fusionData.shards[shardId];
  const actualQuantity = quantity ?? shard?.fuse_amount ?? 2;
  const shardDesc = SHARD_DESCRIPTIONS[shardId as keyof typeof SHARD_DESCRIPTIONS];

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  if (!shard) return null;

  return (
    <div className="flex items-center gap-1 lg:gap-2 xl:gap-3 min-w-0">
      <span className="text-xs lg:text-sm xl:text-base text-slate-400 font-medium flex-shrink-0">{actualQuantity}x</span>
      <Tooltip
        content={formatShardDescription(shardDesc?.description || "No description available.")}
        title={shardDesc?.title}
        shardName={shard.name}
        shardIcon={shardId}
        rarity={shardDesc?.rarity?.toLowerCase() || shard.rarity}
        family={shardDesc?.family}
        type={shardDesc?.type}
        shardId={shardId}
        className={tooltipVisible === false ? "" : "cursor-pointer"}
        visible={tooltipVisible}
      >
        <div className="flex items-center gap-1 lg:gap-2 xl:gap-3">
          <img src={`${import.meta.env.BASE_URL}shardIcons/${shardId}.png`} alt={shard.name} className={`${iconSize} object-contain flex-shrink-0`} loading="lazy" />
          <span className={`text-xs lg:text-sm xl:text-base font-medium truncate ${getRarityColor(shard.rarity)}`} title={shard.name}>
            {shard.name}
          </span>
        </div>
      </Tooltip>
    </div>
  );
};
