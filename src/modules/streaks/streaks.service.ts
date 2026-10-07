import { Prisma } from "@prisma/client";

import prisma from "../../prisma";
import { recordReward } from "../rewards/reward-ledger";

const APPLICATION_TIME_ZONE = "Africa/Dar_es_Salaam";
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export interface StreakSnapshot {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
}

export interface StreakOverview extends StreakSnapshot {
  week: Array<{ date: string; day: string; complete: boolean }>;
  historicalStreaks: Array<{ startDate: string; endDate: string; days: number }>;
}

export function getTanzaniaDateKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APPLICATION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function dateKeyToUtcDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function utcDateToDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getIsoWeekKey(dateKey: string): string {
  const date = dateKeyToUtcDate(dateKey);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const weekYear = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(weekYear, 0, 4));
  const firstDay = firstThursday.getUTCDay() || 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - firstDay);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * DAY_IN_MILLISECONDS));
  return `${weekYear}-W${String(week).padStart(2, "0")}`;
}

function getIsoWeekDates(dateKey: string): string[] {
  const date = dateKeyToUtcDate(dateKey);
  const day = (date.getUTCDay() + 6) % 7;
  const monday = new Date(date);
  monday.setUTCDate(monday.getUTCDate() - day);
  return Array.from({ length: 5 }, (_, index) => {
    const weekday = new Date(monday);
    weekday.setUTCDate(weekday.getUTCDate() + index);
    return utcDateToDateKey(weekday);
  });
}

async function updateWeeklyStreakChallenge(
  transaction: Prisma.TransactionClient,
  user: { id: number; userID: string; gradeId: number | null },
  todayKey: string,
): Promise<void> {
  const weekdayDates = getIsoWeekDates(todayKey);
  const periodKey = `WEEK:${getIsoWeekKey(todayKey)}`;
  const dayIndex = (dateKeyToUtcDate(todayKey).getUTCDay() + 6) % 7;
  const existing = await transaction.userChallenge.findFirst({
    where: { userId: user.userID, periodKey, challenge: { type: "WEEKLY" } },
    include: { challenge: true },
  });

  let participation = existing;
  if (!participation) {
    if (dayIndex > 4) return;
    const now = new Date();
    const challengeWhere: Prisma.ChallengeWhereInput = {
      type: "WEEKLY",
      isActive: true,
      startsAt: { lte: now },
      AND: [
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        user.gradeId === null
          ? { gradeId: null }
          : { OR: [{ gradeId: String(user.gradeId) }, { gradeId: null }] },
      ],
    };
    const challenge = await transaction.challenge.findFirst({
      where: challengeWhere,
      orderBy: { startsAt: "asc" },
    });
    if (!challenge) return;
    participation = await transaction.userChallenge.create({
      data: { userId: user.userID, challengeId: challenge.id, periodKey },
      include: { challenge: true },
    });
  }

  if (participation.completed || participation.failed) return;

  const activities = await transaction.dailyActivity.findMany({
    where: {
      userId: user.id,
      activityDate: {
        gte: dateKeyToUtcDate(weekdayDates[0]),
        lte: dateKeyToUtcDate(weekdayDates[4]),
      },
    },
    select: { activityDate: true },
  });
  const activeDates = new Set(activities.map(({ activityDate }) => utcDateToDateKey(activityDate)));
  const elapsedDates = weekdayDates.filter((date) => date < todayKey);
  const failed = elapsedDates.some((date) => !activeDates.has(date));
  const completed = !failed && weekdayDates.every((date) => activeDates.has(date));
  const pointsEarned = completed ? participation.challenge.pointsReward : participation.pointsEarned;
  const starsEarned = completed ? participation.challenge.starsReward : participation.starsEarned;

  const updatedParticipation = await transaction.userChallenge.update({
    where: { id: participation.id },
    data: {
      questionsAnswered: activeDates.size,
      completed,
      failed,
      pointsEarned,
      starsEarned,
      ...(completed ? { claimed: true, completedAt: new Date() } : {}),
    },
  });

  if (completed && !participation.completed && !participation.claimed && (pointsEarned > 0 || starsEarned > 0)) {
    await transaction.userGameProfile.upsert({
      where: { userId: user.id },
      update: {
        ...(pointsEarned > 0 ? { xp: { increment: pointsEarned } } : {}),
        ...(starsEarned > 0 ? { stars: { increment: starsEarned } } : {}),
      },
      create: { userId: user.id, xp: pointsEarned, stars: starsEarned },
    });
    const configuredGradeId = Number(participation.challenge.gradeId);
    await recordReward(transaction, {
      userId: user.id,
      sourceType: "CHALLENGE",
      sourceId: updatedParticipation.id,
      xpDelta: pointsEarned,
      starsDelta: starsEarned,
      gradeId: Number.isInteger(configuredGradeId) && configuredGradeId > 0 ? configuredGradeId : user.gradeId,
      earnedAt: updatedParticipation.updatedAt,
    });
  }
}

