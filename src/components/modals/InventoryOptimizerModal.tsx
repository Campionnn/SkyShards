import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Hammer,
  Package,
  Plus,
  RefreshCw,
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
  | { status: "idle" }
  | { status: "running"; progress: number }
  | { status: "done"; outcome: InventoryOptimizerOutcome }
  | { status: "error"; message: string };

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
  /** Opens the calculator on `shardId` for `quantity`. */
  onOpenInCalculator: (shardId: string, quantity: number) => void;
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

  const openInCalculator = (shardId: string, quantity: number) => {
    onOpenInCalculator(shardId, quantity);
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

/** Which rarities to max and in what order, and the minimum saving for steps that need extra shards. */
const SettingsBar = ({ settings, onChange, disabled }: { settings: OptimizerSettings; onChange: (settings: OptimizerSettings) => void; disabled: boolean }) => {
  const { rarityOrder, minSavingsPercent } = settings;
  const skipped = RARITIES.filter((rarity) => !rarityOrder.includes(rarity));

  const move = (index: number, delta: number) => {
    const order = [...rarityOrder];
    [order[index], order[index + delta]] = [order[index + delta], order[index]];
    onChange({ ...settings, rarityOrder: order });
  };
  const remove = (rarity: Rarity) => onChange({ ...settings, rarityOrder: rarityOrder.filter((r) => r !== rarity) });
  const add = (rarity: Rarity) => onChange({ ...settings, rarityOrder: [...rarityOrder, rarity] });

  const iconButton = "p-0.5 rounded hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3 text-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-slate-400 text-xs">Max in this order:</span>
        {rarityOrder.map((rarity, index) => (
          <span key={rarity} className="flex items-center gap-0.5 pl-1 pr-0.5 py-0.5 rounded-md bg-slate-700/60 border border-slate-600">
            <button
              className={iconButton}
              onClick={() => move(index, -1)}
              disabled={disabled || index === 0}
              aria-label={`Move ${RARITY_LABELS[rarity]} earlier`}
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-300" />
            </button>
            <span className={`text-xs font-medium px-1 ${getRarityColor(rarity)}`}>
              {index + 1}. {RARITY_LABELS[rarity]}
            </span>
            <button
              className={iconButton}
              onClick={() => move(index, 1)}
              disabled={disabled || index === rarityOrder.length - 1}
              aria-label={`Move ${RARITY_LABELS[rarity]} later`}
            >
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            </button>
            <button
              className={iconButton}
              onClick={() => remove(rarity)}
              disabled={disabled || rarityOrder.length === 1}
              aria-label={`Skip ${RARITY_LABELS[rarity]}`}
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </span>
        ))}
        {skipped.map((rarity) => (
          <button
            key={rarity}
            onClick={() => add(rarity)}
            disabled={disabled}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-dashed border-slate-600 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-400 cursor-pointer disabled:opacity-50"
            title={`${RARITY_LABELS[rarity]} is skipped; add it back`}
          >
            <Plus className="w-3 h-3" />
            {RARITY_LABELS[rarity]}
          </button>
        ))}
      </div>
      <MinSavingsInput value={minSavingsPercent} disabled={disabled} onCommit={(percent) => onChange({ ...settings, minSavingsPercent: percent })} />
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
      title="For attributes your spare shards can't finish alone: only plan them when the spares save at least this much of the normal cost."
    >
      Min. saving with extra shards
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
  onOpenInCalculator: (shardId: string, quantity: number) => void;
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
  onOpenInCalculator: (shardId: string, quantity: number) => void;
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
              onOpenInCalculator(step.shardId, step.quantity);
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
