import { Clock, Coins, Hammer, Target, BarChart3, TicketPercent } from "lucide-react";
import { formatLargeNumber, formatNumber, formatTime } from "../../utilities";
import type { CalculationResult, Data } from "../../types/types";
import { SummaryCard } from "../ui";

/** The totals both standard and inventory results carry. */
type ResultTotals = Pick<CalculationResult, "timePerShard" | "totalTime" | "totalShardsProduced" | "craftsNeeded" | "craftTime">;

interface ResultSummaryCardsProps {
  result: ResultTotals;
  data: Data;
  targetShard: string;
  ironManView: boolean;
  /** Multi-shard totals have no meaningful per-shard figure, so that card is dropped. */
  materialsOnly?: boolean;
}

/** Headline figures of a result. `timePerShard`/`totalTime` are coins rather than hours outside ironman. */
export const ResultSummaryCards = ({ result, data, targetShard, ironManView, materialsOnly = false }: ResultSummaryCardsProps) => {
  const targetRate = data.shards[targetShard]?.rate ?? 0;

  return (
    <div className={`grid grid-cols-2 ${materialsOnly ? "lg:grid-cols-3" : ironManView ? "lg:grid-cols-4" : "lg:grid-cols-5"} gap-3`}>
      {ironManView ? (
        <>
          {!materialsOnly && <SummaryCard icon={Clock} iconColor="text-purple-400" label="Time per Shard" value={formatTime(result.timePerShard)} />}
          <SummaryCard icon={Target} iconColor="text-blue-400" label="Total Time" value={formatTime(result.totalTime)} />
        </>
      ) : (
        <>
          {!materialsOnly && <SummaryCard icon={Coins} iconColor="text-yellow-400" label="Cost per Shard" value={formatLargeNumber(result.timePerShard)} />}
          <SummaryCard icon={Target} iconColor="text-blue-400" label="Total Cost" value={formatLargeNumber(result.totalTime)} />
          <SummaryCard
            icon={TicketPercent}
            iconColor="text-purple-400"
            label="Total Coins Saved"
            value={formatLargeNumber(result.totalShardsProduced * targetRate - result.totalTime)}
          />
        </>
      )}
      <SummaryCard icon={BarChart3} iconColor="text-green-400" label="Shards Produced" value={formatNumber(result.totalShardsProduced)} />
      <SummaryCard
        icon={Hammer}
        iconColor="text-orange-400"
        label="Total Fusions"
        value={`${result.craftsNeeded}x`}
        additionalValue={ironManView ? formatTime(result.craftTime) : formatLargeNumber(result.craftTime)}
      />
    </div>
  );
};
