import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ArrowDownUp } from "lucide-react";

export type SortKey = "price-desc" | "price-asc" | "rarity" | "name" | "completion";

interface SortDropdownProps {
  value: SortKey;
  onChange: (value: SortKey) => void;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "price-desc", label: "Price: High → Low" },
  { value: "price-asc", label: "Price: Low → High" },
  { value: "rarity", label: "Rarity" },
  { value: "name", label: "Name (A → Z)" },
  { value: "completion", label: "Closest to Max" },
];

export const SortDropdown: React.FC<SortDropdownProps> = React.memo(({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const current = useMemo(() => SORT_OPTIONS.find((s) => s.value === value) || SORT_OPTIONS[0], [value]);

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
      if (!target.closest(".sort-dropdown") && !target.closest(".sort-dropdown-portal")) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <>
      <div className="relative sort-dropdown">
        <button
          ref={setButtonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between space-x-2 px-3 py-2.5 min-w-[170px] bg-amber-500/10 border border-amber-500/20 hover:border-amber-400/30 rounded-md hover:bg-amber-500/20 transition-colors duration-200 cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <ArrowDownUp className="w-4 h-4 text-amber-400" />
            <span className="font-medium text-amber-300">{current.label}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-amber-300 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isOpen &&
        createPortal(
          <div
            className="sort-dropdown-portal fixed z-[9999] bg-slate-800/95 backdrop-blur-sm border border-amber-500/20 rounded-md shadow-2xl"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left, width: Math.max(dropdownPosition.width, 170) }}
          >
            {SORT_OPTIONS.map((opt, idx) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-sm text-left font-medium transition-colors duration-200 cursor-pointer ${
                  value === opt.value ? "bg-amber-500/30 text-amber-200" : "text-slate-300 hover:bg-amber-500/10"
                } ${idx !== SORT_OPTIONS.length - 1 ? "border-b border-amber-500/10" : ""} ${idx === 0 ? "rounded-t-md" : ""} ${
                  idx === SORT_OPTIONS.length - 1 ? "rounded-b-md" : ""
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
});
