import prisma from "../../prisma";
import { schoolsService, type PublicSchool } from "../schools/schools.service";
import type { LeaderboardQuery } from "./leaderboards.schema";

type AttemptRecord = Awaited<ReturnType<typeof getAttempts>>[number];

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userID: string;
  profilePic: string | null;
  schoolCode: string | null;
  xp: number;
  stars: number;
  longestStreak: number;
  rewardBreakdown: RewardBreakdown;
}

type RewardCategory = "attempts" | "level" | "challenge" | "gift" | "other";
type RewardTotals = Record<RewardCategory | "total", number>;
type RewardBreakdown = { xp: RewardTotals; stars: RewardTotals };

function emptyRewardBreakdown(): RewardBreakdown {
  const totals = (): RewardTotals => ({ attempts: 0, level: 0, challenge: 0, gift: 0, other: 0, total: 0 });
  return { xp: totals(), stars: totals() };
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

function userLocationWhere(query: Pick<LeaderboardQuery, "region" | "district" | "schoolCode">) {
  if (query.schoolCode) return { schoolCode: { equals: query.schoolCode, mode: "insensitive" as const } };
  if (query.region || query.district) {
    const schoolCodes = schoolsService.getCodesByLocation({ region: query.region, district: query.district });
    return { schoolCode: { in: schoolCodes } };
  }
  return {};
}

async function getAttempts(period: LeaderboardQuery["period"], gradeId?: number, subjectId?: number, location: Pick<LeaderboardQuery, "region" | "district" | "schoolCode"> = {}) {
  const periodStart = getPeriodStart(period);

  return prisma.userQuestionAttempt.findMany({
    where: {
      user: userLocationWhere(location),
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
      user: { select: { userID: true, profilePic: true, schoolCode: true } },
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
  const rewardBreakdown = emptyRewardBreakdown();
  const attemptXp = attempts.reduce((total, attempt) => total + attempt.pointsEarned, 0);
  rewardBreakdown.xp.attempts = attemptXp;
  rewardBreakdown.xp.total = attemptXp;
  return {
    userId: first.userId.toString(),
    userID: first.user.userID,
    profilePic: first.user.profilePic,
    schoolCode: first.user.schoolCode,
    xp: attemptXp,
    stars: 0,
    longestStreak: calculateLongestStreak(attempts.map((attempt) => attempt.attemptedAt)),
    rewardBreakdown,
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

type RewardRecord = Awaited<ReturnType<typeof getRewardRecords>>[number];

async function getRewardRecords(period: LeaderboardQuery["period"], gradeId?: number, subjectId?: number, location: Pick<LeaderboardQuery, "region" | "district" | "schoolCode"> = {}) {
  const periodStart = getPeriodStart(period);
  return prisma.userRewardLedger.findMany({
    where: {
      ...(periodStart ? { earnedAt: { gte: periodStart } } : {}),
      user: userLocationWhere(location),
      ...(gradeId !== undefined ? { gradeId } : {}),
      ...(subjectId !== undefined ? { subjectId } : {}),
    },
    select: {
      userId: true,
      sourceType: true,
      xpDelta: true,
      starsDelta: true,
      gradeId: true,
      subjectId: true,
      user: { select: { userID: true, profilePic: true, schoolCode: true } },
    },
  });
}

function sumRewardRecords(records: RewardRecord[]): Array<Omit<LeaderboardEntry, "rank">> {
  const grouped = new Map<number, Omit<LeaderboardEntry, "rank">>();
  for (const record of records) {
    const entry = grouped.get(record.userId) ?? {
      userId: record.userId.toString(),
      userID: record.user.userID,
      profilePic: record.user.profilePic,
      schoolCode: record.user.schoolCode,
      xp: 0,
      stars: 0,
      longestStreak: 0,
      rewardBreakdown: emptyRewardBreakdown(),
    };
    entry.xp += record.xpDelta;
    entry.stars += record.starsDelta;
    const category: RewardCategory = record.sourceType === "ATTEMPT"
      ? "attempts"
      : record.sourceType === "LEVEL_PASS"
        ? "level"
        : record.sourceType === "CHALLENGE"
          ? "challenge"
          : record.sourceType === "GIFT"
            ? "gift"
            : "other";
    entry.rewardBreakdown.xp[category] += record.xpDelta;
    entry.rewardBreakdown.stars[category] += record.starsDelta;
    entry.rewardBreakdown.xp.total += record.xpDelta;
    entry.rewardBreakdown.stars.total += record.starsDelta;
    grouped.set(record.userId, entry);
  }
  return [...grouped.values()];
}

function applyOverallTotals<T extends Omit<LeaderboardEntry, "rank">>(
  entry: T,
  xp: number,
  stars: number,
): T {
  const xpRecorded = entry.rewardBreakdown.xp.total;
  const starsRecorded = entry.rewardBreakdown.stars.total;
  entry.rewardBreakdown.xp.other = Math.max(0, xp - xpRecorded);
  entry.rewardBreakdown.stars.other = Math.max(0, stars - starsRecorded);
  entry.rewardBreakdown.xp.total = xp;
  entry.rewardBreakdown.stars.total = stars;
  entry.xp = xp;
  entry.stars = stars;
  return entry;
}

function attachRewardBreakdowns(
  entries: Array<Omit<LeaderboardEntry, "rank">>,
  records: RewardRecord[],
  dimensions: { gradeId?: number; subjectId?: number } = {},
): Array<Omit<LeaderboardEntry, "rank">> {
  const scopedRecords = records.filter((record) =>
    (dimensions.gradeId === undefined || record.gradeId === dimensions.gradeId) &&
    (dimensions.subjectId === undefined || record.subjectId === dimensions.subjectId),
  );
  const byUser = new Map(sumRewardRecords(scopedRecords).map((entry) => [entry.userId, entry]));
  return entries.map((entry) => {
    const rewards = byUser.get(entry.userId);
    if (!rewards) return { ...entry, rewardBreakdown: emptyRewardBreakdown() };
    return {
      ...entry,
      xp: rewards.xp,
      stars: rewards.stars,
      rewardBreakdown: rewards.rewardBreakdown,
    };
  });
}

function groupRewardsByDimension(records: RewardRecord[], dimension: "gradeId" | "subjectId") {
  const grouped = new Map<number, RewardRecord[]>();
  for (const record of records) {
    const dimensionId = record[dimension];
    if (dimensionId === null) continue;
    const current = grouped.get(dimensionId) ?? [];
    current.push(record);
    grouped.set(dimensionId, current);
  }
  return grouped;
}

async function getOverallProfileEntries(query: LeaderboardQuery): Promise<Array<Omit<LeaderboardEntry, "rank">>> {
  const profiles = await prisma.userGameProfile.findMany({
    where: { user: userLocationWhere(query) },
    select: {
      userId: true,
      xp: true,
      stars: true,
      longestStreak: true,
      user: { select: { userID: true, profilePic: true, schoolCode: true } },
    },
  });

  const ledgerEntries = sumRewardRecords(await getRewardRecords("overall", undefined, undefined, query));
  const rewardByUser = new Map(ledgerEntries.map((entry) => [entry.userId, entry]));

  return profiles.map((profile) => applyOverallTotals({
    ...(rewardByUser.get(profile.userId.toString()) ?? {
      userId: profile.userId.toString(),
      userID: profile.user.userID,
      profilePic: profile.user.profilePic,
      schoolCode: profile.user.schoolCode,
      xp: 0,
      stars: 0,
      longestStreak: profile.longestStreak,
      rewardBreakdown: emptyRewardBreakdown(),
    }),
    userId: profile.userId.toString(),
    userID: profile.user.userID,
    profilePic: profile.user.profilePic,
    schoolCode: profile.user.schoolCode,
    longestStreak: profile.longestStreak,
  }, profile.xp, profile.stars));
}

async function getOverallGradeEntries(metric: LeaderboardQuery["metric"]): Promise<GradeLeaderboardEntry[]> {
  const profiles = await prisma.userGameProfile.findMany({
    where: { user: { gradeId: { not: null } } },
    select: {
      userId: true,
      xp: true,
      stars: true,
      longestStreak: true,
      user: {
        select: {
          userID: true,
          profilePic: true,
          schoolCode: true,
          grade: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });
  const ledgerEntries = sumRewardRecords(await getRewardRecords("overall"));
  const rewardByUser = new Map(ledgerEntries.map((entry) => [entry.userId, entry]));
  const grouped = new Map<number, Array<Omit<LeaderboardEntry, "rank"> & { grade: NonNullable<typeof profiles[number]["user"]["grade"]> }>>();

  for (const profile of profiles) {
    if (!profile.user.grade) {
      continue;
    }
    const entries = grouped.get(profile.user.grade.id) ?? [];
    const reward = rewardByUser.get(profile.userId.toString());
    const gradeEntry = {
      ...(reward ?? {
        userId: profile.userId.toString(),
        userID: profile.user.userID,
        profilePic: profile.user.profilePic,
        schoolCode: profile.user.schoolCode,
        xp: 0,
        stars: 0,
        longestStreak: profile.longestStreak,
        rewardBreakdown: emptyRewardBreakdown(),
      }),
      userId: profile.userId.toString(),
      userID: profile.user.userID,
      profilePic: profile.user.profilePic,
      schoolCode: profile.user.schoolCode,
      longestStreak: profile.longestStreak,
      grade: profile.user.grade,
    };
    entries.push(applyOverallTotals(gradeEntry, profile.xp, profile.stars));
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

function buildSubjectEntries(
  attempts: AttemptRecord[],
  metric: LeaderboardQuery["metric"],
  rewardRecords: RewardRecord[],
  gradeId: number,
): SubjectLeaderboardEntry[] {
  const grouped = new Map<number, AttemptRecord[]>();

  for (const attempt of attempts) {
    const subjectId = attempt.question.gameLevel.gradeSubject.subject.id;
    const subjectAttempts = grouped.get(subjectId) ?? [];
    subjectAttempts.push(attempt);
    grouped.set(subjectId, subjectAttempts);
  }

  return [...grouped.values()]
    .flatMap((subjectAttempts) => {
      const subject = subjectAttempts[0].question.gameLevel.gradeSubject.subject;
      const entries = attachRewardBreakdowns(groupByUser(subjectAttempts), rewardRecords, { gradeId, subjectId: subject.id });
      const rankedEntries = sortEntries(entries, metric);
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
      return sortEntries(await getOverallProfileEntries(query), query.metric);
    }

    if (query.metric !== "longestStreak") {
      return sortEntries(sumRewardRecords(await getRewardRecords(query.period, undefined, undefined, query)), query.metric);
    }
    const attempts = await getAttempts(query.period, undefined, undefined, query);
    const entries = groupByUser(attempts);
    return sortEntries(attachRewardBreakdowns(entries, await getRewardRecords(query.period, undefined, undefined, query)), query.metric);
  },

  getByGrade: async (query: LeaderboardQuery): Promise<GradeLeaderboardEntry[]> => {
    if (query.period === "overall") {
      return getOverallGradeEntries(query.metric);
    }

    if (query.metric !== "longestStreak") {
      const byGrade = groupRewardsByDimension(await getRewardRecords(query.period), "gradeId");
      const gradeIds = [...byGrade.keys()];
      const grades = await prisma.grade.findMany({
        where: { id: { in: gradeIds } },
        select: { id: true, name: true, code: true },
      });
      const gradeById = new Map(grades.map((grade) => [grade.id, grade]));
      return [...byGrade.entries()]
        .flatMap(([id, records]) => {
          const grade = gradeById.get(id);
          if (!grade) return [];
          return sortEntries(sumRewardRecords(records), query.metric).map((entry) => ({
            ...entry,
            grade: { ...grade, id: grade.id.toString() },
          }));
        })
        .sort((left, right) => Number(left.grade.id) - Number(right.grade.id) || left.rank - right.rank);
    }

    const attempts = await getAttempts(query.period);
    const grouped = new Map<number, AttemptRecord[]>();

    for (const attempt of attempts) {
      const gradeId = attempt.question.gameLevel.gradeSubject.grade.id;
      const gradeAttempts = grouped.get(gradeId) ?? [];
      gradeAttempts.push(attempt);
      grouped.set(gradeId, gradeAttempts);
    }
    const rewardRecords = await getRewardRecords(query.period);

    return [...grouped.entries()]
      .map(([, gradeAttempts]) => {
        const grade = gradeAttempts[0].question.gameLevel.gradeSubject.grade;
        const rankedEntries = sortEntries(attachRewardBreakdowns(groupByUser(gradeAttempts), rewardRecords, { gradeId: grade.id }), query.metric);
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
    if (query.metric !== "longestStreak") {
      const bySubject = groupRewardsByDimension(await getRewardRecords(query.period, gradeId), "subjectId");
      const subjectIds = [...bySubject.keys()];
      const subjects = await prisma.subject.findMany({
        where: { id: { in: subjectIds } },
        select: { id: true, name: true, code: true },
      });
      const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
      return [...bySubject.entries()]
        .flatMap(([id, records]) => {
          const subject = subjectById.get(id);
          if (!subject) return [];
          return sortEntries(sumRewardRecords(records), query.metric).map((entry) => ({
            ...entry,
            subject: { ...subject, id: subject.id.toString() },
          }));
        })
        .sort((left, right) => Number(left.subject.id) - Number(right.subject.id) || left.rank - right.rank);
    }
    const attempts = await getAttempts(query.period, gradeId);
    return buildSubjectEntries(attempts, query.metric, await getRewardRecords(query.period, gradeId), gradeId);
  },

  getSubject: async (gradeId: number, subjectId: number, query: LeaderboardQuery): Promise<SubjectLeaderboardEntry[]> => {
    if (query.metric !== "longestStreak") {
      const records = await getRewardRecords(query.period, gradeId, subjectId);
      if (!records.length) return [];
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        select: { id: true, name: true, code: true },
      });
      if (!subject) return [];
      return sortEntries(sumRewardRecords(records), query.metric).map((entry) => ({
        ...entry,
        subject: { ...subject, id: subject.id.toString() },
      }));
    }
    const attempts = await getAttempts(query.period, gradeId, subjectId);
    const subject = attempts[0]?.question.gameLevel.gradeSubject.subject;

    if (!subject) {
      return [];
    }

    const entries = attachRewardBreakdowns(groupByUser(attempts), await getRewardRecords(query.period, gradeId, subjectId), { gradeId, subjectId });
    return sortEntries(entries, query.metric).map((entry) => ({
      ...entry,
      subject: { ...subject, id: subject.id.toString() },
    }));
  },
};
