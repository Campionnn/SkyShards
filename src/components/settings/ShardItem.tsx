import React, { useCallback, useState } from "react";
import type { ShardWithDirectInfo } from "../../types";
import { getRarityColor } from "../../utils";

interface ShardItemProps {
  shard: ShardWithDirectInfo;
  rate: number;
  defaultRate: number;
  onRateChange: (shardId: string, newRate: number) => void;
  onCardClick?: () => void;
}

export const ShardItem: React.FC<ShardItemProps> = React.memo(({ shard, rate, defaultRate, onRateChange, onCardClick }) => {
  const [inputValue, setInputValue] = useState<string>("");

  // Determine if the rate is custom (changed from default)
  const isChanged = rate !== defaultRate;

  const handleRateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      if (e.target.value === "") {
        onRateChange(shard.key, 0);
      } else {
        onRateChange(shard.key, parseFloat(e.target.value) || 0);
      }
    },
    [shard.key, onRateChange]
  );

  // When the input loses focus, reset inputValue to "" so placeholder is shown
  const handleBlur = () => {
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
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <img src={`${import.meta.env.BASE_URL}shardIcons/${shard.key}.png`} alt={shard.name} className="w-6 h-6 object-contain" loading="lazy" style={{ flexShrink: 0 }} />
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

        <div className="w-20 ml-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="number"
            min="0"
            step="0.01"
            value={inputValue}
            onChange={handleRateChange}
            onBlur={handleBlur}
            placeholder={typeof rate === "number" ? rate.toString() : "0"}
            className="w-full px-2 py-1.5 text-sm text-center bg-white/5 border border-white/10 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-colors duration-200"
          />
        </div>
      </div>
    </div>
  );
});
