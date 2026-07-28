import React, { useCallback } from "react";
import { Tooltip } from "./Tooltip";

/**
 * Two variants, matching the two places switches appear in the form:
 *
 * - `md` — a settings row. Full width, label pushed left, and the label itself
 *   toggles.
 * - `sm` — inline among other controls in a header row. The label is static text
 *   with a tooltip between it and the switch, and does not toggle on click.
 *
 * Accent colours are per-switch on purpose: purple = inventory, emerald = save,
 * blue = materials.
 */
type ToggleSize = "sm" | "md";
type ToggleAccent = "fuchsia" | "purple" | "emerald" | "blue";

// Full class strings, never interpolated fragments — Tailwind only emits classes it
// can find literally in the source.
const SIZES = {
  sm: { track: "h-5 w-9", knob: "h-4 w-4", knobOn: "translate-x-4", row: "flex items-center gap-2" },
  md: { track: "h-6 w-11", knob: "h-5 w-5", knobOn: "translate-x-5", row: "flex items-center justify-between gap-3 py-1" },
} as const;

const ACCENTS = {
  fuchsia: { track: "bg-fuchsia-600", hover: "hover:border-fuchsia-400", knob: "bg-fuchsia-200" },
  purple: { track: "bg-purple-600", hover: "hover:border-purple-400", knob: "bg-purple-400" },
  emerald: { track: "bg-emerald-600", hover: "hover:border-emerald-400", knob: "bg-emerald-400" },
  blue: { track: "bg-blue-600", hover: "hover:border-blue-400", knob: "bg-blue-400" },
} as const;

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  size?: ToggleSize;
  accent?: ToggleAccent;
  /** Help bubble rendered between the label and the switch. */
  tooltip?: React.ReactNode;
  /** Overrides the label's colour. */
  labelClassName?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, checked, onChange, id, size = "md", accent = "fuchsia", tooltip, labelClassName = "text-slate-200" }) => {
  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onChange(!checked);
    },
    [checked, onChange]
  );

  const sizing = SIZES[size];
  const colors = ACCENTS[accent];
  // Only the full-width variant makes its label a click target.
  const labelToggles = size === "md";

  return (
    <div className={sizing.row}>
      <span onClick={labelToggles ? handleToggle : undefined} className={`text-sm font-medium ${labelClassName}${labelToggles ? " flex-1 cursor-pointer" : ""}`}>
        {label}
      </span>
      {tooltip !== undefined && <Tooltip content={tooltip}></Tooltip>}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={handleToggle}
        className={`relative inline-flex ${sizing.track} items-center rounded-full border border-white/10 transition-colors duration-200 cursor-pointer ${checked ? colors.track : "bg-white/5"} ${colors.hover}`}
        style={{ boxShadow: "none" }}
      >
        <span
          className={`inline-block ${sizing.knob} transform rounded-full shadow transition-transform duration-200 border border-white/10 ${checked ? colors.knob : "bg-slate-300/70"} ${checked ? sizing.knobOn : "translate-x-0.5"}`}
          style={{ paddingLeft: "1px" }}
        />
      </button>
    </div>
  );
};
