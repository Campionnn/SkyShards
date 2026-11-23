import { Fragment, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, ChevronUp, Columns3, GripVertical } from "lucide-react";
import type { ColumnDef, SortState } from "./types";
import type { TableId } from "./profitSettings";
import { cellClass, partCellClass, pagingButton, rowClass, rowLine, segmentClass } from "./styles";
import { PAGE_SIZE, columnKey, moveColumn } from "./tableState";

/**
 * A sortable table built from column definitions. `rows` are already filtered and sorted.
 * With `details`, every row gets a toggle that shows `details(row)` in a full-width row below it.
 * With `onMoveColumn`, headers can be dragged onto another header to move that column there.
 */
export const DataTable = <R,>({
  columns,
  rows,
  rowKey,
  sort,
  onSort,
  emptyText,
  details,
  onMoveColumn,
}: {
  columns: ColumnDef<R>[];
  rows: R[];
  rowKey: (row: R) => string;
  sort: SortState;
  onSort: (column: string) => void;
  emptyText: string;
  details?: (row: R) => ReactNode;
  /** Moves column `from` to where column `to` is. */
  onMoveColumn?: (from: string, to: string) => void;
}) => {
  const [openKey, setOpenKey] = useState<string | null>(null);
  // The header being dragged, and the one it is over (highlighted as the drop target).
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const endDrag = () => {
    setDragId(null);
    setOverId(null);
  };
  const dragIndex = dragId ? columns.findIndex((column) => column.id === dragId) : -1;
  const span = columns.reduce((sum, column) => sum + (column.cells?.length ?? 1), 0) + (details ? 1 : 0);
  return (
    <div className="overflow-x-auto">
      {/* Separate borders (no gaps), with the lines on the cells: collapsed borders lose some lines when scaled. */}
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr>
            {details && <th className="w-6 border-b border-slate-700" aria-label="Details" />}
            {columns.map((column, index) => {
              const align = column.align ?? "right";
              const active = sort.column === column.id;
              const Arrow = sort.direction === "asc" ? ArrowUp : ArrowDown;
              const isTarget = overId === column.id && dragId !== null && dragId !== column.id;
              // The marker goes on the side the dragged column will land on.
              const marker = isTarget ? (index > dragIndex ? "shadow-[inset_-2px_0_0_0_rgb(52_211_153)]" : "shadow-[inset_2px_0_0_0_rgb(52_211_153)]") : "";
              return (
                <th
                  key={column.id}
                  colSpan={column.cells?.length}
                  className={`group px-2 py-2 font-medium border-b border-slate-700 whitespace-nowrap ${align === "right" ? "text-right" : "text-left"} ${marker} ${
                    dragId === column.id ? "opacity-40" : ""
                  } ${onMoveColumn ? "cursor-grab active:cursor-grabbing" : ""}`}
                  title={onMoveColumn ? `${column.title ? `${column.title}\n\n` : ""}Drag to move this column.` : column.title}
                  draggable={onMoveColumn !== undefined}
                  onDragStart={(event) => {
                    setDragId(column.id);
                    event.dataTransfer.effectAllowed = "move";
                    // Firefox only starts a drag when some data is set.
                    event.dataTransfer.setData("text/plain", column.id);
                  }}
                  onDragOver={(event) => {
                    if (!dragId) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    if (overId !== column.id) setOverId(column.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dragId && dragId !== column.id) onMoveColumn?.(dragId, column.id);
                    endDrag();
                  }}
                  onDragEnd={endDrag}
                >
                  {onMoveColumn && (
                    <GripVertical className="inline-block w-3 h-3 mr-0.5 -ml-1 align-[-2px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
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
          {rows.map((row) => {
            const key = rowKey(row);
            const open = details !== undefined && openKey === key;
            return (
              <Fragment key={key}>
                <tr className={rowClass}>
                  {details && (
                    <td className={`pl-1 ${rowLine}`}>
                      <button
                        type="button"
                        onClick={() => setOpenKey(open ? null : key)}
                        className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
                        aria-expanded={open}
                        aria-label={open ? "Hide details" : "Show details"}
                      >
                        <ChevronRight className={`w-4 h-4 transition-transform duration-150 ${open ? "rotate-90" : ""}`} />
                      </button>
                    </td>
                  )}
                  {columns.map((column) =>
                    column.cells ? (
                      column.cells.map((cell, part) => (
                        <td key={`${column.id}:${part}`} className={partCellClass(part === 0)}>
                          {cell(row)}
                        </td>
                      ))
                    ) : (
                      <td key={column.id} className={cellClass(column.align)}>
                        {column.render(row)}
                      </td>
                    ),
                  )}
                </tr>
                {open && (
                  <tr className="bg-slate-900/40">
                    <td colSpan={span} className={`p-3 ${rowLine}`}>
                      {details(row)}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="text-center text-slate-500 py-6">{emptyText}</p>}
    </div>
  );
};

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

/** Checkboxes for the current tab's columns, with arrows to change their order. `columns` are in the current order. */
export const ColumnPicker = <R,>({
  table,
  label,
  columns,
  hidden,
  onChange,
  onOrderChange,
  customOrder,
}: {
  table: TableId;
  label: string;
  columns: ColumnDef<R>[];
  hidden: string[];
  onChange: (hidden: string[]) => void;
  /** The new order of all of this tab's column ids; undefined goes back to the default order. */
  onOrderChange: (order: string[] | undefined) => void;
  /** Whether this tab has an order of its own, so "Reset order" is offered. */
  customOrder: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const toggle = (key: string) => onChange(hidden.includes(key) ? hidden.filter((item) => item !== key) : [...hidden, key]);
  const ids = columns.map((column) => column.id);
  const move = (index: number, by: -1 | 1) => onOrderChange(moveColumn(ids, ids[index], ids[index + by]));
  const arrowClass =
    "p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default";

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
          <div className="absolute right-0 z-20 mt-2 w-72 p-3 space-y-3 bg-slate-800 border border-slate-600 rounded-md shadow-xl">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-300">{label}</div>
              <p className="text-[11px] text-slate-500">Tick to show, use the arrows (or drag a column header) to change the order.</p>
              <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-0.5">
                {columns.map((column, index) => {
                  const key = columnKey(table, column.id);
                  return (
                    <div key={key} className="flex items-center justify-between gap-2 rounded px-1 hover:bg-slate-700/40">
                      <label
                        className={`flex items-center gap-2 text-xs text-slate-300 py-0.5 ${column.alwaysVisible ? "" : "cursor-pointer"}`}
                        title={column.title}
                      >
                        <input
                          type="checkbox"
                          checked={column.alwaysVisible || !hidden.includes(key)}
                          disabled={column.alwaysVisible}
                          onChange={() => toggle(key)}
                          className="accent-emerald-500 disabled:opacity-50"
                        />
                        {column.label}
                      </label>
                      <span className="flex items-center">
                        <button
                          type="button"
                          className={arrowClass}
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                          aria-label={`Move ${column.label} left`}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className={arrowClass}
                          disabled={index === columns.length - 1}
                          onClick={() => move(index, 1)}
                          aria-label={`Move ${column.label} right`}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {hidden.length > 0 && (
                <button type="button" onClick={() => onChange([])} className="text-xs text-emerald-300 hover:underline cursor-pointer">
                  Show all columns
                </button>
              )}
              {customOrder && (
                <button type="button" onClick={() => onOrderChange(undefined)} className="text-xs text-emerald-300 hover:underline cursor-pointer">
                  Reset order
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