export function calculateStreak(
  lastActivityDate: Date | null,
  currentStreak: number,
  longestStreak: number,
  todayKey: string,
): StreakSnapshot {
  if (!lastActivityDate) {
    return { currentStreak: 1, longestStreak: Math.max(longestStreak, 1), lastActivityDate: todayKey };
  }

  const previousKey = utcDateToDateKey(lastActivityDate);
  if (previousKey === todayKey) {
    return { currentStreak, longestStreak, lastActivityDate: previousKey };
  }

  const yesterdayKey = utcDateToDateKey(new Date(dateKeyToUtcDate(todayKey).getTime() - DAY_IN_MILLISECONDS));
  const nextStreak = previousKey === yesterdayKey ? currentStreak + 1 : 1;
  return {
    currentStreak: nextStreak,
    longestStreak: Math.max(longestStreak, nextStreak),
    lastActivityDate: todayKey,
  };
}

export async function recordDailyActivity(
  transaction: Prisma.TransactionClient,
  userId: number,
  pointsEarned: number,
  todayKey: string,
): Promise<StreakSnapshot> {
  const user = await transaction.user.findUnique({
    where: { id: userId },
    select: { id: true, userID: true, gradeId: true, currentStreak: true, longestStreak: true, lastActivityDate: true },
  });
  if (!user) throw new Error("User not found.");

  const activityDate = dateKeyToUtcDate(todayKey);
  await transaction.dailyActivity.upsert({
    where: { userId_activityDate: { userId, activityDate } },
    create: { userId, activityDate, questionsAnswered: 1, pointsEarned },
    update: {
      questionsAnswered: { increment: 1 },
      pointsEarned: { increment: pointsEarned },
    },
  });

  const streak = calculateStreak(user.lastActivityDate, user.currentStreak, user.longestStreak, todayKey);
  if (streak.lastActivityDate !== (user.lastActivityDate ? utcDateToDateKey(user.lastActivityDate) : null)) {
    await transaction.user.update({
      where: { id: userId },
      data: {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        lastActivityDate: activityDate,
      },
    });
  }
  await updateWeeklyStreakChallenge(transaction, user, todayKey);
  return streak;
}

