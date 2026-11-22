import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Calculator,
  ChevronDown,
  Check,
  ChevronRight,
  GripVertical,
  Hammer,
  Package,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { Modal, ShardChip, SummaryCard } from "../ui";
import { InventoryRecipeTreeNode, useTreeExpansion } from "../tree";
import { fusedCountToTierLevel } from "../../constants";
import { formatLargeNumber, formatQuantity, formatTime, getRarityColor, shardIconUrl, type OptimizerSettings } from "../../utilities";
import type { AbsorbStep, AttributeOptimization, CompletionStep, Rarity } from "../../services";
import type { Data } from "../../types/types";

const RARITIES: readonly Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];
const RARITY_LABELS: Record<Rarity, string> = { common: "Common", uncommon: "Uncommon", rare: "Rare", epic: "Epic", legendary: "Legendary" };

/** A finished plan, as the calculator page hands it over. */
export interface InventoryOptimizerOutcome {
  plan: AttributeOptimization;
  data: Data;
  ironManView: boolean;
}

export type InventoryOptimizerState =
  { status: "idle" } | { status: "running"; progress: number } | { status: "done"; outcome: InventoryOptimizerOutcome } | { status: "error"; message: string };

interface InventoryOptimizerModalProps {
  open: boolean;
  onClose: () => void;
  /** Owned by the calculator page, so a plan survives closing and reopening the modal. */
  state: InventoryOptimizerState;
  settings: OptimizerSettings;
  /** Saves the settings and plans again with them. */
  onSettingsChange: (settings: OptimizerSettings) => void;
  /** The plan was made for a different inventory or calculator settings. */
  isStale: boolean;
  onRecalculate: () => void;
  /** Opens the calculator on `shardId`, for what is left to max it. */
  onOpenInCalculator: (shardId: string) => void;
}

/**
 * "Optimize Inventory": which attributes the owned shards can max, in what order, and
 * what each still costs. The plan comes from services/attributeOptimizer; this only
 * shows it and edits the settings.
 */
