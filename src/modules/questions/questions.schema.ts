import { z } from "zod";

const optionSchema = z.object({
  text: z.string().trim().optional().nullable(),
  image: z.string().url("Option image must be a valid URL.").optional().nullable(),
  audio: z.string().url("Option audio must be a valid URL.").optional().nullable(),
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
  type: z.enum(["IMAGE", "AUDIO", "VIDEO"]),
  url: z.string().url("Media URL must be valid."),
  altText: z.string().trim().optional().nullable(),
  order: z.number().int().min(0).optional(),
});

export const questionCreateSchema = z.object({
  gameLevelId: z.number().int("Game level ID must be an integer."),
  gameTypeId: z.number().int("Game type ID must be an integer."),
  text: z.string().trim().min(1, "Question text is required."),
  image: z.string().url("Image must be a valid URL.").optional().nullable(),
  audio: z.string().url("Audio must be a valid URL.").optional().nullable(),
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

  return result.data;
}
