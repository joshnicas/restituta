import prisma from "../../prisma";
import type { AttemptCreateBody } from "./attempts.schema";

export interface PublicAttempt {
  id: string;
  questionId: number;
  isCorrect: boolean;
  pointsEarned: number;
  coinsEarned: number;
  starsEarned: number;
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
      starsEarned: attempt.starsEarned,
      timeTaken: attempt.timeTaken,
      answerData: attempt.answerData,
      attemptedAt: attempt.attemptedAt.toISOString(),
    };
  },

  getByUserId: async (userId: string, limit = 50): Promise<PublicAttempt[]> => {
    const attempts = await prisma.userQuestionAttempt.findMany({
      where: { userId: Number(userId) },
      orderBy: { attemptedAt: "desc" },
      take: limit,
    });

    return attempts.map((attempt) => ({
      id: attempt.id.toString(),
      questionId: attempt.questionId,
      isCorrect: attempt.isCorrect,
      pointsEarned: attempt.pointsEarned,
      coinsEarned: attempt.coinsEarned,
      starsEarned: attempt.starsEarned,
      timeTaken: attempt.timeTaken,
      answerData: attempt.answerData,
      attemptedAt: attempt.attemptedAt.toISOString(),
    }));
  },
};
