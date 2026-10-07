import { Prisma } from "@prisma/client";

import prisma from "../../prisma";
import { normalizeLanguage, resolveLocalizedText } from "../localization/language";
import { recordReward } from "../rewards/reward-ledger";
import type {
  ChallengeCreateBody,
  ChallengeListQuery,
  ChallengeUpdateBody,
  UserChallengeProgressBody,
} from "./challenges.schema";

function darEsSalaamDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Dar_es_Salaam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function isoWeekKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayOfWeek);
  const weekYear = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(weekYear, 0, 4));
  const firstDay = firstThursday.getUTCDay() || 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - firstDay);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / 604800000);
  return `${weekYear}-W${String(week).padStart(2, "0")}`;
}

function getParticipationPeriod(type: string, challengeId: string): string {
  const today = darEsSalaamDate();
  if (type === "DAILY") return `DAY:${today}`;
  if (type === "WEEKLY") return `WEEK:${isoWeekKey(today)}`;
  return `CHALLENGE:${challengeId}`;
}

function getDailyChallengeStars(correctAnswers: number): number {
  if (correctAnswers >= 10) return 5;
  if (correctAnswers >= 8) return 4;
  if (correctAnswers >= 6) return 3;
  if (correctAnswers >= 5) return 2;
  if (correctAnswers >= 1) return 1;
  return 0;
}

function getWeekdayIndex(dateKey: string): number {
  const day = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
  return (day + 6) % 7;
}

function challengeTranslationCreate(translations: ChallengeCreateBody["translations"]) {
  if (!translations) return undefined;
  return {
    create: (Object.entries(translations) as Array<["EN" | "SW", { title: string; description?: string | null } | undefined]>)
      .flatMap(([language, value]) => value ? [{ language, title: value.title, description: value.description ?? null }] : []),
  };
}

function toChallengeCreateData(data: ChallengeCreateBody): Prisma.ChallengeCreateInput {
  const { translations, ...fields } = data;
  return {
    ...fields,
    startsAt: new Date(data.startsAt),
    ...(data.endsAt !== undefined ? { endsAt: data.endsAt ? new Date(data.endsAt) : null } : {}),
    ...(challengeTranslationCreate(translations) ? { translations: challengeTranslationCreate(translations) } : {}),
  };
}

function toChallengeUpdateData(data: ChallengeUpdateBody, challengeId: string): Prisma.ChallengeUpdateInput {
  const { translations, ...fields } = data;
  const translationUpserts = translations
    ? (Object.entries(translations) as Array<["EN" | "SW", { title: string; description?: string | null } | undefined]>)
        .flatMap(([language, value]) => value ? [{
          where: { challengeId_language: { challengeId, language } },
          create: { language, title: value.title, description: value.description ?? null },
          update: { title: value.title, description: value.description ?? null },
        }] : [])
    : [];
  return {
    ...fields,
    ...(data.startsAt !== undefined ? { startsAt: new Date(data.startsAt) } : {}),
    ...(data.endsAt !== undefined ? { endsAt: data.endsAt ? new Date(data.endsAt) : null } : {}),
    ...(translationUpserts.length ? { translations: { upsert: translationUpserts } } : {}),
  };
}

function localizeChallenge<T extends { title: string; description: string | null; translations?: Array<{ language: string; title: string; description: string | null }> }>(challenge: T, requestedLanguage: unknown) {
  const { translations, ...fields } = challenge;
  const byLanguage = Object.fromEntries((translations ?? []).map((translation) => [normalizeLanguage(translation.language), translation]));
  return {
    ...fields,
    title: resolveLocalizedText(requestedLanguage, {
      EN: byLanguage.EN?.title ?? challenge.title,
      SW: byLanguage.SW?.title ?? byLanguage.EN?.title ?? challenge.title,
    }, challenge.title) ?? challenge.title,
    description: resolveLocalizedText(requestedLanguage, {
      EN: byLanguage.EN?.description ?? challenge.description,
      SW: byLanguage.SW?.description ?? byLanguage.EN?.description ?? challenge.description,
    }, challenge.description),
  };
}

