import { z } from "zod";

export const calculationSchema = z.object({
  shard: z.string().min(1, "Please select a shard"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  hunterFortune: z.number().min(0, "Hunter Fortune must be non-negative"),
  excludeChameleon: z.boolean(),
  frogPet: z.boolean(),
  newtLevel: z.number().min(0).max(10),
  salamanderLevel: z.number().min(0).max(10),
  lizardKingLevel: z.number().min(0).max(10),
  leviathanLevel: z.number().min(0).max(10),
  pythonLevel: z.number().min(0).max(10),
  kingCobraLevel: z.number().min(0).max(10),
  seaSerpentLevel: z.number().min(0).max(10),
  tiamatLevel: z.number().min(0).max(10),
  kuudraTier: z.enum(["none", "t1", "t2", "t3", "t4", "t5"]),
  moneyPerHour: z.number().min(0),
  noWoodenBait: z.boolean(),
});

export type CalculationFormData = z.infer<typeof calculationSchema>;

export const rateEditSchema = z.object({
  shardId: z.string(),
  rate: z.number().min(0),
});

export type RateEditData = z.infer<typeof rateEditSchema>;
