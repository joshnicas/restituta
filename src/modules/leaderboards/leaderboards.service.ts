import prisma from "../../prisma";
import type { LeaderboardQuery } from "./leaderboards.schema";

type AttemptRecord = Awaited<ReturnType<typeof getAttempts>>[number];

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userID: string;
  profilePic: string | null;
  xp: number;
  longestStreak: number;
}

export interface GradeLeaderboardEntry extends LeaderboardEntry {
  grade: { id: string; name: string; code: string };
}

export interface SubjectLeaderboardEntry extends LeaderboardEntry {
  subject: { id: string; name: string; code: string };
}

function getPeriodStart(period: LeaderboardQuery["period"]): Date | undefined {
  if (period === "overall") {
    return undefined;
  }

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (period === "month") {
    return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  }

  const daysSinceMonday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start;
}

async function getAttempts(period: LeaderboardQuery["period"], gradeId?: number, subjectId?: number) {
  const periodStart = getPeriodStart(period);

  return prisma.userQuestionAttempt.findMany({
    where: {
      ...(periodStart ? { attemptedAt: { gte: periodStart } } : {}),
      ...(gradeId || subjectId
        ? {
            question: {
              gameLevel: {
                gradeSubject: {
                  ...(gradeId ? { gradeId } : {}),
                  ...(subjectId ? { subjectId } : {}),
                },
              },
            },
          }
        : {}),
    },
    select: {
      userId: true,
      pointsEarned: true,
      attemptedAt: true,
      user: { select: { userID: true, profilePic: true } },
      question: {
        select: {
          gameLevel: {
            select: {
              gradeSubject: {
                select: {
                  grade: { select: { id: true, name: true, code: true } },
                  subject: { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { attemptedAt: "asc" },
  });
}

function calculateLongestStreak(dates: Date[]): number {
  const uniqueDays = [...new Set(dates.map((date) => date.toISOString().slice(0, 10)))].sort();
  let longest = 0;
  let current = 0;
  let previousDay: Date | undefined;

  for (const day of uniqueDays) {
    const currentDay = new Date(`${day}T00:00:00.000Z`);
    const isConsecutive = previousDay && currentDay.getTime() - previousDay.getTime() === 86_400_000;
    current = isConsecutive ? current + 1 : 1;
    longest = Math.max(longest, current);
    previousDay = currentDay;
  }

  return longest;
}

function buildEntry(attempts: AttemptRecord[]): Omit<LeaderboardEntry, "rank"> {
  const first = attempts[0];
  return {
    userId: first.userId.toString(),
    userID: first.user.userID,
    profilePic: first.user.profilePic,
    xp: attempts.reduce((total, attempt) => total + attempt.pointsEarned, 0),
    longestStreak: calculateLongestStreak(attempts.map((attempt) => attempt.attemptedAt)),
  };
}

function sortEntries(entries: Array<Omit<LeaderboardEntry, "rank">>, metric: LeaderboardQuery["metric"]): LeaderboardEntry[] {
  const sorted = [...entries].sort((left, right) => {
    const valueDifference = right[metric] - left[metric];
    return valueDifference || left.userID.localeCompare(right.userID);
  });

  return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function groupByUser(attempts: AttemptRecord[]): Array<Omit<LeaderboardEntry, "rank">> {
  const grouped = new Map<number, AttemptRecord[]>();
  for (const attempt of attempts) {
    const userAttempts = grouped.get(attempt.userId) ?? [];
    userAttempts.push(attempt);
    grouped.set(attempt.userId, userAttempts);
  }
  return [...grouped.values()].map(buildEntry);
}

async function getOverallProfileEntries(): Promise<Array<Omit<LeaderboardEntry, "rank">>> {
  const profiles = await prisma.userGameProfile.findMany({
    select: {
      userId: true,
      xp: true,
      longestStreak: true,
      user: { select: { userID: true, profilePic: true } },
    },
  });

  return profiles.map((profile) => ({
    userId: profile.userId.toString(),
    userID: profile.user.userID,
    profilePic: profile.user.profilePic,
    xp: profile.xp,
    longestStreak: profile.longestStreak,
  }));
}

async function getOverallGradeEntries(metric: LeaderboardQuery["metric"]): Promise<GradeLeaderboardEntry[]> {
  const profiles = await prisma.userGameProfile.findMany({
    where: { user: { gradeId: { not: null } } },
    select: {
      userId: true,
      xp: true,
      longestStreak: true,
      user: {
        select: {
          userID: true,
          profilePic: true,
          grade: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });
  const grouped = new Map<number, Array<Omit<LeaderboardEntry, "rank"> & { grade: NonNullable<typeof profiles[number]["user"]["grade"]> }>>();

  for (const profile of profiles) {
    if (!profile.user.grade) {
      continue;
    }
    const entries = grouped.get(profile.user.grade.id) ?? [];
    entries.push({
      userId: profile.userId.toString(),
      userID: profile.user.userID,
      profilePic: profile.user.profilePic,
      xp: profile.xp,
      longestStreak: profile.longestStreak,
      grade: profile.user.grade,
    });
    grouped.set(profile.user.grade.id, entries);
  }

  return [...grouped.values()]
    .flatMap((entries) => {
      const grade = entries[0].grade;
      return sortEntries(entries, metric).map((entry) => ({
        ...entry,
        grade: { ...grade, id: grade.id.toString() },
      }));
    })
    .sort((left, right) => Number(left.grade.id) - Number(right.grade.id) || left.rank - right.rank);
}

function buildSubjectEntries(attempts: AttemptRecord[], metric: LeaderboardQuery["metric"]): SubjectLeaderboardEntry[] {
  const grouped = new Map<number, AttemptRecord[]>();

  for (const attempt of attempts) {
    const subjectId = attempt.question.gameLevel.gradeSubject.subject.id;
    const subjectAttempts = grouped.get(subjectId) ?? [];
    subjectAttempts.push(attempt);
    grouped.set(subjectId, subjectAttempts);
  }

  return [...grouped.values()]
    .flatMap((subjectAttempts) => {
      const rankedEntries = sortEntries(groupByUser(subjectAttempts), metric);
      const subject = subjectAttempts[0].question.gameLevel.gradeSubject.subject;
      return rankedEntries.map((entry) => ({
        ...entry,
        subject: { ...subject, id: subject.id.toString() },
      }));
    })
    .sort((left, right) => Number(left.subject.id) - Number(right.subject.id) || left.rank - right.rank);
}

export const leaderboardsService = {
  getGlobal: async (query: LeaderboardQuery): Promise<LeaderboardEntry[]> => {
    if (query.period === "overall") {
      return sortEntries(await getOverallProfileEntries(), query.metric);
    }

    const attempts = await getAttempts(query.period);
    return sortEntries(groupByUser(attempts), query.metric);
  },

  getByGrade: async (query: LeaderboardQuery): Promise<GradeLeaderboardEntry[]> => {
    if (query.period === "overall") {
      return getOverallGradeEntries(query.metric);
    }

    const attempts = await getAttempts(query.period);
    const grouped = new Map<number, AttemptRecord[]>();

    for (const attempt of attempts) {
      const gradeId = attempt.question.gameLevel.gradeSubject.grade.id;
      const gradeAttempts = grouped.get(gradeId) ?? [];
      gradeAttempts.push(attempt);
      grouped.set(gradeId, gradeAttempts);
    }

    return [...grouped.entries()]
      .map(([, gradeAttempts]) => {
        const rankedEntries = sortEntries(groupByUser(gradeAttempts), query.metric);
        const grade = gradeAttempts[0].question.gameLevel.gradeSubject.grade;
        return rankedEntries.map((entry) => ({
          ...entry,
          grade: { ...grade, id: grade.id.toString() },
        }));
      })
      .flat()
      .sort((left, right) => left.grade.id.localeCompare(right.grade.id));
  },

  getGrade: async (gradeId: number, query: LeaderboardQuery): Promise<GradeLeaderboardEntry[]> => {
    const entries = await leaderboardsService.getByGrade(query);
    return entries.filter((entry) => entry.grade.id === gradeId.toString());
  },

  getSubjectsByGrade: async (gradeId: number, query: LeaderboardQuery): Promise<SubjectLeaderboardEntry[]> => {
    const attempts = await getAttempts(query.period, gradeId);
    return buildSubjectEntries(attempts, query.metric);
  },

  getSubject: async (gradeId: number, subjectId: number, query: LeaderboardQuery): Promise<SubjectLeaderboardEntry[]> => {
    const attempts = await getAttempts(query.period, gradeId, subjectId);
    const subject = attempts[0]?.question.gameLevel.gradeSubject.subject;

    if (!subject) {
      return [];
    }

    return sortEntries(groupByUser(attempts), query.metric).map((entry) => ({
      ...entry,
      subject: { ...subject, id: subject.id.toString() },
    }));
  },
};