import React, { useCallback, useState } from "react";
import type { ShardWithDirectInfo } from "../../types/types";
import { getRarityColor } from "../../utilities";
import { RotateCcw } from "lucide-react";

interface ShardItemProps {
  shard: ShardWithDirectInfo;
  rate: number;
  defaultRate: number;
  onRateChange: (shardId: string, newRate: number | undefined) => void;
  onCardClick?: () => void;
}

export const ShardItem: React.FC<ShardItemProps> = React.memo(({ shard, rate, defaultRate, onRateChange, onCardClick }) => {
  const [inputValue, setInputValue] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  const isChanged = rate !== defaultRate;

  const handleRateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      if (e.target.value === "") {
      } else {
        onRateChange(shard.key, parseFloat(e.target.value) || 0);
      }
    },
    [shard.key, onRateChange]
  );

  const handleFocus = () => {
    setIsEditing(true);
    setInputValue(rate.toString());
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (inputValue === "") {
      onRateChange(shard.key, defaultRate);
    } else {
      onRateChange(shard.key, parseFloat(inputValue) || 0);
    }
    setInputValue("");
  };

  return (
    <div
      className="bg-white/5 border border-white/10 rounded-md p-3 hover:bg-white/10 transition-colors duration-200"
      onClick={onCardClick}
      tabIndex={onCardClick ? 0 : undefined}
      role={onCardClick ? "button" : undefined}
      style={onCardClick ? { cursor: "pointer" } : {}}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <img src={`${import.meta.env.BASE_URL}shardIcons/${shard.key}.png`} alt={shard.name} className="w-6 h-6 object-contain flex-shrink-0" loading="lazy" />
            <div className={`font-medium text-sm ${getRarityColor(shard.rarity)} truncate`}>{shard.name}</div>
            {shard.isDirect ? (
              <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-md flex-shrink-0">Direct</span>
            ) : (
              <span className="px-1.5 py-0.5 text-xs bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 rounded-md flex-shrink-0">Fuse</span>
            )}
            {isChanged && <span className="px-1.5 py-0.5 text-xs bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 rounded-md flex-shrink-0">Changed</span>}
          </div>
          <div className="text-xs text-slate-400 truncate">
            {shard.type} • {shard.family}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Reset to default"
            className="flex items-center justify-center px-1.5 py-1.5 cursor-pointer text-sm text-center bg-red-500/20 border border-red-500/30 rounded-md text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-red-500/40 focus:border-red-500/40"
            onClick={() => onRateChange(shard.key, defaultRate)}
            tabIndex={0}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <input
            type="number"
            min="0"
            step="0.01"
            value={isEditing ? inputValue : rate !== undefined ? rate : ""}
            onChange={handleRateChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={isEditing ? undefined : rate !== undefined ? rate.toString() : "0"}
            className="w-16 px-2 py-1 text-sm text-center bg-white/5 border border-white/10 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-colors duration-200"
          />
        </div>
      </div>
    </div>
  );
});
