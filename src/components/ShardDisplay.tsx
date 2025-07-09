import { getRarityColor } from "../utils";
import type { FusionData } from "../utils/recipeUtils";

interface ShardDisplayProps {
  shardId: string;
  quantity?: number;
  fusionData: FusionData;
  size?: "sm" | "md";
}

export const ShardDisplay = ({ shardId, quantity, fusionData, size = "md" }: ShardDisplayProps) => {
  const shard = fusionData.shards[shardId];
  const actualQuantity = quantity ?? shard?.fuse_amount ?? 2;

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  if (!shard) return null;

  return (
    <div className="flex items-center gap-1 lg:gap-2 xl:gap-3 min-w-0">
      <span className="text-xs lg:text-sm xl:text-base text-slate-400 font-medium flex-shrink-0">{actualQuantity}x</span>
      <img src={`${import.meta.env.BASE_URL}shardIcons/${shardId}.png`} alt={shard.name} className={`${iconSize} object-contain flex-shrink-0`} loading="lazy" />
      <span className={`text-xs lg:text-sm xl:text-base font-medium truncate ${getRarityColor(shard.rarity)}`} title={shard.name}>
        {shard.name}
      </span>
    </div>
  );
};
