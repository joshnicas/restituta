import { z } from "zod";

export const practiceStartSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("QUICK") }),
  z.object({
    mode: z.literal("SUBJECT"),
    subjectId: z.coerce.number().int().positive(),
    topicId: z.coerce.number().int().positive().optional(),
  }),
  z.object({ mode: z.literal("MISTAKES") }),
]);

export const practiceAnswerSchema = z.object({
  questionId: z.coerce.number().int().positive(),
  selectedOptionId: z.coerce.number().int().positive().optional(),
  answer: z.boolean().optional(),
  answerText: z.string().optional(),
  answerData: z.unknown().optional(),
}).refine(
  (body) => body.selectedOptionId !== undefined || body.answer !== undefined || body.answerText !== undefined || body.answerData !== undefined,
  { message: "Choose an answer to continue." },
);

export class PracticeRequestError extends Error {}

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new PracticeRequestError(result.error.issues[0]?.message ?? "Invalid Practice request.");
  return result.data;
}

export const parsePracticeStart = (input: unknown) => parse(practiceStartSchema, input);
export const parsePracticeAnswer = (input: unknown) => parse(practiceAnswerSchema, input);

export type PracticeStartBody = z.infer<typeof practiceStartSchema>;
export type PracticeAnswerBody = z.infer<typeof practiceAnswerSchema>;