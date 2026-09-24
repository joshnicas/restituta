import { z } from "zod";

export const imageCreateSchema = z.object({
  imageCategoryId: z.coerce
    .number()
    .int()
    .positive("Image category ID must be a positive integer."),
  name: z.string().trim().min(1, "Image name is required."),
  url: z.string().trim().url("Image URL must be a valid URL.").optional().nullable(),
});

export type ImageCreateBody = z.infer<typeof imageCreateSchema>;

export function parseImageCreateBody(input: unknown): ImageCreateBody {
  const result = imageCreateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid image data.");
  }

  return result.data;
}

export const imageUpdateSchema = z.object({
  imageCategoryId: z.number().int().positive("Image category ID must be a positive integer.").optional(),
  name: z.string().trim().min(1, "Image name is required.").optional(),
  url: z.string().trim().url("Image URL must be a valid URL.").optional().nullable(),
});

export type ImageUpdateBody = z.infer<typeof imageUpdateSchema>;

export function parseImageUpdateBody(input: unknown): ImageUpdateBody {
  const result = imageUpdateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid image update data.");
  }

  return result.data;
}
