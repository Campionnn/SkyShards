import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ShardNodeData } from "../../utilities/fusionGraphData";
import { RARITY_COLORS } from "../../utilities/fusionGraphData";

/**
 * Custom node component for shard visualization
 */
export const ShardNode = memo(({ data, selected }: NodeProps<ShardNodeData>) => {
  const borderColor = RARITY_COLORS[data.rarity] || "#ffffff";
  const isHighlighted = data.isHighlighted;
  const isDimmed = data.isDimmed;

  // Rarity-based text colors
  const textColors: Record<string, string> = {
    Common: "text-white",
    Uncommon: "text-green-400",
    Rare: "text-blue-400",
    Epic: "text-purple-400",
    Legendary: "text-yellow-400",
  };

  const textColor = textColors[data.rarity] || "text-white";

  return (
    <div
      className={`
        relative px-3 py-2 rounded-lg border-2 transition-all duration-200
        ${isDimmed ? "opacity-30" : "opacity-100"}
        ${isHighlighted || selected ? "scale-110 shadow-lg shadow-white/20" : ""}
        ${selected ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900" : ""}
        bg-slate-800 hover:bg-slate-700 cursor-pointer
      `}
      style={{
        borderColor: isHighlighted || selected ? borderColor : `${borderColor}66`,
        minWidth: "90px",
      }}
    >
      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-slate-500 !border-slate-400 !w-2 !h-2"
      />

      {/* Shard content */}
      <div className="flex items-center gap-2">
        {/* Shard icon */}
        <img
          src={`${import.meta.env.BASE_URL}shardIcons/${data.shardId}.png`}
          alt={data.label}
          className="w-6 h-6 object-contain"
          loading="lazy"
        />

        {/* Shard info */}
        <div className="flex flex-col">
          <span className={`text-xs font-medium ${textColor} leading-tight`}>
            {data.label}
          </span>
          <span className="text-[10px] text-slate-400 leading-tight">
            {data.shardId}
          </span>
        </div>
      </div>

      {/* Category indicator */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
        {data.category === "Forest" && (
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Forest" />
        )}
        {data.category === "Water" && (
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Water" />
        )}
        {data.category === "Combat" && (
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" title="Combat" />
        )}
      </div>

      {/* Output handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-slate-500 !border-slate-400 !w-2 !h-2"
      />
    </div>
  );
});

ShardNode.displayName = "ShardNode";
