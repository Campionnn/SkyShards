import React from "react";
import { formatNumber, getRarityColor, formatShardDescription, formatTime, formatLargeNumber } from "../../utilities";
import { Tooltip } from "./Tooltip";
import { SHARD_DESCRIPTIONS } from "../../constants";
import type { Shard } from "../../types/types";

interface MaterialItemProps {
  shard: Shard;
  quantity: number;
  ironManView: boolean;
}

export const MaterialItem: React.FC<MaterialItemProps> = ({ shard, quantity, ironManView }) => {
  const timeNeeded = quantity / shard.rate;
  const shardDesc = SHARD_DESCRIPTIONS[shard.id as keyof typeof SHARD_DESCRIPTIONS];

  return (
    <div className="bg-slate-700/50 border border-slate-600/60 rounded-md px-3 pt-1 pb-2 flex flex-row items-center justify-between">
      <div className="flex flex-col items-start min-w-0 justify-center h-full">
        <span className="text-slate-300 font-medium text-base flex-shrink-0">{quantity}x</span>
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
          <span className={`mt-0 font-medium text-sm ${getRarityColor(shard.rarity)} flex items-center min-w-0`}>
            <img src={`${import.meta.env.BASE_URL}shardIcons/${shard.id}.png`} alt={shard.name} className="w-5 h-5 object-contain flex-shrink-0 inline-block align-middle mr-2" loading="lazy" />
            <span className="truncate">{shard.name}</span>
          </span>
        </Tooltip>
      </div>
      <div className="flex flex-col items-end ml-2 justify-center h-full">
        {!ironManView && (
          <>
            <div className="text-sm text-slate-400 whitespace-nowrap">{formatLargeNumber(quantity * shard.rate)}</div>
            <div className="text-xs text-slate-400 whitespace-nowrap mt-1">
              {formatLargeNumber(shard.rate)} <span className="text-slate-500">per</span>
            </div>
          </>
        )}
        {ironManView && (
          <>
            <div className="text-sm text-slate-400 whitespace-nowrap">
              {formatNumber(shard.rate)} <span className="text-slate-500"> / </span> <span className="text-slate-500">hr</span>
            </div>
            <div className="text-xs text-slate-400 whitespace-nowrap mt-1">{formatTime(timeNeeded)}</div>
          </>
        )}
      </div>
    </div>
  );
};
