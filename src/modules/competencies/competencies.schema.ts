import { z } from "zod";

export const competencyCreateSchema = z.object({
  topicId: z.number().int("Topic ID must be an integer.").positive("Topic ID must be positive."),
  name: z.string().trim().min(1, "Competency name is required."),
  code: z.string().trim().min(1, "Competency code is required.").optional(),
  description: z.string().trim().optional(),
  active: z.boolean().optional(),
});

export type CompetencyCreateBody = z.infer<typeof competencyCreateSchema>;

export function parseCompetencyCreateBody(input: unknown): CompetencyCreateBody {
  const result = competencyCreateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid competency data.");
  }

  return result.data;
}

export const competencyUpdateSchema = z.object({
  topicId: z.number().int("Topic ID must be an integer.").positive("Topic ID must be positive.").optional(),
  name: z.string().trim().min(1, "Competency name is required.").optional(),
  code: z.string().trim().min(1, "Competency code is required.").optional(),
  description: z.string().trim().optional().nullable(),
  active: z.boolean().optional(),
});

export type CompetencyUpdateBody = z.infer<typeof competencyUpdateSchema>;

export function parseCompetencyUpdateBody(input: unknown): CompetencyUpdateBody {
  const result = competencyUpdateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid competency update data.");
  }

  return result.data;
}
