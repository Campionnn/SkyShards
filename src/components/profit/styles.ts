/* Class strings shared by the Profits page parts. Full literals, so Tailwind finds them. */

export const segmentClass = (active: boolean) =>
  `px-3 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 border cursor-pointer ${
    active
      ? "bg-emerald-500/30 text-emerald-200 border-emerald-400/50"
      : "bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 border-slate-600/50 hover:border-slate-500/50"
  }`;

/** Green when positive, red when negative. */
export const coinClass = (value: number) => (value > 0 ? "text-green-400" : value < 0 ? "text-red-400" : "text-slate-300");

// Every table shares one fixed row height, so rows line up whatever the cells contain.
export const rowClass = "h-10 hover:bg-slate-700/30";
// The line under a row sits on its cells, not on the row: with collapsed table borders, Chrome and
// Edge drop some row lines at display scaling or zoom other than 100 % (see the separate borders in DataTable).
export const rowLine = "border-b border-slate-700/50";
export const cellClass = (align: "left" | "right" = "right") =>
  `px-2 py-1.5 align-middle whitespace-nowrap ${rowLine} ${align === "right" ? "text-right" : "text-left"}`;

/**
 * One part of a column with several cells ("A + B"). The width hugs the content, so a wide
 * table gives its extra room to other columns and the parts stay close together.
 */
export const partCellClass = (first: boolean) => `w-px py-1.5 align-middle whitespace-nowrap text-left ${rowLine} ${first ? "pl-2 pr-1" : "pl-1 pr-2"}`;

export const pagingButton = "px-3 py-1.5 rounded-md border cursor-pointer transition-colors duration-200";