export const streaksService = {
  getLives: async (userId: number): Promise<LifeSnapshot | null> => {
    const profile = await prisma.userGameProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    const now = new Date();
    if (profile.lives < 3 && !profile.nextLifeAt) {
      const nextLifeAt = new Date(now.getTime() + FIVE_MINUTES_MS);
      const updated = await prisma.userGameProfile.update({
        where: { userId },
        data: { nextLifeAt },
      });
      return { lives: updated.lives, nextLifeAt: updated.nextLifeAt?.toISOString() ?? null };
    }
    if (profile.lives < 3 && profile.nextLifeAt && profile.nextLifeAt <= now) {
      const elapsedIntervals = Math.floor((now.getTime() - profile.nextLifeAt.getTime()) / FIVE_MINUTES_MS) + 1;
      const recoveredLives = Math.min(3 - profile.lives, elapsedIntervals);
      const lives = profile.lives + recoveredLives;
      const nextLifeAt = lives < 3
        ? new Date(profile.nextLifeAt.getTime() + recoveredLives * FIVE_MINUTES_MS)
        : null;
      const updated = await prisma.userGameProfile.update({
        where: { userId },
        data: { lives, nextLifeAt },
      });
      return { lives: updated.lives, nextLifeAt: updated.nextLifeAt?.toISOString() ?? null };
    }
    return { lives: profile.lives, nextLifeAt: profile.nextLifeAt?.toISOString() ?? null };
  },
  getOverview: async (userId: number): Promise<StreakOverview | null> => {
    const todayKey = getTanzaniaDateKey();
    const today = dateKeyToUtcDate(todayKey);
    const monday = new Date(today);
    const weekday = monday.getUTCDay();
    monday.setUTCDate(monday.getUTCDate() - (weekday === 0 ? 6 : weekday - 1));
    const sunday = new Date(monday);
    sunday.setUTCDate(sunday.getUTCDate() + 6);

    const [user, activities, historicalStreaks] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { currentStreak: true, longestStreak: true, lastActivityDate: true },
      }),
      prisma.dailyActivity.findMany({
        where: { userId, activityDate: { gte: monday, lte: sunday } },
        select: { activityDate: true },
      }),
      prisma.$queryRaw<Array<{ startDate: string; endDate: string; days: number }>>`
        WITH ordered AS (
          SELECT
            "activityDate"::date AS activity_date,
            CASE
              WHEN LAG("activityDate"::date) OVER (ORDER BY "activityDate"::date) = "activityDate"::date - 1 THEN 0
              ELSE 1
            END AS starts_run
          FROM "daily_activities"
          WHERE "userId" = ${userId}
        ), grouped AS (
          SELECT
            activity_date,
            SUM(starts_run) OVER (ORDER BY activity_date) AS run_id
          FROM ordered
        )
        SELECT
          MIN(activity_date)::text AS "startDate",
          MAX(activity_date)::text AS "endDate",
          COUNT(*)::int AS days
        FROM grouped
        GROUP BY run_id
        ORDER BY days DESC, "endDate" DESC
        LIMIT 10
      `,
    ]);

    if (!user) return null;
    const activeDates = new Set(activities.map(({ activityDate }) => utcDateToDateKey(activityDate)));
    const labels = ["M", "T", "W", "T", "F", "S", "S"];
    const week = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setUTCDate(date.getUTCDate() + index);
      const dateKey = utcDateToDateKey(date);
      return { date: dateKey, day: labels[index], complete: activeDates.has(dateKey) };
    });

    return {
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      lastActivityDate: user.lastActivityDate ? utcDateToDateKey(user.lastActivityDate) : null,
      week,
      historicalStreaks,
    };
  },
};

export async function withSerializableRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const isSerializationConflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (!isSerializationConflict || attempt >= 4) throw error;
    }
  }
}

export async function recordAttemptWithStreak<T>(
  userId: number,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  pointsEarned: number,
  isCorrect: boolean,
): Promise<{ result: T; streak: StreakSnapshot; lives: LifeSnapshot }> {
  const todayKey = getTanzaniaDateKey();
  return withSerializableRetry(() =>
    prisma.$transaction(
      async (transaction) => {
        const now = new Date();
        const profile = await transaction.userGameProfile.upsert({
          where: { userId },
          create: { userId },
          update: {},
        });
        let lives = profile.lives;
        let nextLifeAt = profile.nextLifeAt;

        if (lives < 3 && nextLifeAt && nextLifeAt <= now) {
          const elapsedIntervals = Math.floor((now.getTime() - nextLifeAt.getTime()) / FIVE_MINUTES_MS) + 1;
          const recoveredLives = Math.min(3 - lives, elapsedIntervals);
          lives += recoveredLives;
          nextLifeAt = lives < 3
            ? new Date(nextLifeAt.getTime() + recoveredLives * FIVE_MINUTES_MS)
            : null;
        }
        if (lives === 0) {
          if (!nextLifeAt) nextLifeAt = new Date(now.getTime() + FIVE_MINUTES_MS);
          await transaction.userGameProfile.update({ where: { userId }, data: { lives, nextLifeAt } });
          throw new Error(`You're out of lives. Your next life is available at ${nextLifeAt.toISOString()}.`);
        }
        if (!isCorrect) {
          lives -= 1;
        }
        if (lives < 3 && !nextLifeAt) {
          nextLifeAt = new Date(now.getTime() + FIVE_MINUTES_MS);
        }
        const lifeProfile = await transaction.userGameProfile.update({
          where: { userId },
          data: { lives, nextLifeAt },
        });
        const result = await operation(transaction);
        const streak = await recordDailyActivity(transaction, userId, pointsEarned, todayKey);
        return {
          result,
          streak,
          lives: { lives: lifeProfile.lives, nextLifeAt: lifeProfile.nextLifeAt?.toISOString() ?? null },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;
export type LifeSnapshot = { lives: number; nextLifeAt: string | null };
