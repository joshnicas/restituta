import { z } from "zod";

const songFields = {
  title: z.string().trim().min(1, "Song title is required.").optional(),
  subtitle: z.string().trim().nullable().optional(),
  mediaType: z.enum(["AUDIO", "VIDEO"]).optional(),
  url: z.string().trim().min(1).optional(),
  duration: z.string().trim().nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
  active: z.preprocess((value) => value === "true" ? true : value === "false" ? false : value, z.boolean()).optional(),
};

export const songCreateSchema = z.object({ ...songFields, title: songFields.title.unwrap() });
export const songUpdateSchema = z.object(songFields).refine((value) => Object.keys(value).length > 0, "Provide at least one song field to update.");

export type SongCreateBody = z.infer<typeof songCreateSchema>;
export type SongUpdateBody = z.infer<typeof songUpdateSchema>;

export function parseSongCreateBody(input: unknown): SongCreateBody {
  const result = songCreateSchema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Invalid song data.");
  return result.data;
}

export function parseSongUpdateBody(input: unknown): SongUpdateBody {
  const result = songUpdateSchema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Invalid song data.");
  return result.data;
}
