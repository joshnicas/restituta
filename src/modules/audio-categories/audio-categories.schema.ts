import { z } from "zod";

export const audioCategoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Audio category name is required."),
});

export type AudioCategoryCreateBody = z.infer<typeof audioCategoryCreateSchema>;

export function parseAudioCategoryCreateBody(input: unknown): AudioCategoryCreateBody {
  const result = audioCategoryCreateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid audio category data.");
  }

  return result.data;
}

export const audioCategoryUpdateSchema = z.object({
  name: z.string().trim().min(1, "Audio category name is required.").optional(),
});

export type AudioCategoryUpdateBody = z.infer<typeof audioCategoryUpdateSchema>;

export function parseAudioCategoryUpdateBody(input: unknown): AudioCategoryUpdateBody {
  const result = audioCategoryUpdateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid audio category update data.");
  }

  return result.data;
}
