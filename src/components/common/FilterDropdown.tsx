import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, type LucideIcon } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
  /** Text colour class for this option. */
  color: string;
}

// Full class strings, never interpolated fragments — Tailwind only emits classes it can find literally.
const ACCENTS = {
  purple: {
    button: "bg-purple-500/10 border-purple-500/20 hover:border-purple-400/30 hover:bg-purple-500/20",
    menu: "border-purple-500/20",
    selected: "bg-purple-500/30",
    hover: "hover:bg-purple-500/10",
    divider: "border-b border-purple-500/10",
  },
  emerald: {
    button: "bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-400/30 hover:bg-emerald-500/20",
    menu: "border-emerald-500/20",
    selected: "bg-emerald-500/30",
    hover: "hover:bg-emerald-500/10",
    divider: "border-b border-emerald-500/10",
  },
} as const;

interface FilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  /** The first option is the fallback when `value` matches none. */
  options: readonly FilterOption[];
  icon: LucideIcon;
  accent: keyof typeof ACCENTS;
}

const MIN_WIDTH = 140;

/** Single-select filter button whose menu is portalled to <body> so it escapes overflow clipping. */
export const FilterDropdown = memo(({ value, onChange, options, icon: Icon, accent }: FilterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const styles = ACCENTS[accent];
  const current = options.find((o) => o.value === value) ?? options[0];

  // The menu is `position: fixed`, so viewport coordinates are what it needs.
  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className={`flex items-center justify-between space-x-2 px-3 py-2.5 min-w-[140px] border rounded-md transition-colors duration-200 cursor-pointer ${styles.button}`}
        >
          <div className="flex items-center space-x-2">
            <Icon className={`w-5 h-5 ${current.color}`} />
            <span className={`font-medium ${current.color}`}>{current.label}</span>
          </div>
          <ChevronDown className={`w-4 h-4 ${current.color} transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className={`fixed z-[9999] bg-slate-800/95 backdrop-blur-sm border rounded-md shadow-2xl ${styles.menu}`}
            style={{ top: position.top, left: position.left, width: Math.max(position.width, MIN_WIDTH) }}
          >
            {options.map((option, i) => {
              const isLast = i === options.length - 1;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-sm text-left font-medium transition-colors duration-200 cursor-pointer ${option.color} ${
                    value === option.value ? styles.selected : `${styles.hover} hover:brightness-125`
                  } ${isLast ? "rounded-b-md" : styles.divider} ${i === 0 ? "rounded-t-md" : ""}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
});
