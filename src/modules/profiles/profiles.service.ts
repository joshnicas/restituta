import prisma from "../../prisma";
import type { ProfileUpdateBody } from "./profiles.schema";

export interface PublicProfile {
  userId: string;
  key?: string | null;
  xp: number;
  coins: number;
  stars: number;
  currentStreak: number;
  longestStreak: number;
}

type UserGameProfileRecord = {
  userId: number;
  key: string | null;
  xp: number;
  coins: number;
  stars: number;
  currentStreak: number;
  longestStreak: number;
  updatedAt: Date;
};

export const profilesService = {
  getByUserId: async (userId: string): Promise<PublicProfile | null> => {
    const profile = (await prisma.userGameProfile.findUnique({
      where: { userId: Number(userId) },
    })) as UserGameProfileRecord | null;

    if (!profile) {
      return null;
    }

    return {
      userId: profile.userId.toString(),
      key: profile.key,
      xp: profile.xp,
      coins: profile.coins,
      stars: profile.stars,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
    };
  },

  update: async (userId: string, data: ProfileUpdateBody): Promise<PublicProfile> => {
    const profile = (await prisma.userGameProfile.upsert({
      where: { userId: Number(userId) },
      update: data,
      create: {
        userId: Number(userId),
        ...data,
      },
    })) as UserGameProfileRecord;

    return {
      userId: profile.userId.toString(),
      key: profile.key,
      xp: profile.xp,
      coins: profile.coins,
      stars: profile.stars,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
    };
  },

  listAll: async (page: number = 1, limit: number = 15): Promise<{ profiles: PublicProfile[]; total: number; page: number; limit: number; totalPages: number }> => {
    const skip = (page - 1) * limit;
    
    const [profiles, total] = await Promise.all([
      prisma.userGameProfile.findMany({
        skip,
        take: limit,
        orderBy: {
          userId: "asc",
        },
      }),
      prisma.userGameProfile.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      profiles: profiles.map((profile) => ({
        userId: profile.userId.toString(),
        key: profile.key,
        xp: profile.xp,
        coins: profile.coins,
        stars: profile.stars,
        currentStreak: profile.currentStreak,
        longestStreak: profile.longestStreak,
      })),
      total,
      page,
      limit,
      totalPages,
    };
  },

  create: async (userId: string, data: ProfileUpdateBody): Promise<PublicProfile> => {
    const profile = (await prisma.userGameProfile.create({
      data: {
        userId: Number(userId),
        ...data,
      },
    })) as UserGameProfileRecord;

    return {
      userId: profile.userId.toString(),
      key: profile.key,
      xp: profile.xp,
      coins: profile.coins,
      stars: profile.stars,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
    };
  },

  deleteByUserId: async (userId: string): Promise<void> => {
    await prisma.userGameProfile.delete({ where: { userId: Number(userId) } });
  },
};