export const InventoryOptimizerModal = ({
  open,
  onClose,
  state,
  settings,
  onSettingsChange,
  isStale,
  onRecalculate,
  onOpenInCalculator,
}: InventoryOptimizerModalProps) => {
  // Kept here, above the part that unmounts when closed, so reopening shows the same steps open.
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const outcome = state.status === "done" ? state.outcome : null;
  const [lastOutcome, setLastOutcome] = useState(outcome);
  if (outcome !== lastOutcome) {
    setLastOutcome(outcome);
    if (outcome) setExpandedSteps(new Set());
  }

  if (!open) return null;

  const toggleStep = (shardId: string) =>
    setExpandedSteps((previous) => {
      const next = new Set(previous);
      if (!next.delete(shardId)) next.add(shardId);
      return next;
    });

  const openInCalculator = (shardId: string) => {
    onOpenInCalculator(shardId);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="inventory-optimizer-title"
      panelClassName="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
    >
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 id="inventory-optimizer-title" className="text-lg font-semibold text-white">
              Optimize Inventory
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer" aria-label="Close">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <SettingsBar settings={settings} onChange={onSettingsChange} disabled={state.status === "running"} />
      </div>

      <div className="p-4 overflow-y-auto flex-1 min-h-0 space-y-5">
        {isStale && state.status === "done" && (
          <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Your inventory or calculator settings changed since this plan was made.
            </span>
            <button
              onClick={onRecalculate}
              className="px-2 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 cursor-pointer flex-shrink-0"
            >
              Recalculate
            </button>
          </div>
        )}
        {(state.status === "running" || state.status === "idle") && <Progress progress={state.status === "running" ? state.progress : 0} />}
        {state.status === "error" && <div className="text-center py-10 text-red-300 text-sm">{state.message}</div>}
        {outcome && <Plan outcome={outcome} expandedSteps={expandedSteps} onToggleStep={toggleStep} onOpenInCalculator={openInCalculator} />}
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex-shrink-0 flex items-center justify-between gap-3 text-sm text-slate-400">
        <span>Uses your current calculator settings and enabled inventory.</span>
        <div className="flex items-center gap-3">
          <button
            onClick={onRecalculate}
            disabled={state.status === "running"}
            className="px-3 py-2 rounded-md bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-4 h-4" />
            Recalculate
          </button>
          <button onClick={onClose} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

const sameOrder = (a: readonly Rarity[], b: readonly Rarity[]) => a.length === b.length && a.every((rarity, index) => rarity === b[index]);

/**
 * Which rarities to max and in what order, and the minimum saving for steps that need extra shards.
 * Reordering only edits a draft: the plan is redone when the player presses Apply, not on every swap.
 */
const SettingsBar = ({ settings, onChange, disabled }: { settings: OptimizerSettings; onChange: (settings: OptimizerSettings) => void; disabled: boolean }) => {
  const { rarityOrder, minSavingsPercent } = settings;

  const [draftOrder, setDraftOrder] = useState<Rarity[]>(rarityOrder);
  // Follow the saved order when it changes from outside (applied, or sanitized on save).
  const [savedOrder, setSavedOrder] = useState(rarityOrder);
  if (!sameOrder(savedOrder, rarityOrder)) {
    setSavedOrder(rarityOrder);
    setDraftOrder(rarityOrder);
  }
  const orderChanged = !sameOrder(draftOrder, rarityOrder);

  return (
    <div className="flex flex-col lg:flex-row lg:items-start gap-3 text-sm">
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <RarityOrderPicker order={draftOrder} disabled={disabled} onChange={setDraftOrder} />
        {orderChanged && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-amber-200/80">Order changed: apply it to plan again.</span>
            <button
              onClick={() => onChange({ ...settings, rarityOrder: draftOrder })}
              disabled={disabled}
              className="px-2 py-1 rounded-md bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-200 flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-3 h-3" />
              Apply order
            </button>
            <button
              onClick={() => setDraftOrder(rarityOrder)}
              disabled={disabled}
              className="px-2 py-1 rounded-md bg-slate-700/60 hover:bg-slate-700 border border-slate-600 text-slate-300 flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        )}
      </div>
      <MinSavingsInput value={minSavingsPercent} disabled={disabled} onCommit={(percent) => onChange({ ...settings, minSavingsPercent: percent })} />
    </div>
  );
};

type DropTarget = { zone: "order"; index: number } | { zone: "ignore" };

interface DragState {
  rarity: Rarity;
  pointerId: number;
  startX: number;
  startY: number;
  /** Where in the chip it was grabbed, so the floating copy stays under the pointer. */
  offsetX: number;
  offsetY: number;
  width: number;
  /** False until the pointer has moved a few pixels, so a plain click never drags. */
  active: boolean;
}

const DRAG_THRESHOLD = 4;

/**
 * The rarities to max, in order, as a row of chips sorted by dragging, with a second row
 * underneath for the rarities to ignore. Changes go to `onChange` as a draft; applying
 * them is up to the caller. Works with mouse, touch and pen (pointer events),
 * and from the keyboard: arrows move a chip, Delete ignores it, Enter brings it back.
 * At least one rarity always stays in the order.
 */
const RarityOrderPicker = ({ order, disabled, onChange }: { order: Rarity[]; disabled: boolean; onChange: (order: Rarity[]) => void }) => {
  const ignored = RARITIES.filter((rarity) => !order.includes(rarity));

  const [drag, setDrag] = useState<DragState | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);

  const orderZoneRef = useRef<HTMLDivElement>(null);
  const ignoreZoneRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<Rarity, HTMLElement>());

  // The window listeners below read these instead of re-subscribing on every render.
  const latest = useRef({ order, onChange, drag, target });
  useEffect(() => {
    latest.current = { order, onChange, drag, target };
  });

  const canIgnore = (rarity: Rarity) => order.length > 1 || !order.includes(rarity);

  const apply = (rarity: Rarity, drop: DropTarget, currentOrder: Rarity[]) => {
    const rest = currentOrder.filter((r) => r !== rarity);
    if (drop.zone === "ignore") {
      if (rest.length === 0 || rest.length === currentOrder.length) return;
      onChangeIfDifferent(currentOrder, rest);
      return;
    }
    const next = [...rest];
    next.splice(Math.max(0, Math.min(drop.index, rest.length)), 0, rarity);
    onChangeIfDifferent(currentOrder, next);
  };
  const onChangeIfDifferent = (before: Rarity[], after: Rarity[]) => {
    if (before.length !== after.length || before.some((rarity, index) => rarity !== after[index])) latest.current.onChange(after);
  };

  const hitTest = (x: number, y: number, rarity: Rarity): DropTarget | null => {
    const inside = (element: HTMLElement | null, pad: number) => {
      if (!element) return false;
      const box = element.getBoundingClientRect();
      return x >= box.left - pad && x <= box.right + pad && y >= box.top - pad && y <= box.bottom + pad;
    };
    const currentOrder = latest.current.order;
    if (inside(ignoreZoneRef.current, 8)) {
      return currentOrder.length > 1 || !currentOrder.includes(rarity) ? { zone: "ignore" } : null;
    }
    if (inside(orderZoneRef.current, 4)) {
      let index = 0;
      for (const other of currentOrder) {
        if (other === rarity) continue;
        const chip = chipRefs.current.get(other);
        if (chip) {
          const box = chip.getBoundingClientRect();
          if (x > box.left + box.width / 2) index++;
        }
      }
      return { zone: "order", index };
    }
    return null;
  };

  const draggedRarity = drag?.rarity ?? null;
  useEffect(() => {
    if (!draggedRarity) return;

    const reset = () => {
      setDrag(null);
      setPointer(null);
      setTarget(null);
    };
    const onMove = (event: PointerEvent) => {
      const current = latest.current.drag;
      if (!current || event.pointerId !== current.pointerId) return;
      if (!current.active) {
        if (Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < DRAG_THRESHOLD) return;
        setDrag({ ...current, active: true });
      }
      event.preventDefault();
      setPointer({ x: event.clientX, y: event.clientY });
      setTarget(hitTest(event.clientX, event.clientY, current.rarity));
    };
    const onUp = (event: PointerEvent) => {
      const { drag: current, target: drop, order: currentOrder } = latest.current;
      if (!current || event.pointerId !== current.pointerId) return;
      if (current.active && drop) apply(current.rarity, drop, currentOrder);
      reset();
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        reset();
      }
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", reset);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", reset);
      window.removeEventListener("keydown", onKey, true);
    };
    // hitTest and apply only read refs, so the drag's rarity is all this depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggedRarity]);

  const startDrag = (rarity: Rarity) => (event: ReactPointerEvent<HTMLElement>) => {
    if (disabled || event.button !== 0) return;
    const box = event.currentTarget.getBoundingClientRect();
    setDrag({
      rarity,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - box.left,
      offsetY: event.clientY - box.top,
      width: box.width,
      active: false,
    });
  };

  const onChipKeyDown = (rarity: Rarity) => (event: KeyboardEvent<HTMLElement>) => {
    if (disabled) return;
    const index = order.indexOf(rarity);
    const inOrder = index !== -1;
    let drop: DropTarget | null = null;
    if (inOrder && event.key === "ArrowLeft" && index > 0) drop = { zone: "order", index: index - 1 };
    else if (inOrder && event.key === "ArrowRight" && index < order.length - 1) drop = { zone: "order", index: index + 1 };
    else if (inOrder && (event.key === "Delete" || event.key === "Backspace") && canIgnore(rarity)) drop = { zone: "ignore" };
    else if (!inOrder && (event.key === "Enter" || event.key === " ")) drop = { zone: "order", index: order.length };
    if (!drop) return;
    event.preventDefault();
    apply(rarity, drop, order);
  };

  const active = drag?.active ? drag : null;
  // The chip the insertion line is drawn on: before the chip now at the drop index, or after the last one.
  const rest = active ? order.filter((rarity) => rarity !== active.rarity) : order;
  const insertBefore = target?.zone === "order" && target.index < rest.length ? rest[target.index] : null;
  const insertAfter = target?.zone === "order" && target.index >= rest.length ? rest[rest.length - 1] : null;
  const ignoreTargeted = target?.zone === "ignore";

  const chip = (rarity: Rarity, label: string, extra: string) => {
    const isDragged = active?.rarity === rarity;
    return (
      <span
        key={rarity}
        ref={(element) => {
          if (element) chipRefs.current.set(rarity, element);
          else chipRefs.current.delete(rarity);
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onPointerDown={startDrag(rarity)}
        onKeyDown={onChipKeyDown(rarity)}
        className={`relative flex items-center gap-0.5 pl-0.5 pr-1.5 py-0.5 rounded-md border text-xs font-medium whitespace-nowrap select-none touch-none focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-400 ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-grab active:cursor-grabbing"
        } ${isDragged ? "opacity-30" : ""} ${extra}`}
      >
        <GripVertical className="w-3 h-3 text-slate-500 flex-shrink-0" />
        <span className={getRarityColor(rarity)}>{label}</span>
        {insertBefore === rarity && <span className="absolute -left-[5px] top-0 bottom-0 w-0.5 rounded bg-purple-400" />}
        {insertAfter === rarity && <span className="absolute -right-[5px] top-0 bottom-0 w-0.5 rounded bg-purple-400" />}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="w-28 flex-shrink-0 text-slate-400 text-xs whitespace-nowrap"
          title="Drag the rarities into the order to max them in. Drop one in the row below to skip it."
        >
          Max in this order:
        </span>
        <div
          ref={orderZoneRef}
          aria-label="Rarity order"
          className={`flex-1 flex items-center gap-1.5 min-h-[30px] px-1.5 py-1 rounded-md border transition-colors overflow-x-auto ${
            target?.zone === "order" ? "border-purple-400/60 bg-purple-500/5" : "border-slate-700"
          }`}
        >
          {order.map((rarity, index) =>
            chip(rarity, `${index + 1}. ${RARITY_LABELS[rarity]}`, "bg-slate-700/60 border-slate-600" + (!disabled ? " hover:border-slate-400" : "")),
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-28 flex-shrink-0 flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap" title="Rarities dropped here are not maxed.">
          <Ban className="w-3 h-3" />
          Ignore:
        </span>
        <div
          ref={ignoreZoneRef}
          aria-label="Ignored rarities"
          className={`flex-1 flex items-center gap-1.5 min-h-[30px] px-1.5 py-1 rounded-md border border-dashed transition-colors overflow-x-auto ${
            ignoreTargeted ? "border-red-400 bg-red-500/10" : "border-slate-600"
          }`}
        >
          {ignored.length === 0 && <span className="text-xs text-slate-600 italic whitespace-nowrap">Drop a rarity here to skip it</span>}
          {ignored.map((rarity) => chip(rarity, RARITY_LABELS[rarity], "bg-slate-800/60 border-slate-700 line-through decoration-slate-500"))}
        </div>
      </div>

      {active &&
        pointer &&
        createPortal(
          <span
            style={{ position: "fixed", left: pointer.x - active.offsetX, top: pointer.y - active.offsetY, width: active.width, zIndex: 9999 }}
            className="pointer-events-none flex items-center gap-0.5 pl-0.5 pr-1.5 py-0.5 rounded-md border border-purple-400 bg-slate-700 text-xs font-medium whitespace-nowrap shadow-lg shadow-black/40"
          >
            <GripVertical className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className={getRarityColor(active.rarity)}>{RARITY_LABELS[active.rarity]}</span>
          </span>,
          document.body,
        )}
    </div>
  );
};

/** Commits on blur or Enter, not per keystroke: every change re-plans. */
const MinSavingsInput = ({ value, disabled, onCommit }: { value: number; disabled: boolean; onCommit: (percent: number) => void }) => {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const percent = Math.min(100, Math.max(0, Math.round(Number(draft))));
    if (!Number.isFinite(percent) || draft.trim() === "") {
      setDraft(String(value));
      return;
    }
    setDraft(String(percent));
    if (percent !== value) onCommit(percent);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") commit();
  };

  return (
    <label
      className="flex items-center gap-2 lg:ml-auto text-xs text-slate-400"
      title="Some attributes can't be maxed from your spare shards alone and need extra shards farmed or bought. Those are only planned when using your spares saves at least this much of the time or coins it would take to farm or buy the whole attribute from scratch."
    >
      Min. time/coin saving vs. farming or buying
      <span className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={100}
          step={5}
          value={draft}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          className="w-14 px-2 py-1 bg-slate-800 border border-slate-600 rounded-md text-white text-xs focus:outline-none focus:border-purple-500 disabled:opacity-50"
        />
        %
      </span>
    </label>
  );
};

const Progress = ({ progress }: { progress: number }) => (
  <div className="py-10 space-y-3 text-center">
    <div className="text-sm text-slate-300">Planning attributes… {Math.round(progress * 100)}%</div>
    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden max-w-sm mx-auto">
      <div className="h-full bg-purple-500 transition-all duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
    </div>
  </div>
);

interface PlanProps {
  outcome: InventoryOptimizerOutcome;
  expandedSteps: Set<string>;
  onToggleStep: (shardId: string) => void;
  onOpenInCalculator: (shardId: string) => void;
}

const Plan = ({ outcome, expandedSteps, onToggleStep, onOpenInCalculator }: PlanProps) => {
  const { plan, data, ironManView } = outcome;
  const formatCost = (cost: number) => (ironManView ? formatTime(cost) : `${formatLargeNumber(cost)} coins`);
  const fromInventory = plan.completions.filter((step) => step.fromInventoryOnly);
  const withMaterials = plan.completions.filter((step) => !step.fromInventoryOnly);
  const leftover = [...plan.remainingInventory.values()].reduce((sum, quantity) => sum + quantity, 0);

  if (plan.absorbs.length === 0 && plan.completions.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        <div>Nothing to do: none of your shards can move an unfinished attribute forward.</div>
        <div className="text-sm mt-1">Import your profile in Manage Inventory so your shards and attribute levels are up to date.</div>
      </div>
    );
  }

  const renderSteps = (steps: CompletionStep[]) =>
    steps.map((step, index) => (
      <CompletionRow
        key={step.shardId}
        index={index + 1}
        step={step}
        data={data}
        ironManView={ironManView}
        expanded={expandedSteps.has(step.shardId)}
        onToggle={() => onToggleStep(step.shardId)}
        formatCost={formatCost}
        onOpenInCalculator={onOpenInCalculator}
      />
    ));

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard icon={Target} iconColor="text-green-400" label="Attributes Maxed" value={String(plan.totals.attributesMaxed)} />
        <SummaryCard icon={Package} iconColor="text-purple-400" label="Shards Used" value={formatQuantity(plan.totals.inventoryUsed)} />
        <SummaryCard icon={Hammer} iconColor="text-orange-400" label="Fusions" value={`${plan.totals.craftsNeeded}x`} />
        <SummaryCard
          icon={Calculator}
          iconColor="text-yellow-400"
          label={ironManView ? "Extra Time" : "Extra Cost"}
          value={formatCost(plan.totals.extraCost)}
        />
      </div>

      {plan.absorbs.length > 0 && (
        <Section title="Fuse into their own attributes" hint="Free: these shards only move their own attribute forward.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {plan.absorbs.map((step) => (
              <AbsorbRow key={step.shardId} step={step} data={data} />
            ))}
          </div>
        </Section>
      )}

      {fromInventory.length > 0 && (
        <Section
          title="Complete from your spare shards"
          hint="Fused entirely from shards you have spare; nothing to farm or buy. Click one for its fusion tree."
        >
          {renderSteps(fromInventory)}
        </Section>
      )}

      {withMaterials.length > 0 && (
        <Section
          title={`Complete with a few ${ironManView ? "farmed" : "bought"} shards`}
          hint="Your spare shards cover a good part; the rest is listed. Click one for its fusion tree."
        >
          {renderSteps(withMaterials)}
        </Section>
      )}

      <p className="text-xs text-slate-500">
        {formatQuantity(leftover)} shard{leftover !== 1 ? "s" : ""} left over afterwards. Each step assumes the ones above it are done; the calculator itself
        always plans against your whole inventory.
      </p>
    </>
  );
};

