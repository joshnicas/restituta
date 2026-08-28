import { z } from "zod";

export const gameTypeCreateSchema = z.object({
  name: z.string().trim().min(1, "Game type name is required."),
  code: z.string().trim().min(1, "Game type code is required."),
  description: z.string().trim().optional(),
  active: z.boolean().optional(),
});

export type GameTypeCreateBody = z.infer<typeof gameTypeCreateSchema>;

export function parseGameTypeCreateBody(input: unknown): GameTypeCreateBody {
  const result = gameTypeCreateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid game type data.");
  }

  return result.data;
}

export const gameTypeUpdateSchema = z.object({
  name: z.string().trim().min(1, "Game type name is required.").optional(),
  code: z.string().trim().min(1, "Game type code is required.").optional(),
  description: z.string().trim().optional().nullable(),
  active: z.boolean().optional(),
});

export type GameTypeUpdateBody = z.infer<typeof gameTypeUpdateSchema>;

export function parseGameTypeUpdateBody(input: unknown): GameTypeUpdateBody {
  const result = gameTypeUpdateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid game type update data.");
  }

  return result.data;
}
