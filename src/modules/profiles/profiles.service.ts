import prisma from "../../prisma";
import type { ProfileUpdateBody } from "./profiles.schema";

export interface PublicProfile {
  userId: string;
  xp: number;
  coins: number;
  stars: number;
  currentStreak: number;
  longestStreak: number;
}

export const profilesService = {
  getByUserId: async (userId: string): Promise<PublicProfile | null> => {
    const profile = await prisma.userGameProfile.findUnique({
      where: { userId: Number(userId) },
    });

    if (!profile) {
      return null;
    }

    return {
      userId: profile.userId.toString(),
      xp: profile.xp,
      coins: profile.coins,
      stars: profile.stars,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
    };
  },

  update: async (userId: string, data: ProfileUpdateBody): Promise<PublicProfile> => {
    const profile = await prisma.userGameProfile.upsert({
      where: { userId: Number(userId) },
      update: data,
      create: {
        userId: Number(userId),
        ...data,
      },
    });

    return {
      userId: profile.userId.toString(),
      xp: profile.xp,
      coins: profile.coins,
      stars: profile.stars,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
    };
  },
};
