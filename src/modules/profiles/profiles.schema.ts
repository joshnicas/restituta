import { z } from "zod";

export const profileUpdateSchema = z.object({
  xp: z.number().int().min(0).optional(),
  coins: z.number().int().min(0).optional(),
  stars: z.number().int().min(0).optional(),
  currentStreak: z.number().int().min(0).optional(),
  longestStreak: z.number().int().min(0).optional(),
});

export type ProfileUpdateBody = z.infer<typeof profileUpdateSchema>;

export function parseProfileUpdateBody(input: unknown): ProfileUpdateBody {
  const result = profileUpdateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid profile data.");
  }

  return result.data;
}
