import { useState } from "react";
import { ArrowDown, ArrowUp, Columns3 } from "lucide-react";
import type { ColumnDef, SortState } from "./types";
import type { TableId } from "./profitSettings";
import { cellClass, pagingButton, rowClass, segmentClass } from "./styles";
import { PAGE_SIZE, columnKey } from "./tableState";

/** A sortable table built from column definitions. `rows` are already filtered and sorted. */
export const DataTable = <R,>({
  columns,
  rows,
  rowKey,
  sort,
  onSort,
  emptyText,
}: {
  columns: ColumnDef<R>[];
  rows: R[];
  rowKey: (row: R) => string;
  sort: SortState;
  onSort: (column: string) => void;
  emptyText: string;
}) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="border-b border-slate-700">
        <tr>
          {columns.map((column) => {
            const align = column.align ?? "right";
            const active = sort.column === column.id;
            const Arrow = sort.direction === "asc" ? ArrowUp : ArrowDown;
            return (
              <th key={column.id} className={`px-2 py-2 font-medium whitespace-nowrap ${align === "right" ? "text-right" : "text-left"}`} title={column.title}>
                {column.sortValue ? (
                  <button
                    type="button"
                    onClick={() => onSort(column.id)}
                    className={`inline-flex items-center gap-1 cursor-pointer hover:text-white ${active ? "text-emerald-300" : "text-slate-400"}`}
                  >
                    {column.label}
                    {active && <Arrow className="w-3 h-3" />}
                  </button>
                ) : (
                  <span className="text-slate-400">{column.label}</span>
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)} className={rowClass}>
            {columns.map((column) => (
              <td key={column.id} className={cellClass(column.align)}>
                {column.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    {rows.length === 0 && <p className="text-center text-slate-500 py-6">{emptyText}</p>}
  </div>
);

/** Fixed height, so the card doesn't shrink when a button appears or disappears. */
export const ShowMoreFooter = ({ shown, total, onShowMore, onShowLess }: { shown: number; total: number; onShowMore: () => void; onShowLess: () => void }) => (
  <div className="h-8 flex items-center justify-between gap-2 text-xs text-slate-400">
    <span>
      Showing {shown} of {total}
    </span>
    <div className="flex items-center gap-2">
      {shown > PAGE_SIZE && (
        <button type="button" onClick={onShowLess} className={`${pagingButton} border-slate-600/50 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300`}>
          Show less
        </button>
      )}
      {shown < total && (
        <button
          type="button"
          onClick={onShowMore}
          className={`${pagingButton} border-emerald-500/30 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300`}
        >
          Show {Math.min(PAGE_SIZE, total - shown)} more
        </button>
      )}
    </div>
  </div>
);

/** Checkboxes for the current tab's columns. */
export const ColumnPicker = <R,>({
  table,
  label,
  columns,
  hidden,
  onChange,
}: {
  table: TableId;
  label: string;
  columns: ColumnDef<R>[];
  hidden: string[];
  onChange: (hidden: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const toggle = (key: string) => onChange(hidden.includes(key) ? hidden.filter((item) => item !== key) : [...hidden, key]);

  return (
    <div className="relative">
      <button type="button" className={segmentClass(open)} onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <span className="inline-flex items-center gap-1.5">
          <Columns3 className="w-3.5 h-3.5" />
          Columns
        </span>
      </button>
      {open && (
        <>
          {/* Clicking anywhere outside the menu closes it. */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-64 p-3 space-y-3 bg-slate-800 border border-slate-600 rounded-md shadow-xl">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-300">{label}</div>
              {columns
                .filter((column) => !column.alwaysVisible)
                .map((column) => {
                  const key = columnKey(table, column.id);
                  return (
                    <label key={key} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer" title={column.title}>
                      <input type="checkbox" checked={!hidden.includes(key)} onChange={() => toggle(key)} className="accent-emerald-500" />
                      {column.label}
                    </label>
                  );
                })}
            </div>
            {hidden.length > 0 && (
              <button type="button" onClick={() => onChange([])} className="text-xs text-emerald-300 hover:underline cursor-pointer">
                Show all columns
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
