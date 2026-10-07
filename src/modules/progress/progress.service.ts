import prisma from "../../prisma";
import type { ProgressCreateBody, ProgressUpdateBody } from "./progress.schema";
import { recordReward } from "../rewards/reward-ledger";

export interface PublicProgress {
  id: string;
  gradeId?: number | null;
  gameLevelId: number;
  completed: boolean;
  px: number;
  stars: number;
  bestScore: number;
  attempts: number;
  passAttempts: number;
  pendingXp: number;
  pendingStars: number;
  completedAt?: string | null;
  attemptWindowFailed?: boolean;
}

export const progressService = {
  getByUserId: async (userId: string): Promise<PublicProgress[]> => {
    const progress = await prisma.userLevelProgress.findMany({
      where: { userId: Number(userId) },
      orderBy: { id: "asc" },
      include: { gameLevel: { select: { requiredPoints: true } } },
    });

    return progress.map((p) => {
      return {
        id: p.id.toString(),
        gradeId: p.gradeId,
        gameLevelId: p.gameLevelId,
        completed: p.completed,
        px: p.px,
        stars: p.stars,
        bestScore: p.bestScore,
        attempts: p.attempts,
        passAttempts: p.passAttempts,
        pendingXp: p.pendingXp,
        pendingStars: p.pendingStars,
        completedAt: p.completed ? p.completedAt?.toISOString() ?? null : null,
      };
    });
  },

  create: async (userId: string, data: ProgressCreateBody): Promise<PublicProgress> => {
    const level = await prisma.gameLevel.findUnique({
      where: { id: data.gameLevelId },
      select: { requiredPoints: true },
    });
    if (!level) throw new Error("Game level not found.");
    const progress = await prisma.userLevelProgress.create({
      data: {
        userId: Number(userId),
        gameLevelId: data.gameLevelId,
        gradeId: data.gradeId,
      },
    });

    return {
      id: progress.id.toString(),
      gradeId: progress.gradeId,
      gameLevelId: progress.gameLevelId,
      completed: false,
      px: progress.px,
      stars: progress.stars,
      bestScore: progress.bestScore,
      attempts: progress.attempts,
      passAttempts: progress.passAttempts,
      pendingXp: progress.pendingXp,
      pendingStars: progress.pendingStars,
      completedAt: progress.completedAt?.toISOString() ?? null,
    };
  },

  update: async (userId: string, gameLevelId: number, data: ProgressUpdateBody): Promise<PublicProgress | null> => {
    return prisma.$transaction(async (transaction) => {
      const existing = await transaction.userLevelProgress.findFirst({
        where: { userId: Number(userId), gameLevelId },
        include: { gameLevel: { select: { requiredPoints: true, gradeSubject: { select: { gradeId: true, subjectId: true } } } } },
      });

      if (!existing) return null;

      const roundXp = data.px ?? 0;
      const roundStars = data.stars ?? 0;
      const attempts = existing.attempts + 1;
      const pendingXp = existing.pendingXp + roundXp;
      const pendingStars = Math.max(existing.pendingStars, roundStars);
      const passAttemptNumber = existing.completed ? 1 : existing.passAttempts + 1;
      const passed = existing.completed || existing.bestScore + pendingXp >= existing.gameLevel.requiredPoints;
      const failedWindow = !passed && passAttemptNumber >= 2;
      const bestScore = passed ? existing.bestScore + pendingXp : existing.bestScore;
      const stars = passed ? Math.max(existing.stars, pendingStars) : existing.stars;

      const progress = await transaction.userLevelProgress.update({
        where: { id: existing.id },
        data: {
          gradeId: data.gradeId,
          px: roundXp,
          stars,
          bestScore,
          attempts,
          completed: passed,
          completedAt: passed ? existing.completedAt ?? new Date() : null,
          passAttempts: passed || failedWindow ? 0 : passAttemptNumber,
          pendingXp: passed || failedWindow ? 0 : pendingXp,
          pendingStars: passed || failedWindow ? 0 : pendingStars,
        },
      });

      // Only credit a passed level. This delta includes both attempts on the
      // first pass and only additional score/stars on subsequent replays.
      const creditedXp = passed ? bestScore - existing.bestScore : 0;
      const creditedStars = passed ? stars - existing.stars : 0;
      if (creditedXp > 0 || creditedStars > 0) {
        await transaction.userGameProfile.upsert({
          where: { userId: Number(userId) },
          update: {
            ...(creditedXp > 0 ? { xp: { increment: creditedXp } } : {}),
            ...(creditedStars > 0 ? { stars: { increment: creditedStars } } : {}),
          },
          create: {
            userId: Number(userId),
            xp: creditedXp,
            stars: creditedStars,
          },
        });
        await recordReward(transaction, {
          userId: Number(userId),
          sourceType: "LEVEL_PASS",
          sourceId: `${progress.id}:${attempts}`,
          xpDelta: creditedXp,
          starsDelta: creditedStars,
          gradeId: existing.gradeId ?? existing.gameLevel.gradeSubject.gradeId,
          subjectId: existing.gameLevel.gradeSubject.subjectId,
          earnedAt: progress.completedAt ?? new Date(),
        });
      }

      return {
        id: progress.id.toString(),
        gradeId: progress.gradeId,
        gameLevelId: progress.gameLevelId,
        completed: progress.completed,
        px: progress.px,
        stars: progress.stars,
        bestScore: progress.bestScore,
        attempts: progress.attempts,
        passAttempts: progress.passAttempts,
        pendingXp: progress.pendingXp,
        pendingStars: progress.pendingStars,
        completedAt: progress.completedAt?.toISOString() ?? null,
        attemptWindowFailed: failedWindow,
      };
    });
  },
};
