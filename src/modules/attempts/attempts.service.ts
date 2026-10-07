import prisma from "../../prisma";
import { recordAttemptWithStreak, type LifeSnapshot, type StreakSnapshot } from "../streaks/streaks.service";
import { recordReward } from "../rewards/reward-ledger";
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
  create: async (userId: string, data: AttemptCreateBody): Promise<{ attempt: PublicAttempt; streak: StreakSnapshot; lives: LifeSnapshot }> => {
    const { result: attempt, streak, lives } = await recordAttemptWithStreak(
      Number(userId),
      async (transaction) => {
        const attempt = await transaction.userQuestionAttempt.create({
          data: {
            ...data,
            pointsEarned: data.pointsEarned ?? 0,
            coinsEarned: data.coinsEarned ?? 0,
            userId: Number(userId),
          },
          include: {
            question: {
              select: {
                gameLevel: { select: { gradeSubject: { select: { gradeId: true, subjectId: true } } } },
              },
            },
          },
        });
        await recordReward(transaction, {
          userId: Number(userId),
          sourceType: "ATTEMPT",
          sourceId: attempt.id.toString(),
          xpDelta: attempt.pointsEarned,
          gradeId: attempt.question.gameLevel.gradeSubject.gradeId,
          subjectId: attempt.question.gameLevel.gradeSubject.subjectId,
          earnedAt: attempt.attemptedAt,
        });
        return attempt;
      },
      data.pointsEarned ?? 0,
      data.isCorrect,
    );

    return {
      attempt: {
        id: attempt.id.toString(),
        questionId: attempt.questionId,
        isCorrect: attempt.isCorrect,
        pointsEarned: attempt.pointsEarned,
        coinsEarned: attempt.coinsEarned,
        timeTaken: attempt.timeTaken,
        answerData: attempt.answerData,
        attemptedAt: attempt.attemptedAt.toISOString(),
      },
      streak,
      lives,
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