function localizeParticipation<T extends { challenge: { title: string; description: string | null; translations?: Array<{ language: string; title: string; description: string | null }> } }>(participation: T, language: unknown) {
  return { ...participation, challenge: localizeChallenge(participation.challenge, language) };
}

export const challengesService = {
  getAll: async (query: ChallengeListQuery) => {
    const filters: Prisma.ChallengeWhereInput[] = [
      { OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] },
      ...(query.type ? [{ type: query.type }] : []),
      ...(query.gradeId ? [{ OR: [{ gradeId: query.gradeId }, { gradeId: null }] }] : []),
      ...(query.subjectId ? [{ OR: [{ subjectId: query.subjectId }, { subjectId: null }] }] : []),
      ...(query.topicId ? [{ OR: [{ topicId: query.topicId }, { topicId: null }] }] : []),
    ];
    const where: Prisma.ChallengeWhereInput = { isActive: true, AND: filters };
    const [challenges, total] = await Promise.all([
      prisma.challenge.findMany({
        where,
        orderBy: { startsAt: "asc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { translations: true },
      }),
      prisma.challenge.count({ where }),
    ]);

    return {
      challenges: challenges.map((challenge) => localizeChallenge(challenge, query.language)),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  },

  getById: async (id: string, language: unknown = "EN") => {
    const challenge = await prisma.challenge.findFirst({
      where: {
        id,
        isActive: true,
        OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
      },
      include: { translations: true },
    });
    return challenge ? localizeChallenge(challenge, language) : null;
  },

  create: (data: ChallengeCreateBody) => prisma.challenge.create({
    data: toChallengeCreateData(data),
    include: { translations: true },
  }).then((challenge) => localizeChallenge(challenge, "EN")),

  update: async (id: string, data: ChallengeUpdateBody) => {
    const existing = await prisma.challenge.findUnique({ where: { id } });
    if (!existing) return null;
    const startsAt = data.startsAt !== undefined ? new Date(data.startsAt) : existing.startsAt;
    const endsAt = data.endsAt !== undefined
      ? data.endsAt ? new Date(data.endsAt) : null
      : existing.endsAt;
    if (endsAt && endsAt < startsAt) {
      throw new Error("Challenge end time must be after its start time.");
    }
    return prisma.challenge.update({ where: { id }, data: toChallengeUpdateData(data, id), include: { translations: true } })
      .then((challenge) => localizeChallenge(challenge, "EN"));
  },

  delete: async (id: string) => {
    const existing = await prisma.challenge.findUnique({ where: { id } });
    if (!existing) return null;
    return prisma.challenge.delete({ where: { id } });
  },

  getUserChallenges: async (authenticatedUserId: string, language: unknown = "EN") => {
    const userId = Number(authenticatedUserId);
    if (!Number.isInteger(userId)) throw new Error("Invalid user session.");
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { userID: true, gradeId: true } });
    if (!user) throw new Error("User not found.");

    const currentDate = darEsSalaamDate();
    const weeklyProgress = await prisma.userChallenge.findMany({
      where: { userId: user.userID, challenge: { type: "WEEKLY" }, completed: false, failed: false },
      include: { challenge: { include: { translations: true } } },
    });
    for (const progress of weeklyProgress) {
      const periodParts = progress.periodKey.match(/^WEEK:(\d{4})-W(\d{2})$/);
      if (!periodParts) continue;
      const [, weekYear, weekNumber] = periodParts;
      const firstThursday = new Date(Date.UTC(Number(weekYear), 0, 4 + (Number(weekNumber) - 1) * 7));
      const firstDay = getWeekdayIndex(firstThursday.toISOString().slice(0, 10));
      firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay);
      const weekdays = Array.from({ length: 5 }, (_, index) => {
        const date = new Date(firstThursday);
        date.setUTCDate(date.getUTCDate() + index);
        return date.toISOString().slice(0, 10);
      });
      const elapsedWeekdays = weekdays.filter((dateKey) => dateKey < currentDate);
      if (!elapsedWeekdays.length) continue;
      const activities = await prisma.dailyActivity.findMany({
        where: {
          userId,
          activityDate: {
            gte: new Date(`${weekdays[0]}T00:00:00.000Z`),
            lte: new Date(`${weekdays[4]}T00:00:00.000Z`),
          },
        },
        select: { activityDate: true },
      });
      const activeDates = new Set(activities.map((activity) => activity.activityDate.toISOString().slice(0, 10)));
      if (elapsedWeekdays.some((dateKey) => !activeDates.has(dateKey))) {
        await prisma.userChallenge.update({ where: { id: progress.id }, data: { failed: true } });
      }
    }

    return prisma.userChallenge.findMany({
      where: { userId: user.userID },
      include: { challenge: { include: { translations: true } } },
      orderBy: { startedAt: "desc" },
    }).then((progress) => progress.map((entry) => localizeParticipation(entry, language)));
  },

  join: async (authenticatedUserId: string, challengeId: string, language: unknown = "EN") => {
    const userId = Number(authenticatedUserId);
    if (!Number.isInteger(userId)) throw new Error("Invalid user session.");

    const [user, challenge] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { userID: true } }),
      prisma.challenge.findUnique({ where: { id: challengeId } }),
    ]);
    if (!user) throw new Error("User not found.");
    if (!challenge || !challenge.isActive) throw new Error("Challenge not found.");
    const now = new Date();
    if (challenge.startsAt > now) throw new Error("Challenge has not started.");
    if (challenge.endsAt && challenge.endsAt < now) throw new Error("Challenge has ended.");
    if (challenge.type === "WEEKLY" && getWeekdayIndex(darEsSalaamDate()) > 4) {
      throw new Error("The weekly streak challenge starts again on Monday.");
    }

    const periodKey = getParticipationPeriod(challenge.type, challenge.id);
    if (challenge.type === "DAILY") {
      return prisma.$transaction(async (transaction) => {
        const existingToday = await transaction.userChallenge.findFirst({
          where: {
            userId: user.userID,
            periodKey,
            challenge: { type: "DAILY" },
          },
          include: { challenge: { include: { translations: true } } },
        });
        if (existingToday) {
          if (existingToday.challengeId !== challengeId) {
            throw new Error("Today's daily challenge has already been started.");
          }
          return localizeParticipation(existingToday, language);
        }

        const created = await transaction.userChallenge.create({
          data: { userId: user.userID, challengeId, periodKey },
          include: { challenge: { include: { translations: true } } },
        });
        return localizeParticipation(created, language);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }

    const participation = await prisma.userChallenge.upsert({
      where: {
        userId_challengeId_periodKey: {
          userId: user.userID,
          challengeId,
          periodKey,
        },
      },
      create: { userId: user.userID, challengeId, periodKey },
      update: {},
      include: { challenge: { include: { translations: true } } },
    });
    return localizeParticipation(participation, language);
  },

  updateProgress: async (
    authenticatedUserId: string,
    userChallengeId: string,
    data: UserChallengeProgressBody,
  ) => {
    const userId = Number(authenticatedUserId);
    if (!Number.isInteger(userId)) throw new Error("Invalid user session.");
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { userID: true, gradeId: true } });
    if (!user) throw new Error("User not found.");

    return prisma.$transaction(async (transaction) => {
      const progress = await transaction.userChallenge.findFirst({
        where: { id: userChallengeId, userId: user.userID },
        include: { challenge: true },
      });
      if (!progress) return null;
      const now = new Date();
      if (!progress.challenge.isActive) throw new Error("Challenge is not active.");
      if (progress.challenge.startsAt > now) throw new Error("Challenge has not started.");
      if (progress.challenge.endsAt && progress.challenge.endsAt < now) {
        throw new Error("Challenge has ended.");
      }

      const questionsAnswered = data.questionsAnswered ?? progress.questionsAnswered;
      const correctAnswers = data.correctAnswers ?? progress.correctAnswers;
      if (questionsAnswered < progress.questionsAnswered || correctAnswers < progress.correctAnswers) {
        throw new Error("Challenge progress cannot decrease.");
      }
      if (questionsAnswered > progress.challenge.targetQuestions) {
        throw new Error("Questions answered cannot exceed the challenge target.");
      }
      if (correctAnswers > questionsAnswered) {
        throw new Error("Correct answers cannot exceed questions answered.");
      }
      if (progress.challenge.type === "WEEKLY") {
        throw new Error("Weekly streak progress is tracked automatically from game activity.");
      }
      if (progress.claimed) throw new Error("Challenge rewards have already been claimed.");
      if (data.selectedGradeSubjectId && progress.selectedGradeSubjectId && data.selectedGradeSubjectId !== progress.selectedGradeSubjectId) {
        throw new Error("The started challenge subject cannot be changed.");
      }

      const completed = questionsAnswered >= progress.challenge.targetQuestions;
      const pointsEarned = progress.challenge.type === "DAILY" ? correctAnswers * 10 : progress.pointsEarned;
      const starsEarned = progress.challenge.type === "DAILY"
        ? getDailyChallengeStars(correctAnswers)
        : progress.starsEarned;
      const updatedProgress = await transaction.userChallenge.update({
        where: { id: progress.id },
        data: {
          questionsAnswered,
          correctAnswers,
          completed,
          pointsEarned,
          starsEarned,
          ...(data.selectedGradeSubjectId && !progress.selectedGradeSubjectId
            ? { selectedGradeSubjectId: data.selectedGradeSubjectId }
            : {}),
          ...(completed && !progress.completed ? { completedAt: new Date() } : {}),
        },
        include: { challenge: true },
      });

      return updatedProgress;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },

  claimRewards: async (authenticatedUserId: string, userChallengeId: string) => {
    const userId = Number(authenticatedUserId);
    if (!Number.isInteger(userId)) throw new Error("Invalid user session.");
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { userID: true, gradeId: true } });
    if (!user) throw new Error("User not found.");

    return prisma.$transaction(async (transaction) => {
      const progress = await transaction.userChallenge.findFirst({
        where: { id: userChallengeId, userId: user.userID },
        include: { challenge: true },
      });
      if (!progress) return null;
      if (!progress.completed) throw new Error("Complete the challenge before claiming its rewards.");
      if (progress.claimed) return progress;

      const claimedProgress = await transaction.userChallenge.update({
        where: { id: progress.id },
        data: { claimed: true },
        include: { challenge: true },
      });

      if (progress.pointsEarned > 0 || progress.starsEarned > 0) {
        await transaction.userGameProfile.upsert({
          where: { userId },
          update: {
            ...(progress.pointsEarned > 0 ? { xp: { increment: progress.pointsEarned } } : {}),
            ...(progress.starsEarned > 0 ? { stars: { increment: progress.starsEarned } } : {}),
          },
          create: { userId, xp: progress.pointsEarned, stars: progress.starsEarned },
        });
        const selectedGradeSubjectId = Number(progress.selectedGradeSubjectId);
        const selectedGradeSubject = Number.isInteger(selectedGradeSubjectId)
          ? await transaction.gradeSubject.findUnique({
              where: { id: selectedGradeSubjectId },
              select: { gradeId: true, subjectId: true },
            })
          : null;
        const configuredGradeId = Number(progress.challenge.gradeId);
        const configuredSubjectId = Number(progress.challenge.subjectId);
        await recordReward(transaction, {
          userId,
          sourceType: "CHALLENGE",
          sourceId: claimedProgress.id,
          xpDelta: progress.pointsEarned,
          starsDelta: progress.starsEarned,
          gradeId: selectedGradeSubject?.gradeId ?? (Number.isInteger(configuredGradeId) && configuredGradeId > 0 ? configuredGradeId : user.gradeId),
          subjectId: selectedGradeSubject?.subjectId ?? (Number.isInteger(configuredSubjectId) && configuredSubjectId > 0 ? configuredSubjectId : null),
          earnedAt: claimedProgress.updatedAt,
        });
      }

      return claimedProgress;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
};
