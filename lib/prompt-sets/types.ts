import { z } from "zod";

export const AVAILABLE_PROMPT_IDS = [
  "center_face",
  "blink_twice",
  "turn_left",
  "turn_right",
  "smile",
  "hold_still",
] as const;

export type AvailablePromptId = (typeof AVAILABLE_PROMPT_IDS)[number];

export const CustomPromptItemSchema = z.object({
  id: z.enum(AVAILABLE_PROMPT_IDS),
  timeoutMs: z.number().int().min(1000).max(60000),
  maxAttempts: z.number().int().min(1).max(10),
});

export const CreateCustomPromptSetSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  prompts: z.array(CustomPromptItemSchema).min(1).max(20),
});

export const CustomPromptSetSchema = CreateCustomPromptSetSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string(),
});

export type CustomPromptItem = z.infer<typeof CustomPromptItemSchema>;
export type CreateCustomPromptSet = z.infer<typeof CreateCustomPromptSetSchema>;
export type CustomPromptSet = z.infer<typeof CustomPromptSetSchema>;
