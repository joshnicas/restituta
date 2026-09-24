import { z } from "zod";

export const playerCreateSchema = z.object({
  name: z.string().trim().min(1, "Player name is required."),
  description: z.string().trim().optional().nullable(),
  url1: z.string().trim().url("Must be a valid URL").optional().nullable(),
  url2: z.string().trim().url("Must be a valid URL").optional().nullable(),
});

export type PlayerCreateBody = z.infer<typeof playerCreateSchema>;

export function parsePlayerCreateBody(input: unknown): PlayerCreateBody {
  const result = playerCreateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid player data.");
  }

  return result.data;
}

export const playerUpdateSchema = z.object({
  name: z.string().trim().min(1, "Player name is required.").optional(),
  description: z.string().trim().optional().nullable(),
  url1: z.string().trim().url("Must be a valid URL").optional().nullable(),
  url2: z.string().trim().url("Must be a valid URL").optional().nullable(),
});

export type PlayerUpdateBody = z.infer<typeof playerUpdateSchema>;

export function parsePlayerUpdateBody(input: unknown): PlayerUpdateBody {
  const result = playerUpdateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid player update data.");
  }

  return result.data;
}
