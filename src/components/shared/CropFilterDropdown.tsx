import React, { useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { getRarityTextColor } from "../../utilities";
import type { CropFilterCategory } from "../../types/greenhouse";

export interface FilterOption {
  value: CropFilterCategory;
  label: string;
}

export interface CropFilterDropdownProps {
  value: CropFilterCategory;
  onChange: (value: CropFilterCategory) => void;
  options: FilterOption[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  getFilterColor?: (value: CropFilterCategory) => string;
  className?: string;
}

/**
 * Default color function for filter options
 * Uses centralized rarity color utilities
 */
export const defaultGetFilterColor = (value: CropFilterCategory): string => {
  // Rarity-based filters use getRarityTextColor
  if (value === "common" || value === "uncommon" || value === "rare" || value === "epic" || value === "legendary") {
    return getRarityTextColor(value);
  }
  // Non-rarity filters use default color
  return "text-slate-300";
};

/**
 * Shared filter dropdown component used in both Calculator and Designer
 */
export const CropFilterDropdown: React.FC<CropFilterDropdownProps> = ({
  value,
  onChange,
  options,
  isOpen,
  onToggle,
  onClose,
  getFilterColor = defaultGetFilterColor,
  className = "",
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);
  
  const currentLabel = options.find(opt => opt.value === value)?.label || "All";
  
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/50 border border-slate-600/30 rounded-md text-sm text-slate-200 hover:bg-slate-700/70 transition-colors"
      >
        <span>{currentLabel}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      
      {isOpen && (
        <ul className="absolute right-0 z-50 mt-1 min-w-[180px] bg-slate-800 border border-slate-600/50 rounded-md shadow-xl max-h-60 overflow-y-auto scrollbar-dark">
          {options.map((option) => (
            <li
              key={option.value}
              onClick={() => {
                onChange(option.value);
                onClose();
              }}
              className={`px-3 py-2 cursor-pointer transition-colors ${
                value === option.value
                  ? "bg-emerald-600/30 text-slate-100"
                  : "hover:bg-slate-700/50"
              }`}
            >
              <span className={getFilterColor(option.value)}>{option.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
