import { Prisma } from "@prisma/client";

import prisma from "../../prisma";

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
    select: { currentStreak: true, longestStreak: true, lastActivityDate: true },
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
  return streak;
}

export const streaksService = {
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
): Promise<{ result: T; streak: StreakSnapshot }> {
  const todayKey = getTanzaniaDateKey();
  return withSerializableRetry(() =>
    prisma.$transaction(
      async (transaction) => {
        const result = await operation(transaction);
        const streak = await recordDailyActivity(transaction, userId, pointsEarned, todayKey);
        return { result, streak };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
}