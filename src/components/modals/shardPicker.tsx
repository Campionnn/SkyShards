import { useRef, useState } from "react";
import { ChevronDown, Filter, RotateCcw, Search } from "lucide-react";
import { useClickOutside } from "../../hooks";
import { RARITY_OPTIONS } from "./shardSearch";

/**
 * Search box + rarity filter shared by the shard-picking modals (browse, multi-select,
 * inventory). Each modal sizes the controls slightly differently, hence the size prop.
 */

// Full class strings: Tailwind only emits classes it finds verbatim.
const SIZES = {
  md: { height: "h-[42px]", minWidth: "min-w-[140px]", menuWidth: "w-48", option: "py-2.5", hover: "hover:bg-purple-500/10 hover:brightness-125" },
  sm: { height: "h-[38px]", minWidth: "min-w-[130px]", menuWidth: "w-44", option: "py-2", hover: "hover:bg-purple-500/10" },
} as const;

const FILTER_BUTTON =
  "flex items-center justify-between gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/20 hover:border-purple-400/30 rounded-md hover:bg-purple-500/20 transition-colors cursor-pointer";

interface RarityFilterProps {
  value: string;
  onChange: (value: string) => void;
  size?: keyof typeof SIZES;
}

export const RarityFilter = ({ value, onChange, size = "md" }: RarityFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setIsOpen(false), isOpen);

  const sizing = SIZES[size];
  const current = RARITY_OPTIONS.find((option) => option.value === value) ?? RARITY_OPTIONS[0];

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className={`${FILTER_BUTTON} ${sizing.height} ${sizing.minWidth}`}>
        <div className="flex items-center gap-2">
          <Filter className={`w-4 h-4 ${current.color}`} />
          <span className={`text-sm font-medium ${current.color}`}>{current.label}</span>
        </div>
        <ChevronDown className={`w-4 h-4 ${current.color} transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className={`absolute right-0 mt-1 ${sizing.menuWidth} bg-slate-800 border border-purple-500/20 rounded-md shadow-xl z-50 overflow-hidden`}>
          {RARITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 ${sizing.option} text-sm text-left font-medium transition-colors cursor-pointer ${
                value === option.value ? "bg-purple-500/30 " + option.color : option.color + " " + sizing.hover
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const ResetFiltersButton = ({ onClick, size = "md" }: { onClick: () => void; size?: keyof typeof SIZES }) => (
  <button
    onClick={onClick}
    title="Reset filters"
    className={`px-3 py-2 ${SIZES[size].height} ${size === "md" ? "text-sm gap-1.5 " : ""}bg-slate-600/50 hover:bg-slate-600 border border-slate-500/50 hover:border-slate-500 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center`}
  >
    <RotateCcw className="w-4 h-4" />
  </button>
);

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className: string;
  autoFocus?: boolean;
}

export const SearchInput = ({ value, onChange, placeholder, className, autoFocus }: SearchInputProps) => (
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={className} autoFocus={autoFocus} />
  </div>
);
