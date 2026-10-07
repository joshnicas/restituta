import { z } from "zod";

const giftTranslationsSchema = z.object({
  EN: z.object({ name: z.string().trim().min(1), description: z.string().trim().min(1) }).optional(),
  SW: z.object({ name: z.string().trim().min(1), description: z.string().trim().min(1) }).optional(),
}).optional();

const giftFields = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  translations: giftTranslationsSchema,
  imageUrl: z.string().trim().min(1),
  type: z.string().trim().min(1),
  pointsAwarded: z.number().int().min(0).default(0),
  starsAwarded: z.number().int().min(0).default(0),
});

export type GiftCreateBody = z.infer<typeof giftFields>;
export type GiftUpdateBody = Partial<GiftCreateBody>;

export function parseGiftCreateBody(input: unknown): GiftCreateBody {
  const parsed = giftFields.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid gift data.");
  return parsed.data;
}

export function parseGiftUpdateBody(input: unknown): GiftUpdateBody {
  const parsed = giftFields.partial().safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid gift update data.");
  if (!Object.keys(parsed.data).length) throw new Error("At least one gift field is required.");
  return parsed.data;
}

export function parseGiftAwardBody(input: unknown): { giftId: string } {
  const parsed = z.object({ giftId: z.string().trim().min(1) }).safeParse(input);
  if (!parsed.success) throw new Error("A valid giftId is required.");
  return parsed.data;
}

export function parseGiftPagination(query: Record<string, unknown>) {
  const parsed = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }).safeParse(query);
  if (!parsed.success) throw new Error("page must be positive and limit must be between 1 and 100.");
  return parsed.data;
}
