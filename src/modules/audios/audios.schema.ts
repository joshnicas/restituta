import { z } from "zod";

export const audioCreateSchema = z.object({
  audioCategoryId: z.coerce
    .number()
    .int()
    .positive("Audio category ID must be a positive integer."),
  name: z.string().trim().min(1, "Audio name is required."),
  url: z.string().trim().url("Audio URL must be a valid URL.").optional().nullable(),
});

export type AudioCreateBody = z.infer<typeof audioCreateSchema>;

export function parseAudioCreateBody(input: unknown): AudioCreateBody {
  const result = audioCreateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid audio data.");
  }

  return result.data;
}

export const audioUpdateSchema = z.object({
  audioCategoryId: z.number().int().positive("Audio category ID must be a positive integer.").optional(),
  name: z.string().trim().min(1, "Audio name is required.").optional(),
  url: z.string().trim().url("Audio URL must be a valid URL.").optional().nullable(),
});

export type AudioUpdateBody = z.infer<typeof audioUpdateSchema>;

export function parseAudioUpdateBody(input: unknown): AudioUpdateBody {
  const result = audioUpdateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid audio update data.");
  }

  return result.data;
}
