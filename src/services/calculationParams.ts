import type { CalculationFormData } from "../schemas";
import type { CalculationParams } from "../types/types";
import { DataService } from "./dataService";
import { loadCustomPrices } from "../utilities";

/**
 * Single source of the calculator form -> CalculationParams mapping.
 *
 * Ironman mode prices shards from the user's own custom rates; otherwise costs come
 * from the live Bazaar, overlaid with the user's price overrides for the selected source.
 * Keep this the only place the mapping is written: CalculationParams
 * is structurally typed, so a field missed at one of several call sites would not be a
 * type error.
 */
export const buildCalculationParams = async (
  formData: CalculationFormData,
  customRates: { [shardId: string]: number | undefined },
  customPrices: Map<string, number> = loadCustomPrices(formData.instantBuyPrices)
): Promise<CalculationParams> => {
  const filteredCustomRates = Object.fromEntries(Object.entries(customRates).filter(([, v]) => v !== undefined)) as { [shardId: string]: number };

  return {
    customRates: formData.ironManView
      ? filteredCustomRates
      : {
          ...(await DataService.getInstance().loadShardCosts(formData.instantBuyPrices)),
          ...Object.fromEntries(customPrices),
        },
    hunterFortune: formData.hunterFortune,
    excludeChameleon: formData.excludeChameleon,
    frogBonus: formData.frogBonus,
    newtLevel: formData.newtLevel,
    salamanderLevel: formData.salamanderLevel,
    lizardKingLevel: formData.lizardKingLevel,
    leviathanLevel: formData.leviathanLevel,
    pythonLevel: formData.pythonLevel,
    kingCobraLevel: formData.kingCobraLevel,
    seaSerpentLevel: formData.seaSerpentLevel,
    tiamatLevel: formData.tiamatLevel,
    crocodileLevel: formData.crocodileLevel,
    kuudraTier: formData.kuudraTier,
    moneyPerHour: formData.moneyPerHour,
    customKuudraTime: formData.customKuudraTime,
    kuudraTimeSeconds: formData.kuudraTimeSeconds,
    noWoodenBait: formData.noWoodenBait,
    rateAsCoinValue: !formData.ironManView,
    craftPenalty: formData.craftPenalty,
  };
};
