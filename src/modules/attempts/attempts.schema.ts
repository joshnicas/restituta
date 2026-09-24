import { z } from "zod";

export const attemptCreateSchema = z.object({
  questionId: z.number().int("Question ID must be an integer.").positive("Question ID must be positive."),
  isCorrect: z.boolean(),
  pointsEarned: z.number().int().min(0).optional(),
  coinsEarned: z.number().int().min(0).optional(),
  timeTaken: z.number().int().positive().optional(),
  answerData: z.any().optional(),
});

export type AttemptCreateBody = z.infer<typeof attemptCreateSchema>;

export const attemptQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(15),
});

export type AttemptQuery = z.infer<typeof attemptQuerySchema>;

export function parseAttemptQuery(input: unknown): AttemptQuery {
  const result = attemptQuerySchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid attempts query.");
  }

  return result.data;
}

export function parseAttemptCreateBody(input: unknown): AttemptCreateBody {
  const result = attemptCreateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid attempt data.");
  }

  return result.data;
}
