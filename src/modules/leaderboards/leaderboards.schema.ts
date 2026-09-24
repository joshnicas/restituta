import { z } from "zod";

export const leaderboardQuerySchema = z.object({
  period: z.enum(["week", "month", "overall"]).default("overall"),
  metric: z.enum(["xp", "longestStreak"]).default("xp"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(15),
});

export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;

export function parseLeaderboardQuery(input: unknown): LeaderboardQuery {
  const result = leaderboardQuerySchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid leaderboard query.");
  }

  return result.data;
}