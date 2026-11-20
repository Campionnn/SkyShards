import type { ReactNode } from "react";
import { Pickaxe } from "lucide-react";
import { Tooltip } from "../ui";
import { ShardDescription } from "../ui/ShardDescription";
import { SHARD_DESCRIPTIONS } from "../../constants";
import type { FarmFusionRow, Spread } from "../../services";
import { formatLargeNumber, formatQuantity, getRarityColor, shardIconUrl } from "../../utilities";
import type { Data } from "../../types/types";
import { segmentClass } from "./styles";
import { formatHours } from "./tableState";

/* Small building blocks of the Profits page: settings controls, shard names and number cells. */

export const Segmented = <T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-slate-400">{label}</span>
    {options.map(([option, text]) => (
      <button key={option} type="button" className={segmentClass(value === option)} onClick={() => onChange(option)}>
        {text}
      </button>
    ))}
  </div>
);

export const NumberSetting = ({
  label,
  value,
  onChange,
  step,
  suffix,
  title,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
  suffix?: string;
  title: string;
}) => (
  <label className="flex items-center gap-2 text-xs text-slate-400" title={title}>
    {label}
    <input
      type="number"
      min={0}
      step={step}
      value={value}
      onChange={(e) => onChange(Number.isFinite(e.target.valueAsNumber) ? Math.max(0, e.target.valueAsNumber) : 0)}
      className="w-20 px-2 py-1 bg-slate-700/50 border border-slate-600/50 rounded-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
    />
    {suffix}
  </label>
);

export const SearchBox = ({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full sm:w-56 px-3 py-1.5 text-sm bg-slate-700/50 border border-slate-600/50 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
  />
);

/**
 * Icon and name of a shard. Hovering shows the same description overlay as the calculator;
 * with `onOpen`, clicking the name runs it (open the order book, or go to the Shards page).
 */
export const ShardName = ({
  data,
  shardId,
  amount,
  onOpen,
  openLabel = "Show order book",
}: {
  data: Data;
  shardId: string;
  amount?: number;
  onOpen?: (shardId: string) => void;
  openLabel?: string;
}) => {
  const shard = data.shards[shardId];
  if (!shard) return null;
  const description = SHARD_DESCRIPTIONS[shardId as keyof typeof SHARD_DESCRIPTIONS];
  const name = <span className={`text-sm font-medium ${getRarityColor(shard.rarity)}`}>{shard.name}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {amount !== undefined && <span className="text-xs text-slate-400">{formatQuantity(amount)}×</span>}
      <Tooltip
        openOn="hover"
        content={<ShardDescription record={description} />}
        title={description?.title}
        shardName={shard.name}
        shardIcon={shardId}
        rarity={shard.rarity}
        family={shard.family}
        type={shard.type}
        shardId={shardId}
        className="inline-flex items-center gap-1.5"
      >
        <img src={shardIconUrl(shardId)} alt="" className="w-4 h-4 object-contain" loading="lazy" />
        {onOpen ? (
          <button type="button" onClick={() => onOpen(shardId)} className="cursor-pointer hover:underline" aria-label={`${openLabel}: ${shard.name}`}>
            {name}
          </button>
        ) : (
          name
        )}
      </Tooltip>
    </span>
  );
};

/** The two inputs of a "Fuse your farm" fusion, with the farmed one marked. */
export const FarmedInputs = ({
  data,
  row,
  openBook,
}: {
  data: Data;
  row: Pick<FarmFusionRow, "inputs" | "inputAmounts" | "farmedId">;
  openBook: (shardId: string) => void;
}) => (
  <span className="inline-flex items-center gap-2">
    {row.inputs.map((shardId, index) => (
      <span key={index} className="inline-flex items-center gap-2">
        {index === 1 && <span className="text-slate-500">+</span>}
        <span className="inline-flex items-center gap-1">
          <ShardName data={data} shardId={shardId} amount={row.inputAmounts[index]} onOpen={openBook} />
          {shardId === row.farmedId && (
            <span title="You farm this one">
              <Pickaxe className="w-3.5 h-3.5 text-emerald-400" />
            </span>
          )}
        </span>
      </span>
    ))}
  </span>
);

/** A price, marked when it comes from the user's override instead of the Bazaar. */
export const Price = ({ value, overridden }: { value: number; overridden: boolean }) => (
  <span className={overridden ? "text-amber-300" : undefined} title={overridden ? "Your price override from the Shards page" : undefined}>
    {formatLargeNumber(value)}
    {overridden && "*"}
  </span>
);

/** A spread in coins or percent, or a dash when one side of the book is empty. */
export const SpreadValue = ({ spread, percent = false }: { spread: Spread | null; percent?: boolean }) =>
  spread ? (
    <span className="text-slate-300">{percent ? `${(spread.percent * 100).toFixed(1)}%` : formatLargeNumber(spread.spread)}</span>
  ) : (
    <span className="text-slate-500">–</span>
  );

/** Fill times longer than an hour are highlighted: the queue holds more than the market trades in an hour. */
export const FillTime = ({ hours }: { hours: number }) => <span className={hours > 1 ? "text-amber-300" : "text-slate-300"}>{formatHours(hours)}</span>;

/** The card around a table: title, filters on the right, a short description, then the table. */
export const Section = ({
  icon,
  title,
  description,
  actions,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) => (
  <section className="bg-slate-800 border border-slate-600 rounded-md p-3 space-y-3 min-w-0">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className="p-1 bg-slate-700 rounded-md">{icon}</div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      {actions}
    </div>
    <p className="text-sm text-slate-400">{description}</p>
    {children}
  </section>
);
