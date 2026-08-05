import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ShardNode } from "../../utilities/fusionGraphLayout";
import { getRarityColor, shardIconUrl } from "../../utilities";

const rarityBorder: Record<string, string> = {
  common: "border-slate-400/60",
  uncommon: "border-green-400/70",
  rare: "border-blue-400/70",
  epic: "border-purple-400/70",
  legendary: "border-yellow-400/70",
};

const ShardGraphNodeComponent: React.FC<NodeProps<ShardNode>> = ({ data, selected }) => {
  const { shardId, name, rarity, shared, dimmed } = data;

  return (
    <div
      className={`relative flex h-full w-full items-center gap-2 rounded-lg border bg-slate-800/90 px-2.5 py-1.5 shadow-md transition-opacity duration-200 ${
        rarityBorder[rarity] ?? "border-slate-500/60"
      } ${selected ? "ring-2 ring-purple-300" : ""}`}
      style={{ opacity: dimmed ? 0.12 : 1 }}
      title={name}
    >
      <Handle
        id="l"
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="!h-2 !w-2 !border-slate-600 !bg-slate-500"
      />
      <img
        src={shardIconUrl(shardId)}
        alt={name}
        width={28}
        height={28}
        className="h-7 w-7 flex-shrink-0 object-contain"
        draggable={false}
      />
      <div className="min-w-0 flex-1 leading-tight">
        <div className={`truncate text-sm font-semibold ${getRarityColor(rarity)}`}>
          {name}
          {shared && <span className="ml-1 text-amber-300" title="Shared by more than one fusion line">*</span>}
        </div>
        <div className="text-[10px] uppercase tracking-wide text-slate-400">{shardId}</div>
      </div>
      <Handle
        id="r"
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="!h-2 !w-2 !border-slate-600 !bg-slate-500"
      />
    </div>
  );
};

export const ShardGraphNode = React.memo(ShardGraphNodeComponent);
