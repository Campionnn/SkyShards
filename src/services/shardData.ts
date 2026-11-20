import type { CalculationParams, Data, FusionJson, Recipes, Shard, Shards } from "../types/types";
import { BLACK_HOLE_SHARD, NO_FORTUNE_SHARDS, WOODEN_BAIT_SHARDS } from "../constants";
import { calculateMultipliers } from "./fusionMath";

const KRAKEN = "L15";
const SHINYFISH = "L23";
const CHAMELEON = "L4";

/** Rate kept when wooden bait is excluded: Shinyfish keeps 10%, other wooden-bait shards 5%. */
const NO_WOODEN_BAIT_RATE = { shinyfish: 0.1, other: 0.05 };
const FROG_RATE_BONUS = 1.1;

/** Kuudra key cost and run time per tier; the Kraken shard's rate is derived from these. */
const KUUDRA_TIERS: Record<string, { baseTime: number; cost: number; multiplier: number }> = {
  t1: { baseTime: 60, cost: 155000, multiplier: 1 },
  t2: { baseTime: 60, cost: 310000, multiplier: 1 },
  t3: { baseTime: 60, cost: 582000, multiplier: 1 },
  t4: { baseTime: 60, cost: 1164000, multiplier: 1.25 },
  t5: { baseTime: 100, cost: 2328000, multiplier: 1.5 },
};
const KUUDRA_DOWNTIME_SECONDS = 25;

/**
 * Kraken shards per hour from Kuudra runs. Key cost is converted into time at
 * `moneyPerHour`: Infinity ignores it, 0 makes keys effectively unaffordable.
 */
const calculateKuudraRate = (kuudraTier: string, moneyPerHour: number, customTimeSeconds: number | null): number => {
  const tier = KUUDRA_TIERS[kuudraTier];
  if (!tier) return 0;

  const runTime = customTimeSeconds !== null ? customTimeSeconds : tier.baseTime;
  const totalTime = runTime + KUUDRA_DOWNTIME_SECONDS;

  let costTime: number;
  if (moneyPerHour === Infinity) {
    costTime = 0;
  } else if (moneyPerHour === 0) {
    costTime = 1e12;
  } else {
    costTime = (tier.cost / moneyPerHour) * 3600;
  }
  return tier.multiplier * (3600 / (totalTime + costTime));
};

/** Hunting Fortune (plus rarity pets, King Cobra) and rate bonuses (Frog, Python) applied to a base rate. */
const applyFortuneModifiers = (
  rate: number,
  shardId: string,
  shard: Shard,
  params: CalculationParams,
  multipliers: ReturnType<typeof calculateMultipliers>,
): number => {
  const rarityBonuses = {
    common: 2 * params.newtLevel,
    uncommon: 2 * params.salamanderLevel,
    rare: params.lizardKingLevel,
    epic: params.leviathanLevel,
    legendary: 0,
  };
  let effectiveFortune = params.hunterFortune + (rarityBonuses[shard.rarity] || 0);

  if (params.frogBonus) {
    rate *= FROG_RATE_BONUS;
  }

  if (shardId in BLACK_HOLE_SHARD) {
    if (BLACK_HOLE_SHARD[shardId]) {
      rate *= 1 + multipliers.pythonMultiplier;
    }
    effectiveFortune *= 1 + multipliers.kingCobraMultiplier;
  }

  return rate * (1 + effectiveFortune / 100);
};

/** Effective rate of one shard: hourly rate (time mode) or coin price (coin mode, used as-is). */
const effectiveRate = (
  shardId: string,
  shard: Shard,
  defaultRates: Record<string, number>,
  params: CalculationParams,
  multipliers: ReturnType<typeof calculateMultipliers>,
): number => {
  if (params.rateAsCoinValue) {
    return params.customRates[shardId] ?? Infinity;
  }

  let rate = params.customRates[shardId] ?? defaultRates[shardId] ?? 0;

  if (shardId === KRAKEN && rate === 0) {
    const moneyPerHour = params.moneyPerHour ?? Infinity;
    rate = calculateKuudraRate(params.kuudraTier, moneyPerHour, params.customKuudraTime ? params.kuudraTimeSeconds : null);
  }

  if (rate > 0) {
    if (params.noWoodenBait && WOODEN_BAIT_SHARDS.includes(shardId)) {
      rate *= shardId === SHINYFISH ? NO_WOODEN_BAIT_RATE.shinyfish : NO_WOODEN_BAIT_RATE.other;
    }
    if (!NO_FORTUNE_SHARDS.includes(shardId)) {
      rate = applyFortuneModifiers(rate, shardId, shard, params, multipliers);
    }
  }

  if (params.excludeChameleon && shardId === CHAMELEON) {
    rate = 0;
  }

  return rate;
};

/**
 * Turns the raw fusion-data.json into the graph the engine runs on: recipes flattened
 * per output shard (tagged reptile if any input is in a Reptile family), and every
 * shard given its effective rate for these params.
 */
export const buildData = (fusionJson: FusionJson, defaultRates: Record<string, number>, params: CalculationParams): Data => {
  const recipes: Recipes = {};
  for (const outputShard in fusionJson.recipes) {
    recipes[outputShard] = [];
    for (const qtyStr in fusionJson.recipes[outputShard]) {
      const outputQuantity = parseInt(qtyStr);
      for (const inputs of fusionJson.recipes[outputShard][qtyStr]) {
        const isReptile = inputs.some((input) => fusionJson.shards[input].family.includes("Reptile"));
        recipes[outputShard].push({ inputs, outputQuantity, isReptile });
      }
    }
  }

  const multipliers = calculateMultipliers(params);
  const shards: Shards = {};
  for (const shardId in fusionJson.shards) {
    const shard = fusionJson.shards[shardId];
    shards[shardId] = { ...shard, id: shardId, rate: effectiveRate(shardId, shard, defaultRates, params, multipliers) };
  }

  return { recipes, shards };
};
