import React, { useEffect, useState, useRef } from "react";
import { ChevronDown } from "lucide-react";
import type { KuudraDropdownProps } from "../../types";
import { KUUDRA_TIERS } from "../../constants";

export const KuudraDropdown: React.FC<KuudraDropdownProps> = React.memo(({ value, onChange, label }) => {
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

  const handleSelect = (tierValue: string) => {
    onChange(tierValue);
    setIsOpen(false);
  };

  const selectedTier = KUUDRA_TIERS.find((tier) => tier.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-medium text-slate-300 mb-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 pr-10 bg-white/5 border border-white/10 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 cursor-pointer hover:border-white/20 hover:bg-white/10 transition-all duration-200 text-left"
        >
          {selectedTier?.label || "Select tier"}
        </button>
        <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-slate-800/95 backdrop-blur-sm border border-white/20 rounded-md shadow-xl max-h-48 overflow-y-auto">
            {KUUDRA_TIERS.map((tier) => (
              <button
                key={tier.value}
                type="button"
                onClick={() => handleSelect(tier.value)}
                className={`w-full px-3 py-2.5 text-left text-sm hover:bg-orange-500/20 hover:text-orange-300 transition-all duration-150 border-b border-white/5 last:border-b-0 ${
                  value === tier.value ? "bg-orange-500/30 text-orange-200" : "text-white"
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
