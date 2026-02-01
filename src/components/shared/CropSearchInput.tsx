import React from "react";
import { Search, X } from "lucide-react";

export interface CropSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Shared search input component used in both Calculator and Designer
 */
export const CropSearchInput: React.FC<CropSearchInputProps> = ({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}) => {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-3 py-1.5 bg-slate-700/50 border border-slate-600/30 rounded-md text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500/50"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
