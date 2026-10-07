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
  genreStats?: Array<{ genreId: string; genreName: string; xp: number; stars: number }>;
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
    const numericUserId = Number(userId);
    const profile = (await prisma.userGameProfile.findUnique({
      where: { userId: numericUserId },
    })) as UserGameProfileRecord | null;

    if (!profile) {
      return null;
    }

    const [user, passedLevels, userGifts] = await Promise.all([
      prisma.user.findUnique({ where: { id: numericUserId }, select: { userID: true } }),
      prisma.userLevelProgress.findMany({
        where: { userId: numericUserId, completed: true },
        select: {
          bestScore: true,
          stars: true,
          gameLevel: {
            select: {
              gradeSubject: {
                select: { subject: { select: { id: true, name: true } } },
              },
            },
          },
        },
      }),
      prisma.userGift.findMany({
        where: { userId: numericUserId },
        select: { gift: { select: { pointsAwarded: true, starsAwarded: true } } },
      }),
    ]);

    const genreTotals = new Map<string, { genreId: string; genreName: string; xp: number; stars: number }>();
    let levelXp = 0;
    let levelStars = 0;
    for (const progress of passedLevels) {
      const subject = progress.gameLevel.gradeSubject.subject;
      const key = String(subject.id);
      const current = genreTotals.get(key) ?? { genreId: key, genreName: subject.name, xp: 0, stars: 0 };
      current.xp += progress.bestScore;
      current.stars += progress.stars;
      levelXp += progress.bestScore;
      levelStars += progress.stars;
      genreTotals.set(key, current);
    }

    let claimedChallengeXp = 0;
    let claimedChallengeStars = 0;
    if (user) {
      const claimedChallenges = await prisma.userChallenge.findMany({
        where: { userId: user.userID, claimed: true },
        select: {
          pointsEarned: true,
          starsEarned: true,
          selectedGradeSubjectId: true,
          challenge: { select: { subjectId: true, topicId: true } },
        },
      });
      const directSubjectIds = claimedChallenges
        .map(({ challenge }) => Number(challenge.subjectId))
        .filter((id) => Number.isInteger(id) && id > 0);
      const gradeSubjectIds = claimedChallenges
        .map(({ selectedGradeSubjectId }) => Number(selectedGradeSubjectId))
        .filter((id) => Number.isInteger(id) && id > 0);
      const topicIds = claimedChallenges
        .map(({ challenge }) => Number(challenge.topicId))
        .filter((id) => Number.isInteger(id) && id > 0);
      const [subjects, gradeSubjects, topics] = await Promise.all([
        directSubjectIds.length
          ? prisma.subject.findMany({ where: { id: { in: [...new Set(directSubjectIds)] } }, select: { id: true, name: true } })
          : Promise.resolve([]),
        gradeSubjectIds.length
          ? prisma.gradeSubject.findMany({ where: { id: { in: [...new Set(gradeSubjectIds)] } }, select: { id: true, subject: { select: { id: true, name: true } } } })
          : Promise.resolve([]),
        topicIds.length
          ? prisma.topic.findMany({ where: { id: { in: [...new Set(topicIds)] } }, select: { id: true, subject: { select: { id: true, name: true } } } })
          : Promise.resolve([]),
      ]);
      const subjectNames = new Map(subjects.map((subject) => [String(subject.id), subject.name]));
      const gradeSubjectMap = new Map(gradeSubjects.map((item) => [String(item.id), item.subject]));
      const topicMap = new Map(topics.map((item) => [String(item.id), item.subject]));
      for (const record of claimedChallenges) {
        claimedChallengeXp += record.pointsEarned;
        claimedChallengeStars += record.starsEarned;
        const resolvedSubject = Number(record.challenge.subjectId) > 0
          ? { id: Number(record.challenge.subjectId), name: subjectNames.get(String(record.challenge.subjectId)) }
          : gradeSubjectMap.get(String(record.selectedGradeSubjectId)) ?? topicMap.get(String(record.challenge.topicId));
        if (!resolvedSubject?.name) continue;
        const key = String(resolvedSubject.id);
        const current = genreTotals.get(key) ?? { genreId: key, genreName: resolvedSubject.name, xp: 0, stars: 0 };
        current.xp += record.pointsEarned;
        current.stars += record.starsEarned;
        genreTotals.set(key, current);
      }
    }

    const giftXp = userGifts.reduce((total, { gift }) => total + gift.pointsAwarded, 0);
    const giftStars = userGifts.reduce((total, { gift }) => total + gift.starsAwarded, 0);
    // Read totals from their authoritative reward records too, so profiles
    // created before level-pass crediting still return accurate totals.
    const xp = Math.max(profile.xp, levelXp + claimedChallengeXp + giftXp);
    const stars = Math.max(profile.stars, levelStars + claimedChallengeStars + giftStars);

    // Persist reward-derived totals on the overall profile as well. The max
    // keeps manually granted/profile-only rewards intact and makes this
    // reconciliation safe to repeat.
    if (xp !== profile.xp || stars !== profile.stars) {
      await prisma.userGameProfile.update({
        where: { userId: numericUserId },
        data: { xp, stars },
      });
    }

    return {
      userId: profile.userId.toString(),
      key: profile.key,
      xp,
      coins: profile.coins,
      stars,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      genreStats: [...genreTotals.values()].sort((left, right) => left.genreName.localeCompare(right.genreName)),
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
