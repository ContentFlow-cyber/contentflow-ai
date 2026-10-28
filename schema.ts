import { z } from "zod";
import { GOALS, LANGUAGE_CODES, PLATFORMS, TONES } from "./tool-meta";

export const generateSchema = z.object({
  topic: z.string().trim().max(2000).default(""),
  audience: z.string().trim().max(300).default(""),
  platform: z.enum(PLATFORMS).default("all"),
  language: z.enum(LANGUAGE_CODES).default("en"),
  tone: z.enum(TONES).default("professional"),
  goal: z.enum(GOALS).default("engagement"),
  length: z.enum(["short", "medium", "long"]).default("medium"),
  extra: z.string().trim().max(6000).default(""),
  emojis: z.boolean().default(true),
  hashtags: z.boolean().default(true),
  brand_id: z.string().uuid().nullish(),
  days: z.union([z.literal(7), z.literal(30)]).default(7),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  imageSize: z.enum(["square", "portrait", "landscape"]).default("square"),
});
export type GenerateInput = z.infer<typeof generateSchema>;

export const calendarOutputSchema = z.object({
  entries: z
    .array(
      z.object({
        day: z.number().int().min(1).max(31),
        platform: z.string().max(40),
        topic: z.string().max(300),
        format: z.string().max(80).default(""),
        idea: z.string().max(1500).default(""),
      }),
    )
    .min(1)
    .max(60),
});
