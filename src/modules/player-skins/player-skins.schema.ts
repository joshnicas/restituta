import { z } from "zod";

export const skinCreateSchema = z.object({
  playerId: z.coerce.number().int().positive().optional().nullable(),
  name: z.string().trim().min(1, "Skin name is required."),
  description: z.string().trim().optional().nullable(),
  url1: z.string().trim().url("Must be a valid URL").optional().nullable(),
  url2: z.string().trim().url("Must be a valid URL").optional().nullable(),
});

export type SkinCreateBody = z.infer<typeof skinCreateSchema>;

export function parseSkinCreateBody(input: unknown): SkinCreateBody {
  const result = skinCreateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid skin data.");
  }

  return result.data;
}

export const skinUpdateSchema = z.object({
  playerId: z.coerce.number().int().positive().optional().nullable(),
  name: z.string().trim().min(1, "Skin name is required.").optional(),
  description: z.string().trim().optional().nullable(),
  url1: z.string().trim().url("Must be a valid URL").optional().nullable(),
  url2: z.string().trim().url("Must be a valid URL").optional().nullable(),
});

export type SkinUpdateBody = z.infer<typeof skinUpdateSchema>;

export function parseSkinUpdateBody(input: unknown): SkinUpdateBody {
  const result = skinUpdateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid skin update data.");
  }

  return result.data;
}