const Section = ({ title, hint, children }: { title: string; hint: string; children: ReactNode }) => (
  <section className="space-y-2">
    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="text-xs text-slate-400">{hint}</p>
    </div>
    <div className="space-y-2">{children}</div>
  </section>
);

const levelOf = (data: Data, shardId: string, fused: number) => fusedCountToTierLevel(fused, data.shards[shardId].rarity);

const AbsorbRow = ({ step, data }: { step: AbsorbStep; data: Data }) => (
  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-slate-800/50 border border-slate-600/50 text-sm">
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-slate-300 text-xs flex-shrink-0">{step.quantity}x</span>
      <ShardChip shard={data.shards[step.shardId]} fallbackTitleToName />
    </div>
    <LevelChange from={levelOf(data, step.shardId, step.fusedBefore)} to={levelOf(data, step.shardId, step.fusedAfter)} />
  </div>
);

const LevelChange = ({ from, to }: { from: number; to: number }) => (
  <span className="flex items-center gap-1 text-xs flex-shrink-0">
    <span className="text-slate-400">Lv {from}</span>
    <ArrowRight className="w-3 h-3 text-slate-500" />
    <span className={to >= 10 ? "text-green-400 font-semibold" : "text-slate-200"}>{to >= 10 ? "Max" : `Lv ${to}`}</span>
  </span>
);

