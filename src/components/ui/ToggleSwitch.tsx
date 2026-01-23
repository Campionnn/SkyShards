import React, { useCallback } from "react";

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, checked, onChange, id }) => {
  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onChange(!checked);
    },
    [checked, onChange]
  );

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span onClick={handleToggle} className="text-sm font-medium text-slate-200 flex-1 cursor-pointer">
        {label}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full border border-white/10 transition-colors duration-200 cursor-pointer
          ${checked ? "bg-fuchsia-600" : "bg-white/5"}
          hover:border-fuchsia-400`}
        style={{ boxShadow: "none" }}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full shadow transition-transform duration-200 border border-white/10
          ${checked ? "bg-fuchsia-200" : "bg-slate-300/70"}
          ${checked ? "translate-x-5" : "translate-x-0.5"}`}
          style={{ paddingLeft: "1px" }}
        />
      </button>
    </div>
  );
};
