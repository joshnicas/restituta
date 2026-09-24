import prisma from "../../prisma";
import type { AttemptCreateBody, AttemptQuery } from "./attempts.schema";

export interface PublicAttempt {
  id: string;
  questionId: number;
  isCorrect: boolean;
  pointsEarned: number;
  coinsEarned: number;
  timeTaken?: number | null;
  answerData?: unknown;
  attemptedAt: string;
}

export const attemptsService = {
  create: async (userId: string, data: AttemptCreateBody): Promise<PublicAttempt> => {
    const attempt = await prisma.userQuestionAttempt.create({
      data: {
        ...data,
        userId: Number(userId),
      },
    });

    return {
      id: attempt.id.toString(),
      questionId: attempt.questionId,
      isCorrect: attempt.isCorrect,
      pointsEarned: attempt.pointsEarned,
      coinsEarned: attempt.coinsEarned,
      timeTaken: attempt.timeTaken,
      answerData: attempt.answerData,
      attemptedAt: attempt.attemptedAt.toISOString(),
    };
  },

  getByUserId: async (userId: string, query: AttemptQuery): Promise<{
    attempts: PublicAttempt[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const where = { userId: Number(userId) };
    const [attempts, total] = await Promise.all([
      prisma.userQuestionAttempt.findMany({
        where,
        orderBy: { attemptedAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.userQuestionAttempt.count({ where }),
    ]);

    return {
      attempts: attempts.map((attempt) => ({
        id: attempt.id.toString(),
        questionId: attempt.questionId,
        isCorrect: attempt.isCorrect,
        pointsEarned: attempt.pointsEarned,
        coinsEarned: attempt.coinsEarned,
        timeTaken: attempt.timeTaken,
        answerData: attempt.answerData,
        attemptedAt: attempt.attemptedAt.toISOString(),
      })),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  },
};