interface CompletionRowProps {
  index: number;
  step: CompletionStep;
  data: Data;
  ironManView: boolean;
  expanded: boolean;
  onToggle: () => void;
  formatCost: (cost: number) => string;
  onOpenInCalculator: (shardId: string) => void;
}

const CompletionRow = ({ index, step, data, ironManView, expanded, onToggle, formatCost, onOpenInCalculator }: CompletionRowProps) => {
  const saved = step.baselineCost - step.extraCost;

  return (
    <div className="rounded-md bg-slate-800/50 border border-slate-600/50 text-sm">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
          event.preventDefault();
          onToggle();
        }}
        aria-expanded={expanded}
        className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-slate-700/30 rounded-md"
      >
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
          <span className="text-slate-500 text-xs w-5 text-right flex-shrink-0">{index}.</span>
          <span className="text-slate-300 text-xs flex-shrink-0">{step.quantity}x</span>
          <ShardChip shard={data.shards[step.shardId]} fallbackTitleToName />
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="hidden sm:inline text-xs text-slate-400">{step.craftsNeeded} fusions</span>
          <span className="text-xs text-slate-200">{formatCost(step.extraCost)}</span>
          <LevelChange from={levelOf(data, step.shardId, step.fusedBefore)} to={10} />
          <button
            onClick={(event) => {
              event.stopPropagation();
              onOpenInCalculator(step.shardId);
            }}
            className="p-1.5 rounded-md text-purple-300 bg-purple-500/10 hover:bg-purple-500/25 border border-purple-500/20 cursor-pointer"
            title="Open in calculator (this plan is kept)"
            aria-label={`Open ${data.shards[step.shardId].name} in the calculator`}
          >
            <Calculator className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-2 border-t border-slate-700/60 space-y-3">
          {step.materials.size > 0 && <ShardList label={ironManView ? "To farm" : "To buy"} shards={step.materials} data={data} />}
          <div className="text-xs text-slate-400">
            {step.craftsNeeded} fusions ({formatCost(step.craftCost)})
            {!step.fromInventoryOnly && saved > 0 && (
              <>
                {" "}
                • saves {formatCost(saved)} over making it from scratch ({formatCost(step.baselineCost)})
              </>
            )}
          </div>
          <StepTree step={step} data={data} ironManView={ironManView} />
        </div>
      )}
    </div>
  );
};

