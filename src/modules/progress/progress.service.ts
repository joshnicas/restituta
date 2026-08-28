import prisma from "../../prisma";
import type { ProgressCreateBody, ProgressUpdateBody } from "./progress.schema";

export interface PublicProgress {
  id: string;
  gradeId?: number | null;
  gameLevelId: number;
  completed: boolean;
  score: number;
  stars: number;
  bestScore: number;
  attempts: number;
  completedAt?: string | null;
}

export const progressService = {
  getByUserId: async (userId: string): Promise<PublicProgress[]> => {
    const progress = await prisma.userLevelProgress.findMany({
      where: { userId: Number(userId) },
      orderBy: { id: "asc" },
    });

    return progress.map((p) => ({
      id: p.id.toString(),
      gradeId: p.gradeId,
      gameLevelId: p.gameLevelId,
      completed: p.completed,
      score: p.score,
      stars: p.stars,
      bestScore: p.bestScore,
      attempts: p.attempts,
      completedAt: p.completedAt?.toISOString() ?? null,
    }));
  },

  create: async (userId: string, data: ProgressCreateBody): Promise<PublicProgress> => {
    const progress = await prisma.userLevelProgress.create({
      data: {
        ...data,
        userId: Number(userId),
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      },
    });

    return {
      id: progress.id.toString(),
      gradeId: progress.gradeId,
      gameLevelId: progress.gameLevelId,
      completed: progress.completed,
      score: progress.score,
      stars: progress.stars,
      bestScore: progress.bestScore,
      attempts: progress.attempts,
      completedAt: progress.completedAt?.toISOString() ?? null,
    };
  },

  update: async (userId: string, gameLevelId: number, data: ProgressUpdateBody): Promise<PublicProgress | null> => {
    const existing = await prisma.userLevelProgress.findFirst({
      where: { userId: Number(userId), gameLevelId },
    });

    if (!existing) {
      return null;
    }

    const progress = await prisma.userLevelProgress.update({
      where: { id: existing.id },
      data: {
        ...data,
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      },
    });

    return {
      id: progress.id.toString(),
      gradeId: progress.gradeId,
      gameLevelId: progress.gameLevelId,
      completed: progress.completed,
      score: progress.score,
      stars: progress.stars,
      bestScore: progress.bestScore,
      attempts: progress.attempts,
      completedAt: progress.completedAt?.toISOString() ?? null,
    };
  },
};
