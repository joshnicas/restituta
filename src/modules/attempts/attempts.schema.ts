import { z } from "zod";

export const attemptCreateSchema = z.object({
  questionId: z.number().int("Question ID must be an integer.").positive("Question ID must be positive."),
  isCorrect: z.boolean(),
  pointsEarned: z.number().int().min(0).optional(),
  coinsEarned: z.number().int().min(0).optional(),
  starsEarned: z.number().int().min(0).optional(),
  timeTaken: z.number().int().positive().optional(),
  answerData: z.any().optional(),
});

export type AttemptCreateBody = z.infer<typeof attemptCreateSchema>;

export function parseAttemptCreateBody(input: unknown): AttemptCreateBody {
  const result = attemptCreateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid attempt data.");
  }

  return result.data;
}
