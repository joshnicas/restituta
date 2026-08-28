import { z } from "zod";

export const levelCreateSchema = z.object({
  gradeSubjectId: z.number().int("Grade subject ID must be an integer.").positive("Grade subject ID must be positive."),
  levelNumber: z.number().int("Level number must be an integer.").positive("Level number must be positive."),
  name: z.string().trim().min(1, "Level name is required.").optional(),
  description: z.string().trim().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "EXPERT"]).optional(),
  requiredPoints: z.number().int().min(0).optional(),
  timeLimit: z.number().int().positive().optional().nullable(),
  active: z.boolean().optional(),
});

export type LevelCreateBody = z.infer<typeof levelCreateSchema>;

export function parseLevelCreateBody(input: unknown): LevelCreateBody {
  const result = levelCreateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid level data.");
  }

  return result.data;
}

export const levelUpdateSchema = z.object({
  gradeSubjectId: z.number().int("Grade subject ID must be an integer.").positive("Grade subject ID must be positive.").optional(),
  levelNumber: z.number().int("Level number must be an integer.").positive("Level number must be positive.").optional(),
  name: z.string().trim().min(1, "Level name is required.").optional(),
  description: z.string().trim().optional().nullable(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "EXPERT"]).optional(),
  requiredPoints: z.number().int().min(0).optional(),
  timeLimit: z.number().int().positive().optional().nullable(),
  active: z.boolean().optional(),
});

export type LevelUpdateBody = z.infer<typeof levelUpdateSchema>;

export function parseLevelUpdateBody(input: unknown): LevelUpdateBody {
  const result = levelUpdateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid level update data.");
  }

  return result.data;
}
