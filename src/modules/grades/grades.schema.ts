import { z } from "zod";

export const gradeCreateSchema = z.object({
  curriculumVersionId: z.number().int("Curriculum version ID must be an integer.").positive(),
  name: z.string().trim().min(1, "Grade name is required."),
  code: z.string().trim().min(1, "Grade code is required."),
  level: z.number().int("Level must be an integer.").min(0),
  stage: z.enum(["PRE_PRIMARY", "PRIMARY"]),
  active: z.boolean().optional(),
});

export type GradeCreateBody = z.infer<typeof gradeCreateSchema>;

export function parseGradeCreateBody(input: unknown): GradeCreateBody {
  const result = gradeCreateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid grade data.");
  }

  return result.data;
}

export const gradeUpdateSchema = z.object({
  curriculumVersionId: z.number().int("Curriculum version ID must be an integer.").positive().optional(),
  name: z.string().trim().min(1, "Grade name is required.").optional(),
  code: z.string().trim().min(1, "Grade code is required.").optional(),
  level: z.number().int("Level must be an integer.").min(0).optional(),
  stage: z.enum(["PRE_PRIMARY", "PRIMARY"]).optional(),
  active: z.boolean().optional(),
});

export type GradeUpdateBody = z.infer<typeof gradeUpdateSchema>;

export function parseGradeUpdateBody(input: unknown): GradeUpdateBody {
  const result = gradeUpdateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid grade update data.");
  }

  return result.data;
}
