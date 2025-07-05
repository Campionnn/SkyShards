import React, { useEffect, useMemo, useState, useRef } from "react";
import { ChevronDown } from "lucide-react";
import type { PetLevelDropdownProps } from "../types";

export const PetLevelDropdown: React.FC<PetLevelDropdownProps> = React.memo(({ value, onChange, label }) => {
  const levels = useMemo(() => Array.from({ length: 11 }, (_, i) => i), []); // 0-10
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (level: number) => {
    onChange(level);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-medium text-slate-300 mb-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 pr-10 bg-white/5 border border-white/10 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 cursor-pointer hover:border-white/20 hover:bg-white/10 transition-all duration-200 text-left"
        >
          Level {value}
        </button>
        <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-slate-800/95 backdrop-blur-sm border border-white/20 rounded-md shadow-xl max-h-48 overflow-y-auto">
            {levels.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => handleSelect(level)}
                className={`w-full px-3 py-2.5 text-left text-sm hover:bg-blue-500/20 hover:text-blue-300 transition-all duration-150 border-b border-white/5 last:border-b-0 ${
                  value === level ? "bg-blue-500/30 text-blue-200" : "text-white"
                }`}
              >
                Level {level}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
