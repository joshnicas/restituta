import { z } from "zod";

const optionalId = z.string().trim().min(1).nullable().optional();

const challengeTranslationsSchema = z.object({
  EN: z.object({ title: z.string().trim().min(1), description: z.string().trim().nullable().optional() }).optional(),
  SW: z.object({ title: z.string().trim().min(1), description: z.string().trim().nullable().optional() }).optional(),
}).optional();

const challengeFieldsSchema = z.object({
  title: z.string().trim().min(1, "Challenge title is required."),
  description: z.string().trim().nullable().optional(),
  translations: challengeTranslationsSchema,
  type: z.enum(["DAILY", "WEEKLY", "SPECIAL", "SPEED", "PERFECT"]),
  gradeId: optionalId,
  subjectId: optionalId,
  topicId: optionalId,
  targetQuestions: z.number().int().positive().optional(),
  timeLimit: z.number().int().positive().nullable().optional(),
  pointsReward: z.number().int().min(0).optional(),
  starsReward: z.number().int().min(0).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const challengeCreateSchema = challengeFieldsSchema.superRefine((data, context) => {
  if (data.endsAt && new Date(data.endsAt) < new Date(data.startsAt)) {
    context.addIssue({ code: "custom", message: "Challenge end time must be after its start time.", path: ["endsAt"] });
  }
});

export type ChallengeCreateBody = z.infer<typeof challengeCreateSchema>;

export function parseChallengeCreateBody(input: unknown): ChallengeCreateBody {
  const result = challengeCreateSchema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Invalid challenge data.");
  return result.data;
}

export const challengeUpdateSchema = challengeFieldsSchema.partial().superRefine((data, context) => {
  if (Object.keys(data).length === 0) {
    context.addIssue({ code: "custom", message: "At least one challenge field is required." });
    return;
  }

  if (data.startsAt && data.endsAt && new Date(data.endsAt) < new Date(data.startsAt)) {
    context.addIssue({ code: "custom", message: "Challenge end time must be after its start time.", path: ["endsAt"] });
  }
});

export type ChallengeUpdateBody = z.infer<typeof challengeUpdateSchema>;

export function parseChallengeUpdateBody(input: unknown): ChallengeUpdateBody {
  const result = challengeUpdateSchema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Invalid challenge update data.");
  return result.data;
}

export const challengeListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(["DAILY", "WEEKLY", "SPECIAL", "SPEED", "PERFECT"]).optional(),
  gradeId: z.string().trim().min(1).optional(),
  subjectId: z.string().trim().min(1).optional(),
  topicId: z.string().trim().min(1).optional(),
  language: z.enum(["EN", "SW"]).default("EN"),
});

export type ChallengeListQuery = z.infer<typeof challengeListQuerySchema>;

export function parseChallengeListQuery(input: unknown): ChallengeListQuery {
  const result = challengeListQuerySchema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Invalid challenge query.");
  return result.data;
}

export const userChallengeProgressSchema = z.object({
  questionsAnswered: z.number().int().min(0).optional(),
  correctAnswers: z.number().int().min(0).optional(),
  selectedGradeSubjectId: z.string().trim().min(1).optional(),
}).refine((data) => Object.keys(data).length > 0, "At least one progress field is required.");

export type UserChallengeProgressBody = z.infer<typeof userChallengeProgressSchema>;

export function parseUserChallengeProgressBody(input: unknown): UserChallengeProgressBody {
  const result = userChallengeProgressSchema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Invalid challenge progress data.");
  return result.data;
}