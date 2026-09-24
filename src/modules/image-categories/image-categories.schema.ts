import { z } from "zod";

export const imageCategoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Image category name is required."),
});

export type ImageCategoryCreateBody = z.infer<typeof imageCategoryCreateSchema>;

export function parseImageCategoryCreateBody(input: unknown): ImageCategoryCreateBody {
  const result = imageCategoryCreateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid image category data.");
  }

  return result.data;
}

export const imageCategoryUpdateSchema = z.object({
  name: z.string().trim().min(1, "Image category name is required.").optional(),
});

export type ImageCategoryUpdateBody = z.infer<typeof imageCategoryUpdateSchema>;

export function parseImageCategoryUpdateBody(input: unknown): ImageCategoryUpdateBody {
  const result = imageCategoryUpdateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid image category update data.");
  }

  return result.data;
}
