import { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Filter, ChevronDown } from "lucide-react";

export type FusionTreeSort = "default" | "shortest" | "alphabetically" | "rarity";

/** "default" is only the closed-button label; the menu lists the real orderings. */
const SORT_LABELS: Record<FusionTreeSort, string> = {
  default: "Sort",
  shortest: "Shortest Time",
  alphabetically: "Alphabetically",
  rarity: "Rarity",
};

const MENU_OPTIONS: FusionTreeSort[] = ["shortest", "alphabetically", "rarity"];

interface FusionTreeSortDropdownProps {
  value: FusionTreeSort;
  onChange: (value: FusionTreeSort) => void;
}

export const FusionTreeSortDropdown = memo(({ value, onChange }: FusionTreeSortDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [button, setButton] = useState<HTMLButtonElement | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!isOpen || !button) return;
    const rect = button.getBoundingClientRect();
    setPosition({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width });
  }, [isOpen, button]);

  // The menu is portalled, so "outside" means outside both the button and the menu.
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".fusion-tree-sort-dropdown") && !target.closest(".dropdown-portal")) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <>
      <div className="relative fusion-tree-sort-dropdown">
        <button
          ref={setButton}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between space-x-2 px-3 py-2.5 min-w-[50px] bg-purple-500/10 border border-purple-500/20 hover:border-purple-400/30 rounded-md hover:bg-purple-500/20 transition-colors duration-200 cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-white" />
            <span className="font-medium text-white">{SORT_LABELS[value]}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-white transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isOpen &&
        createPortal(
          <div
            className="dropdown-portal absolute z-[9999] bg-slate-800/95 backdrop-blur-sm border border-purple-500/20 rounded-md shadow-2xl"
            style={{ top: position.top, left: position.left, width: Math.max(position.width, 140) }}
          >
            {MENU_OPTIONS.map((option, index) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-sm text-left font-medium text-white transition-colors duration-200 cursor-pointer ${
                  value === option ? "bg-purple-500/30" : "hover:bg-purple-500/10 hover:brightness-125"
                } ${index < MENU_OPTIONS.length - 1 ? "border-b border-purple-500/10" : "rounded-b-md"}`}
              >
                {SORT_LABELS[option]}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
});
