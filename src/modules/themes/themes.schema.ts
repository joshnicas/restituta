import { z } from "zod";

export const themeCreateSchema = z.object({
  name: z.string().trim().min(1, "Theme name is required."),
  code: z.string().trim().min(1, "Theme code is required."),
  description: z.string().trim().optional(),
  active: z.boolean().optional(),
});

export type ThemeCreateBody = z.infer<typeof themeCreateSchema>;

export function parseThemeCreateBody(input: unknown): ThemeCreateBody {
  const result = themeCreateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid theme data.");
  }

  return result.data;
}

export const themeUpdateSchema = z.object({
  name: z.string().trim().min(1, "Theme name is required.").optional(),
  code: z.string().trim().min(1, "Theme code is required.").optional(),
  description: z.string().trim().optional().nullable(),
  active: z.boolean().optional(),
});

export type ThemeUpdateBody = z.infer<typeof themeUpdateSchema>;

export function parseThemeUpdateBody(input: unknown): ThemeUpdateBody {
  const result = themeUpdateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid theme update data.");
  }

  return result.data;
}
