import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, TrendingUp } from "lucide-react";
import { tierLabel } from "../../constants";

interface TierDropdownProps {
  value: number;
  onChange: (value: number) => void;
}

const TIERS = Array.from({ length: 10 }, (_, i) => i + 1);

export const TierDropdown: React.FC<TierDropdownProps> = React.memo(({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const updatePosition = useCallback(() => {
    if (isOpen && buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      setDropdownPosition({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width });
    }
  }, [isOpen, buttonRef]);

  useEffect(updatePosition, [updatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".tier-dropdown") && !target.closest(".tier-dropdown-portal")) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const label = useMemo(() => tierLabel(value), [value]);

  return (
    <>
      <div className="relative tier-dropdown">
        <button
          ref={setButtonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between space-x-2 px-3 py-2.5 min-w-[140px] bg-teal-500/10 border border-teal-500/20 hover:border-teal-400/30 rounded-md hover:bg-teal-500/20 transition-colors duration-200 cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-teal-300" />
            <span className="font-medium text-teal-300">{label}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-teal-300 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isOpen &&
        createPortal(
          <div
            className="tier-dropdown-portal fixed z-[9999] bg-slate-800/95 backdrop-blur-sm border border-teal-500/20 rounded-md shadow-2xl max-h-[60vh] overflow-y-auto"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left, width: Math.max(dropdownPosition.width, 140) }}
          >
            {TIERS.map((tier, idx) => (
              <button
                key={tier}
                type="button"
                onClick={() => {
                  onChange(tier);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-sm text-left font-medium transition-colors duration-200 cursor-pointer ${
                  value === tier ? "bg-teal-500/30 text-teal-200" : "text-slate-300 hover:bg-teal-500/10"
                } ${idx !== TIERS.length - 1 ? "border-b border-teal-500/10" : ""} ${idx === 0 ? "rounded-t-md" : ""} ${idx === TIERS.length - 1 ? "rounded-b-md" : ""}`}
              >
                {tierLabel(tier)}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
});
