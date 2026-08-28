import { z } from "zod";

export const subjectCreateSchema = z.object({
  name: z.string().trim().min(1, "Subject name is required."),
  code: z.string().trim().min(1, "Subject code is required.").optional(),
  icon: z.string().url("Icon must be a valid URL.").optional(),
  description: z.string().trim().optional(),
  active: z.boolean().optional(),
  // Grades the subject is placed into; one grade_subjects row is created
  // per grade (unique on [gradeId, subjectId]).
  gradeIds: z.array(z.number().int().positive()).optional(),
});

export type SubjectCreateBody = z.infer<typeof subjectCreateSchema>;

export function parseSubjectCreateBody(input: unknown): SubjectCreateBody {
  const result = subjectCreateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid subject data.");
  }

  return result.data;
}

export const subjectUpdateSchema = z.object({
  name: z.string().trim().min(1, "Subject name is required.").optional(),
  code: z.string().trim().min(1, "Subject code is required.").optional(),
  icon: z.string().url("Icon must be a valid URL.").optional().nullable(),
  description: z.string().trim().optional().nullable(),
  active: z.boolean().optional(),
});

export type SubjectUpdateBody = z.infer<typeof subjectUpdateSchema>;

export function parseSubjectUpdateBody(input: unknown): SubjectUpdateBody {
  const result = subjectUpdateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid subject update data.");
  }

  return result.data;
}
