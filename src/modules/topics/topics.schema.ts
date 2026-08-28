import { z } from "zod";

export const topicCreateSchema = z.object({
  subjectId: z.number().int("Subject ID must be an integer."),
  name: z.string().trim().min(1, "Topic name is required."),
  code: z.string().trim().min(1, "Topic code is required.").optional(),
  description: z.string().trim().optional(),
  active: z.boolean().optional(),
  gradeSubjectIds: z.array(z.number().int().positive()).optional(),
});

export type TopicCreateBody = z.infer<typeof topicCreateSchema>;

export function parseTopicCreateBody(input: unknown): TopicCreateBody {
  const result = topicCreateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid topic data.");
  }

  return result.data;
}

export const topicUpdateSchema = z.object({
  subjectId: z.number().int("Subject ID must be an integer.").optional(),
  name: z.string().trim().min(1, "Topic name is required.").optional(),
  code: z.string().trim().min(1, "Topic code is required.").optional(),
  description: z.string().trim().optional().nullable(),
  active: z.boolean().optional(),
  gradeSubjectIds: z.array(z.number().int().positive()).optional(),
});

export type TopicUpdateBody = z.infer<typeof topicUpdateSchema>;

export function parseTopicUpdateBody(input: unknown): TopicUpdateBody {
  const result = topicUpdateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid topic update data.");
  }

  return result.data;
}
