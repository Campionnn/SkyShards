import React, { useState } from "react";
import { getRarityColor, getRarityBorderColor } from "../utils";

const rarityBg: Record<string, string> = {
  common: "bg-gray-700/80 border-gray-500/80",
  uncommon: "bg-green-400/10 border-green-400/20",
  rare: "bg-blue-400/10 border-blue-400/20",
  epic: "bg-purple-500/10 border-purple-500/20",
  legendary: "bg-yellow-400/10 border-yellow-400/20",
};

interface ShardPopupProps {
  open: boolean;
  onClose: () => void;
  title: string;
  name: string;
  description: string;
  rarity: string;
  icon: string;
  rate?: number;
  onRateChange?: (newRate: number | undefined) => void;
  isDirect?: boolean;
  family?: string;
  type?: string;
}

export const ShardPopup: React.FC<ShardPopupProps> = ({ open, onClose, title, name, description, rarity, icon, rate, onRateChange, isDirect, family, type }) => {
  const [inputValue, setInputValue] = useState<string>("");

  React.useEffect(() => {
    // When popup opens, set inputValue to empty string (show placeholder)
    if (open) setInputValue("");
  }, [open]);

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (onRateChange) {
      const val = parseFloat(e.target.value);
      if (e.target.value === "") onRateChange(undefined); // Unset custom rate, revert to default
      else if (!isNaN(val)) onRateChange(val);
    }
  };

  if (!open) return null;

  // Close popup when clicking outside the modal content
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65" onClick={handleOverlayClick}>
      <div className={`bg-slate-900 border ${getRarityBorderColor(rarity)} rounded-xl shadow-2xl px-10 py-8 min-w-[500px]  max-w-[700px] relative animate-fadeIn`} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-0 right-2 text-2xl text-slate-500 cursor-pointer">
          &times;
        </button>
        <div className="flex items-center gap-10">
          <img src={icon} alt={title} className="w-32 h-32 object-contain flex-shrink-0 shadow-lg" />
          <div className="flex flex-col flex-1 min-w-0 justify-center">
            <div className="text-xl font-bold text-white mb-0.5 truncate flex gap-2">
              {name}
              <span className={`space-x-2 px-1.5 py-1 font-medium uppercase tracking-wider text-xs ${getRarityColor(rarity)} ${rarityBg[rarity] || rarityBg.common} border rounded-md self-start`}>
                {rarity}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-sm text-yellow-500 font-medium truncate">{title} I-X</div>
              {family && type && (
                <span className="text-xs text-slate-400">
                  {family} • {type}
                </span>
              )}
            </div>

            <p className="text-slate-300 text-base leading-snug break-words max-w-xl my-3" dangerouslySetInnerHTML={{ __html: description }}></p>
            <div className="flex items-center gap-2 mt-2">
              {typeof isDirect === "boolean" &&
                (isDirect ? (
                  <span className="px-1.5 py-1 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-md font-medium mr">Direct</span>
                ) : (
                  <span className="px-1.5 py-1 text-xs bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 rounded-md font-medium">Fuse</span>
                ))}
              <input
                type="number"
                min="0"
                step="0.01"
                value={inputValue}
                onChange={handleInputChange}
                placeholder={typeof rate === "number" ? rate.toString() : ""}
                className="px-1 h-6.5 w-15 py-1 text-sm text-center bg-white/5 border border-white/10 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-colors duration-200"
              />
              <span className="text-sm text-slate-400">rate / hr</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
