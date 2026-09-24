import { z } from "zod";

const assetUrlSchema = z.string().trim().min(1, "Asset URL is required.").refine(
  (url) => /^https?:\/\//i.test(url) || /^\/(images|audios)\/[^/]+$/i.test(url),
  "Asset URL must be an absolute URL or a local /images/... or /audios/... URL.",
);

const optionSchema = z.object({
  text: z.string().trim().optional().nullable(),
  image: assetUrlSchema.optional().nullable(),
  audio: assetUrlSchema.optional().nullable(),
  isCorrect: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

const matchPairSchema = z.object({
  leftText: z.string().trim().optional().nullable(),
  leftImage: z.string().url("Left image must be a valid URL.").optional().nullable(),
  rightText: z.string().trim().optional().nullable(),
  rightImage: z.string().url("Right image must be a valid URL.").optional().nullable(),
  order: z.number().int().min(0).optional(),
});

const orderingItemSchema = z.object({
  text: z.string().trim().optional().nullable(),
  image: z.string().url("Ordering image must be a valid URL.").optional().nullable(),
  correctOrder: z.number().int().min(0),
});

const acceptedAnswerSchema = z.object({
  answer: z.string().trim().min(1, "Accepted answer is required."),
  isCaseSensitive: z.boolean().optional(),
});

const mediaSchema = z.object({
  type: z.enum(["IMAGE", "AUDIO"]),
  url: assetUrlSchema,
  altText: z.string().trim().optional().nullable(),
  order: z.number().int().min(0).optional(),
}).superRefine((media, context) => {
  if (media.url.startsWith("/images/") && media.type !== "IMAGE") {
    context.addIssue({ code: "custom", message: "An /images/... URL must have type IMAGE.", path: ["type"] });
  }

  if (media.url.startsWith("/audios/") && media.type !== "AUDIO") {
    context.addIssue({ code: "custom", message: "An /audios/... URL must have type AUDIO.", path: ["type"] });
  }
});

function getReferencedImageIndexes(text: string): number[] {
  const matches = text.matchAll(/image\((\d+)\)/gi);
  const indexes = new Set<number>();

  for (const match of matches) {
    const value = Number(match[1]);

    if (Number.isInteger(value) && value > 0) {
      indexes.add(value);
    }
  }

  return [...indexes].sort((a, b) => a - b);
}

function validateInlineImageReferences(input: unknown): void {
  if (!input || typeof input !== "object") {
    return;
  }

  const payload = input as {
    text?: string;
    media?: Array<{ type?: string; url?: string | null; order?: number }>;
  };

  if (!payload.text) {
    return;
  }

  const referencedIndexes = getReferencedImageIndexes(payload.text);

  if (referencedIndexes.length === 0) {
    return;
  }

  const resolvedImages = new Map<number, string>();
  const images = (payload.media ?? [])
    .filter((item) => item.type === "IMAGE" && item.url)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  images.forEach((item, index) => {
    resolvedImages.set(index + 1, item.url!);
  });

  for (const index of referencedIndexes) {
    if (!resolvedImages.has(index) || !resolvedImages.get(index)) {
      throw new Error("image url is required");
    }
  }
}

export const questionCreateSchema = z.object({
  gameLevelId: z.number().int("Game level ID must be an integer."),
  topicId: z.number().int("Topic ID must be an integer.").optional().nullable(),
  gameTypeId: z.number().int("Game type ID must be an integer."),
  text: z.string().trim().min(1, "Question text is required."),
  explanation: z.string().trim().optional().nullable(),
  points: z.number().int().min(0).optional(),
  timeLimit: z.number().int().positive().optional().nullable(),
  active: z.boolean().optional(),
  options: z.array(optionSchema).optional(),
  trueFalseAnswer: z.boolean().optional(),
  matchingPairs: z.array(matchPairSchema).optional(),
  orderingItems: z.array(orderingItemSchema).optional(),
  acceptedAnswers: z.array(acceptedAnswerSchema).optional(),
  media: z.array(mediaSchema).optional(),
  competencyIds: z.array(z.number().int().positive()).optional(),
  themeIds: z.array(z.number().int().positive()).optional(),
});

export type QuestionCreateBody = z.infer<typeof questionCreateSchema>;

export function parseQuestionCreateBody(input: unknown): QuestionCreateBody {
  const result = questionCreateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid question data.");
  }

  validateInlineImageReferences(result.data);

  return result.data;
}

export const questionUpdateSchema = questionCreateSchema.partial();

export type QuestionUpdateBody = z.infer<typeof questionUpdateSchema>;

export function parseQuestionUpdateBody(input: unknown): QuestionUpdateBody {
  const result = questionUpdateSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid question update data.");
  }

  validateInlineImageReferences(result.data);

  return result.data;
}
