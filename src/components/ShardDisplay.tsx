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

  const iconSize = size === "sm" ? "w-6 h-6" : "w-8 h-8";

  if (!shard) return null;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-sm text-slate-400 font-medium flex-shrink-0">{actualQuantity}x</span>
      <img src={`${import.meta.env.BASE_URL}shardIcons/${shardId}.png`} alt={shard.name} className={`${iconSize} object-contain flex-shrink-0`} loading="lazy" />
      <span className={`text-sm font-medium truncate ${getRarityColor(shard.rarity)}`} title={shard.name}>
        {shard.name}
      </span>
    </div>
  );
};
