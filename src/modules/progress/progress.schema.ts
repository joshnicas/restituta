import { z } from "zod";

export const progressCreateSchema = z.object({
  gameLevelId: z.number().int("Game level ID must be an integer.").positive("Game level ID must be positive."),
  gradeId: z.number().int("Grade ID must be an integer.").positive("Grade ID must be positive.").optional().nullable(),
  completed: z.boolean().optional(),
  score: z.number().int().min(0).optional(),
  stars: z.number().int().min(0).max(3).optional(),
  bestScore: z.number().int().min(0).optional(),
  attempts: z.number().int().min(0).optional(),
  completedAt: z.string().optional().nullable(),
});

export type ProgressCreateBody = z.infer<typeof progressCreateSchema>;

export function parseProgressCreateBody(input: unknown): ProgressCreateBody {
  const result = progressCreateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid progress data.");
  }

  return result.data;
}

export const progressUpdateSchema = z.object({
  gameLevelId: z.number().int("Game level ID must be an integer.").positive("Game level ID must be positive.").optional(),
  gradeId: z.number().int("Grade ID must be an integer.").positive("Grade ID must be positive.").optional().nullable(),
  completed: z.boolean().optional(),
  score: z.number().int().min(0).optional(),
  stars: z.number().int().min(0).max(3).optional(),
  bestScore: z.number().int().min(0).optional(),
  attempts: z.number().int().min(0).optional(),
  completedAt: z.string().optional().nullable(),
});

export type ProgressUpdateBody = z.infer<typeof progressUpdateSchema>;

export function parseProgressUpdateBody(input: unknown): ProgressUpdateBody {
  const result = progressUpdateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid progress update data.");
  }

  return result.data;
}
