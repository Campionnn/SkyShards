import React from "react";
import { getRarityColor, shardIconUrl } from "../../utilities";
import { Tooltip } from "./Tooltip";
import { ShardDescription } from "./ShardDescription";
import { SHARD_DESCRIPTIONS } from "../../constants";
import type { Shard } from "../../types/types";

interface ShardChipProps {
  shard: Shard;
  /** Fall back to the shard's name as the tooltip title when it has no description entry. */
  fallbackTitleToName?: boolean;
}

/** Icon + rarity-coloured name, wrapped in the shard description tooltip. */
export const ShardChip: React.FC<ShardChipProps> = ({ shard, fallbackTitleToName = false }) => {
  const shardDesc = SHARD_DESCRIPTIONS[shard.id as keyof typeof SHARD_DESCRIPTIONS];

  return (
    <Tooltip
      content={<ShardDescription record={shardDesc} />}
      title={fallbackTitleToName ? shardDesc?.title || shard.name : shardDesc?.title}
      shardName={shard.name}
      shardIcon={shard.id}
      rarity={shard.rarity}
      family={shard.family}
      type={shard.type}
      shardId={shard.id}
      className="cursor-pointer"
    >
      <div className="flex items-center gap-2">
        <img src={shardIconUrl(shard.id)} alt={shard.name} className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
        <span className={getRarityColor(shard.rarity)}>{shard.name}</span>
      </div>
    </Tooltip>
  );
};