/** The step's fusion tree, as in the calculator's inventory results, with its own expand state. */
const StepTree = ({ step, data, ironManView }: { step: CompletionStep; data: Data; ironManView: boolean }) => {
  const { expandedStates, toggle, expandAll, collapseAll } = useTreeExpansion(step);
  if (!step.tree) return null;

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-md p-2">
      <div className="flex items-center justify-end gap-2 mb-2">
        <button
          onClick={expandAll}
          className="px-2 py-1 rounded-md text-xs bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/20 cursor-pointer"
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          className="px-2 py-1 rounded-md text-xs bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/20 cursor-pointer"
        >
          Collapse All
        </button>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <InventoryRecipeTreeNode
            tree={step.tree}
            data={data}
            isTopLevel
            totalShardsProduced={step.quantity}
            nodeId={`optimizer-${step.shardId}`}
            expandedStates={expandedStates}
            onToggle={toggle}
            ironManView={ironManView}
            remainingInventory={step.remainingInventory}
          />
        </div>
      </div>
    </div>
  );
};

const ShardList = ({ label, shards, data }: { label: string; shards: Map<string, number>; data: Data }) => (
  <div>
    <div className="text-xs text-slate-500 mb-1">{label}</div>
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {[...shards]
        .sort((a, b) => b[1] - a[1])
        .map(([shardId, quantity]) => {
          const shard = data.shards[shardId];
          return (
            <span key={shardId} className="flex items-center gap-1 text-xs">
              <span className="text-slate-300">{formatQuantity(quantity)}x</span>
              <img src={shardIconUrl(shardId)} alt={shard?.name ?? shardId} className="w-4 h-4 object-contain" loading="lazy" />
              <span className={shard ? getRarityColor(shard.rarity) : "text-slate-300"}>{shard?.name ?? shardId}</span>
            </span>
          );
        })}
    </div>
  </div>
);
