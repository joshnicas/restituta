import { Prisma, type PracticeMode } from "@prisma/client";
import prisma from "../../prisma";
import { normalizeLanguage, resolveLocalizedText } from "../localization/language";
import { recordReward } from "../rewards/reward-ledger";
import { getTanzaniaDateKey, recordDailyActivity, withSerializableRetry } from "../streaks/streaks.service";
import type { PracticeAnswerBody, PracticeStartBody } from "./practice.schema";

const QUESTION_LIMIT = 5;
const RECENT_ANSWER_WINDOW_DAYS = 30;
const MIN_TOPIC_ANSWERS = 3;

export class PracticeError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

type PublicPracticeQuestion = {
  id: string;
  text: string;
  image: string | null;
  audio: string | null;
  timeLimit: number | null;
  gameType: { code: string; name: string };
  topicId: string | null;
  options: Array<{ id: string; text: string | null; image: string | null; audio: string | null; order: number }>;
  media: Array<{ id: string; type: string; url: string; altText: string | null; order: number }>;
};

function asIds(value: Prisma.JsonValue): number[] {
  if (!Array.isArray(value)) return [];
  return value.map(Number).filter((id) => Number.isInteger(id) && id > 0);
}

function localized(language: unknown, english: string | null, swahili: string | null, fallback: string | null): string | null {
  return resolveLocalizedText(normalizeLanguage(language), {
    EN: english ?? fallback ?? undefined,
    SW: swahili ?? english ?? fallback ?? undefined,
  }, fallback) ?? fallback;
}

function accuracy(correct: number, total: number): number | null {
  return total >= MIN_TOPIC_ANSWERS ? Math.round((correct / total) * 100) : null;
}

async function selectQuestions(
  userId: number,
  gradeId: number,
  input: PracticeStartBody,
): Promise<number[]> {
  if (input.mode === "MISTAKES") {
    const rows = await prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      WITH topic_performance AS (
        SELECT question."topicId" AS topic_id,
               COUNT(*) AS answer_count,
               COUNT(*) FILTER (WHERE NOT attempt."isCorrect") AS wrong_count,
               COUNT(*) FILTER (WHERE attempt."isCorrect")::float / COUNT(*) AS accuracy
        FROM "user_question_attempts" attempt
        JOIN "questions" question ON question.id = attempt."questionId"
        WHERE attempt."userId" = ${userId} AND question."topicId" IS NOT NULL
        GROUP BY question."topicId"
        HAVING COUNT(*) >= ${MIN_TOPIC_ANSWERS}
           AND COUNT(*) FILTER (WHERE NOT attempt."isCorrect") > 0
      ), weakest_topic AS (
        SELECT performance.topic_id
        FROM topic_performance performance
        JOIN "topics" topic ON topic.id = performance.topic_id
        WHERE performance.accuracy < 0.8
          AND EXISTS (
            SELECT 1 FROM "questions" available
            JOIN "game_levels" available_level ON available_level.id = available."gameLevelId"
            JOIN "grade_subjects" available_grade_subject ON available_grade_subject.id = available_level."gradeSubjectId"
            WHERE available."topicId" = performance.topic_id AND available.active = true
              AND available_level.active = true AND available_grade_subject.active = true
              AND available_grade_subject."gradeId" = ${gradeId}
              AND NOT EXISTS (
                SELECT 1 FROM "user_question_attempts" prior
                WHERE prior."userId" = ${userId} AND prior."questionId" = available.id
              )
          )
        ORDER BY performance.accuracy ASC, topic.name ASC
        LIMIT 1
      )
      SELECT question.id
      FROM "questions" question
      JOIN "game_levels" level ON level.id = question."gameLevelId"
      JOIN "grade_subjects" grade_subject ON grade_subject.id = level."gradeSubjectId"
      JOIN weakest_topic ON weakest_topic.topic_id = question."topicId"
      WHERE question.active = true
        AND level.active = true
        AND grade_subject.active = true
        AND grade_subject."gradeId" = ${gradeId}
        AND NOT EXISTS (
          SELECT 1 FROM "user_question_attempts" prior
          WHERE prior."userId" = ${userId} AND prior."questionId" = question.id
        )
      ORDER BY random()
      LIMIT ${QUESTION_LIMIT}
    `);
    return rows.map(({ id }) => id);
  }

  const filters: Prisma.Sql[] = [
    Prisma.sql`question.active = true`,
    Prisma.sql`level.active = true`,
    Prisma.sql`grade_subject.active = true`,
    Prisma.sql`grade_subject."gradeId" = ${gradeId}`,
  ];
  if (input.mode === "SUBJECT") {
    filters.push(Prisma.sql`grade_subject."subjectId" = ${input.subjectId}`);
    if (input.topicId !== undefined) filters.push(Prisma.sql`question."topicId" = ${input.topicId}`);
  }
  if (input.mode === "QUICK") {
    const recentSince = new Date(Date.now() - RECENT_ANSWER_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    filters.push(Prisma.sql`NOT EXISTS (
      SELECT 1 FROM "user_question_attempts" recent
      WHERE recent."userId" = ${userId} AND recent."questionId" = question.id
        AND recent."attemptedAt" >= ${recentSince}
    )`);
  }

  const rows = await prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
    SELECT question.id
    FROM "questions" question
    JOIN "game_levels" level ON level.id = question."gameLevelId"
    JOIN "grade_subjects" grade_subject ON grade_subject.id = level."gradeSubjectId"
    WHERE ${Prisma.join(filters, " AND ")}
    ORDER BY random()
    LIMIT ${QUESTION_LIMIT}
  `);
  return rows.map(({ id }) => id);
}

async function countMistakeCandidates(userId: number, gradeId: number): Promise<number> {
  const [row] = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    WITH topic_performance AS (
      SELECT question."topicId" AS topic_id,
             COUNT(*) AS answer_count,
             COUNT(*) FILTER (WHERE NOT attempt."isCorrect") AS wrong_count,
             COUNT(*) FILTER (WHERE attempt."isCorrect")::float / COUNT(*) AS accuracy
      FROM "user_question_attempts" attempt
      JOIN "questions" question ON question.id = attempt."questionId"
      WHERE attempt."userId" = ${userId} AND question."topicId" IS NOT NULL
      GROUP BY question."topicId"
      HAVING COUNT(*) >= ${MIN_TOPIC_ANSWERS}
         AND COUNT(*) FILTER (WHERE NOT attempt."isCorrect") > 0
    ), weakest_topic AS (
      SELECT performance.topic_id
      FROM topic_performance performance
      JOIN "topics" topic ON topic.id = performance.topic_id
      WHERE performance.accuracy < 0.8
        AND EXISTS (
          SELECT 1 FROM "questions" available
          JOIN "game_levels" available_level ON available_level.id = available."gameLevelId"
          JOIN "grade_subjects" available_grade_subject ON available_grade_subject.id = available_level."gradeSubjectId"
          WHERE available."topicId" = performance.topic_id AND available.active = true
            AND available_level.active = true AND available_grade_subject.active = true
            AND available_grade_subject."gradeId" = ${gradeId}
            AND NOT EXISTS (
              SELECT 1 FROM "user_question_attempts" prior
              WHERE prior."userId" = ${userId} AND prior."questionId" = available.id
            )
        )
      ORDER BY performance.accuracy ASC, topic.name ASC
      LIMIT 1
    )
    SELECT COUNT(*)::bigint AS count
    FROM "questions" question
    JOIN "game_levels" level ON level.id = question."gameLevelId"
    JOIN "grade_subjects" grade_subject ON grade_subject.id = level."gradeSubjectId"
    JOIN weakest_topic ON weakest_topic.topic_id = question."topicId"
    WHERE question.active = true AND level.active = true AND grade_subject.active = true
      AND grade_subject."gradeId" = ${gradeId}
      AND NOT EXISTS (
        SELECT 1 FROM "user_question_attempts" prior
        WHERE prior."userId" = ${userId} AND prior."questionId" = question.id
      )
  `);
  return Number(row?.count ?? 0);
}

async function countWeakTopics(userId: number, gradeId: number): Promise<number> {
  const [row] = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS count FROM (
      SELECT question."topicId"
      FROM "user_question_attempts" attempt
      JOIN "questions" question ON question.id = attempt."questionId"
      JOIN "game_levels" level ON level.id = question."gameLevelId"
      JOIN "grade_subjects" grade_subject ON grade_subject.id = level."gradeSubjectId"
      WHERE attempt."userId" = ${userId} AND question."topicId" IS NOT NULL
        AND grade_subject."gradeId" = ${gradeId}
      GROUP BY question."topicId"
      HAVING COUNT(*) >= ${MIN_TOPIC_ANSWERS}
        AND COUNT(*) FILTER (WHERE NOT attempt."isCorrect") > 0
        AND COUNT(*) FILTER (WHERE attempt."isCorrect")::float / COUNT(*) < 0.8
    ) eligible
  `);
  return Number(row?.count ?? 0);
}

async function getWeakestMistakeTopic(userId: number, gradeId: number) {
  const [row] = await prisma.$queryRaw<Array<{ name: string; accuracy: number }>>(Prisma.sql`
    WITH topic_performance AS (
      SELECT question."topicId" AS topic_id,
             COUNT(*) AS answer_count,
             COUNT(*) FILTER (WHERE NOT attempt."isCorrect") AS wrong_count,
             COUNT(*) FILTER (WHERE attempt."isCorrect")::float / COUNT(*) AS accuracy
      FROM "user_question_attempts" attempt
      JOIN "questions" question ON question.id = attempt."questionId"
      WHERE attempt."userId" = ${userId} AND question."topicId" IS NOT NULL
      GROUP BY question."topicId"
      HAVING COUNT(*) >= ${MIN_TOPIC_ANSWERS}
         AND COUNT(*) FILTER (WHERE NOT attempt."isCorrect") > 0
    )
    SELECT topic.name AS name, performance.accuracy AS accuracy
    FROM topic_performance performance
    JOIN "topics" topic ON topic.id = performance.topic_id
    WHERE performance.accuracy < 0.8
      AND EXISTS (
        SELECT 1
        FROM "questions" question
      JOIN "game_levels" level ON level.id = question."gameLevelId"
      JOIN "grade_subjects" grade_subject ON grade_subject.id = level."gradeSubjectId"
      WHERE question."topicId" = topic.id AND question.active = true
          AND level.active = true AND grade_subject.active = true
          AND grade_subject."gradeId" = ${gradeId}
      )
    ORDER BY performance.accuracy ASC, topic.name ASC
    LIMIT 1
  `);
  return row ? { name: row.name, accuracy: Math.round(Number(row.accuracy) * 100) } : null;
}

async function getPublicQuestions(questionIds: number[], language: unknown): Promise<PublicPracticeQuestion[]> {
  if (questionIds.length === 0) return [];
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds }, active: true },
    include: {
      gameType: { select: { code: true, name: true } },
      translations: true,
      options: { orderBy: { order: "asc" }, include: { translations: true } },
      media: { orderBy: { order: "asc" } },
    },
  });
  const byId = new Map(questions.map((question) => [question.id, question]));
  return questionIds.flatMap((id) => {
    const question = byId.get(id);
    if (!question) return [];
    const questionTranslation = question.translations.find((item) => normalizeLanguage(item.language) === "SW");
    const options = question.options.map((option) => {
      const english = option.translations.find((item) => normalizeLanguage(item.language) === "EN")?.text ?? option.text;
      const swahili = option.translations.find((item) => normalizeLanguage(item.language) === "SW")?.text;
      return {
        id: String(option.id),
        text: localized(language, english, swahili ?? null, option.text),
        image: option.image,
        audio: option.audio,
        order: option.order,
      };
    });
    return [{
      id: String(question.id),
      text: localized(language, question.text, questionTranslation?.text ?? null, question.text) ?? question.text,
      image: question.image,
      audio: question.audio,
      timeLimit: question.timeLimit,
      gameType: question.gameType,
      topicId: question.topicId === null ? null : String(question.topicId),
      options,
      media: question.media.map((media) => ({
        id: String(media.id), type: media.type, url: media.url, altText: media.altText, order: media.order,
      })),
    }];
  });
}

function sessionResponse(session: {
  id: string; mode: PracticeMode; subjectId: number | null; topicId: number | null;
  totalQuestions: number; answeredQuestions: number; correctAnswers: number;
  pointsEarned: number; starsEarned: number; completed: boolean; startedAt: Date; completedAt: Date | null;
}) {
  return {
    id: session.id,
    mode: session.mode,
    subjectId: session.subjectId === null ? null : String(session.subjectId),
    topicId: session.topicId === null ? null : String(session.topicId),
    totalQuestions: session.totalQuestions,
    answeredQuestions: session.answeredQuestions,
    correctAnswers: session.correctAnswers,
    pointsEarned: session.pointsEarned,
    starsEarned: session.starsEarned,
    completed: session.completed,
    startedAt: session.startedAt.toISOString(),
    completedAt: session.completedAt?.toISOString() ?? null,
  };
}

function percent(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

export const practiceService = {
  home: async (userId: number) => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { gradeId: true, currentStreak: true, language: true } });
    if (!user) throw new PracticeError("User not found.", 404);
    if (!user.gradeId) {
      return { success: true as const, streak: user.currentStreak, quickPractice: { available: false, questionCount: 0 }, mistakes: { questionCount: 0, topic: null, hasWeakTopics: false }, subjects: [], stats: { questionsAnswered: 0, accuracy: null, pointsEarned: 0, starsEarned: 0 } };
    }

    const [subjectRows, subjectAccuracyRows, totals, correctCount, stars, mistakesCount, weakTopicCount, weakestMistakeTopic, quickIds] = await Promise.all([
      prisma.gradeSubject.findMany({
        where: { gradeId: user.gradeId, active: true, subject: { active: true } },
        select: { subject: { select: { id: true, name: true, code: true, icon: true } } },
        orderBy: { subject: { name: "asc" } },
      }),
      prisma.$queryRaw<Array<{ subjectId: number; answered: bigint; correct: bigint }>>(Prisma.sql`
        SELECT grade_subject."subjectId" AS "subjectId", COUNT(*)::bigint AS answered,
               COUNT(*) FILTER (WHERE attempt."isCorrect")::bigint AS correct
        FROM "user_question_attempts" attempt
        JOIN "questions" question ON question.id = attempt."questionId"
        JOIN "game_levels" level ON level.id = question."gameLevelId"
        JOIN "grade_subjects" grade_subject ON grade_subject.id = level."gradeSubjectId"
        WHERE attempt."userId" = ${userId} AND grade_subject."gradeId" = ${user.gradeId}
        GROUP BY grade_subject."subjectId"
      `),
      prisma.userQuestionAttempt.aggregate({ where: { userId, source: "PRACTICE" }, _count: { id: true }, _sum: { pointsEarned: true } }),
      prisma.userQuestionAttempt.count({ where: { userId, source: "PRACTICE", isCorrect: true } }),
      prisma.userRewardLedger.aggregate({ where: { userId, sourceType: "PRACTICE" }, _sum: { starsDelta: true } }),
      countMistakeCandidates(userId, user.gradeId),
      countWeakTopics(userId, user.gradeId),
      getWeakestMistakeTopic(userId, user.gradeId),
      selectQuestions(userId, user.gradeId, { mode: "QUICK" }),
    ]);
    const subjectAccuracy = new Map(subjectAccuracyRows.map((row) => [row.subjectId, row]));
    const answered = totals._count.id;
    return {
      success: true as const,
      streak: user.currentStreak,
      quickPractice: { available: quickIds.length > 0, questionCount: quickIds.length },
      mistakes: { questionCount: mistakesCount, topic: weakestMistakeTopic, hasWeakTopics: weakTopicCount > 0 },
      subjects: subjectRows.map(({ subject }) => {
        const row = subjectAccuracy.get(subject.id);
        const total = Number(row?.answered ?? 0);
        return {
          id: String(subject.id), name: subject.name, code: subject.code, icon: subject.icon,
          accuracy: total >= MIN_TOPIC_ANSWERS ? percent(Number(row?.correct ?? 0), total) : null,
          questionsAnswered: total,
        };
      }),
      stats: {
        questionsAnswered: answered,
        accuracy: answered >= MIN_TOPIC_ANSWERS ? percent(correctCount, answered) : null,
        pointsEarned: totals._sum.pointsEarned ?? 0,
        starsEarned: stars._sum.starsDelta ?? 0,
      },
    };
  },

  subject: async (userId: number, subjectId: number) => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { gradeId: true } });
    if (!user?.gradeId) throw new PracticeError("Choose a grade before starting Practice.", 400);
    const gradeSubject = await prisma.gradeSubject.findFirst({
      where: { gradeId: user.gradeId, subjectId, active: true, subject: { active: true } },
      select: { subject: { select: { id: true, name: true, code: true, icon: true } }, topics: { where: { active: true, topic: { active: true } }, select: { topic: { select: { id: true, name: true } } }, orderBy: { topic: { name: "asc" } } } },
    });
    if (!gradeSubject) throw new PracticeError("Subject not found for your grade.", 404);
    const stats = await prisma.$queryRaw<Array<{ topicId: number; answered: bigint; correct: bigint }>>(Prisma.sql`
      SELECT question."topicId" AS "topicId", COUNT(*)::bigint AS answered,
             COUNT(*) FILTER (WHERE attempt."isCorrect")::bigint AS correct
      FROM "user_question_attempts" attempt
      JOIN "questions" question ON question.id = attempt."questionId"
      JOIN "game_levels" level ON level.id = question."gameLevelId"
      JOIN "grade_subjects" grade_subject ON grade_subject.id = level."gradeSubjectId"
      WHERE attempt."userId" = ${userId} AND grade_subject."gradeId" = ${user.gradeId}
        AND grade_subject."subjectId" = ${subjectId} AND question."topicId" IS NOT NULL
      GROUP BY question."topicId"
    `);
    const statsByTopic = new Map(stats.map((row) => [row.topicId, row]));
    return {
      success: true as const,
      subject: { ...gradeSubject.subject, id: String(gradeSubject.subject.id) },
      topics: gradeSubject.topics.map(({ topic }) => {
        const row = statsByTopic.get(topic.id);
        const total = Number(row?.answered ?? 0);
        return { id: String(topic.id), name: topic.name, accuracy: total >= MIN_TOPIC_ANSWERS ? percent(Number(row?.correct ?? 0), total) : null, questionsAnswered: total };
      }),
    };
  },

  start: async (userId: number, input: PracticeStartBody) => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { gradeId: true, language: true } });
    if (!user) throw new PracticeError("User not found.", 404);
    if (!user.gradeId) throw new PracticeError("Choose a grade before starting Practice.", 400);
    if (input.mode === "SUBJECT") {
      const relation = await prisma.gradeSubject.findFirst({
        where: { gradeId: user.gradeId, subjectId: input.subjectId, active: true, subject: { active: true }, ...(input.topicId ? { topics: { some: { topicId: input.topicId, active: true, topic: { active: true } } } } : {}) },
        select: { id: true },
      });
      if (!relation) throw new PracticeError("Choose a subject or topic available for your grade.", 404);
    }
    const questionIds = await selectQuestions(userId, user.gradeId, input);
    if (questionIds.length === 0) throw new PracticeError("No questions are ready for practice yet.", 404);
    const questions = await getPublicQuestions(questionIds, user.language);
    if (questions.length === 0) throw new PracticeError("No questions are ready for practice yet.", 404);
    const session = await prisma.practiceSession.create({
      data: {
        userId,
        mode: input.mode,
        subjectId: input.mode === "SUBJECT" ? input.subjectId : null,
        topicId: input.mode === "SUBJECT" ? input.topicId ?? null : null,
        questionIds: questions.map((question) => Number(question.id)),
        totalQuestions: questions.length,
      },
    });
    return { success: true as const, session: sessionResponse(session), questions, answeredQuestionIds: [] as string[] };
  },

  getSession: async (userId: number, sessionId: string) => {
    const session = await prisma.practiceSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw new PracticeError("Practice session not found.", 404);
    const questionIds = asIds(session.questionIds);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { language: true } });
    const [questions, attempts] = await Promise.all([
      getPublicQuestions(questionIds, user?.language),
      prisma.userQuestionAttempt.findMany({ where: { practiceSessionId: session.id }, select: { questionId: true } }),
    ]);
    return {
      success: true as const,
      session: sessionResponse(session),
      questions,
      answeredQuestionIds: attempts.map(({ questionId }) => String(questionId)),
      ...(session.completed ? { result: { totalQuestions: session.totalQuestions, correctAnswers: session.correctAnswers, accuracy: percent(session.correctAnswers, session.totalQuestions), pointsEarned: session.pointsEarned, starsEarned: session.starsEarned } } : {}),
    };
  },

  answer: async (userId: number, sessionId: string, input: PracticeAnswerBody) => {
    const session = await prisma.practiceSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw new PracticeError("Practice session not found.", 404);
    if (session.completed) throw new PracticeError("This Practice session is already complete.", 409);
    if (!asIds(session.questionIds).includes(input.questionId)) throw new PracticeError("That question is not part of this Practice session.", 403);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { language: true, gradeId: true } });
    const question = await prisma.question.findFirst({
      where: { id: input.questionId, active: true },
      include: {
        gameType: true,
        options: { include: { translations: true } },
        trueFalse: true,
        acceptedAnswers: true,
        matches: { orderBy: { order: "asc" } },
        orderingItems: { orderBy: { correctOrder: "asc" } },
        gameLevel: { select: { gradeSubject: { select: { gradeId: true, subjectId: true } } } },
      },
    });
    if (!question) throw new PracticeError("Question not found.", 404);
    if (question.gameLevel.gradeSubject.gradeId !== user?.gradeId) throw new PracticeError("That question is not available for your grade.", 403);
    const code = question.gameType.code.toUpperCase();
    let correct = false;
    let correctAnswer = "";
    if (code === "TRUE_FALSE" && question.trueFalse) {
      correct = input.answer === question.trueFalse.answer;
      correctAnswer = question.trueFalse.answer ? (normalizeLanguage(user?.language) === "SW" ? "Kweli" : "True") : (normalizeLanguage(user?.language) === "SW" ? "Si kweli" : "False");
    } else if (input.selectedOptionId !== undefined) {
      const option = question.options.find(({ id }) => id === input.selectedOptionId);
      if (!option) throw new PracticeError("Choose an answer from this question.", 400);
      correct = option.isCorrect;
      const swText = option.translations.find((item) => normalizeLanguage(item.language) === "SW")?.text;
      const enText = option.translations.find((item) => normalizeLanguage(item.language) === "EN")?.text;
      const imageChoiceRenderer = code === "IMAGE_CHOICE" && question.options.length > 1 && question.options.every((item) => Boolean(item.image));
      correctAnswer = imageChoiceRenderer || !(enText ?? option.text)
        ? String(option.id)
        : localized(user?.language, enText ?? option.text, swText ?? null, option.text) ?? String(option.id);
    } else if (input.answerText !== undefined) {
      const preferredAnswers = question.acceptedAnswers.filter((answer) => normalizeLanguage(answer.language) === normalizeLanguage(user?.language));
      const accepted = preferredAnswers.length > 0
        ? preferredAnswers
        : question.acceptedAnswers.filter((answer) => normalizeLanguage(answer.language) === "EN");
      correct = accepted.some(({ answer, isCaseSensitive }) => isCaseSensitive ? input.answerText?.trim() === answer : input.answerText?.trim().toLocaleLowerCase() === answer.toLocaleLowerCase());
      correctAnswer = "Correct";
    } else if (input.answerData !== undefined) {
      const expected = code === "ORDERING"
        ? question.orderingItems.map(({ id }) => id)
        : question.matches.map(({ id }) => id);
      const submitted = Array.isArray(input.answerData) ? input.answerData.map(Number) : [];
      correct = submitted.length === expected.length && submitted.every((id, index) => id === expected[index]);
      correctAnswer = "Correct";
    } else {
      throw new PracticeError("This answer format is not supported.", 400);
    }

    const pointsEarned = correct ? 5 : 0;
    const starsEarned = 0;
    try {
      const todayKey = getTanzaniaDateKey();
      const { result, streak } = await withSerializableRetry(() => prisma.$transaction(async (transaction) => {
        const ownedSession = await transaction.practiceSession.findFirst({ where: { id: sessionId, userId } });
        if (!ownedSession) throw new PracticeError("Practice session not found.", 404);
        if (ownedSession.completed) throw new PracticeError("This Practice session is already complete.", 409);
        if (!asIds(ownedSession.questionIds).includes(input.questionId)) throw new PracticeError("That question is not part of this Practice session.", 403);
        const previous = await transaction.userQuestionAttempt.findFirst({ where: { userId, practiceSessionId: sessionId, questionId: input.questionId }, select: { id: true } });
        if (previous) throw new PracticeError("This question was already answered.", 409);
        const attempt = await transaction.userQuestionAttempt.create({
          data: {
            userId,
            questionId: input.questionId,
            source: "PRACTICE",
            practiceSessionId: sessionId,
            isCorrect: correct,
            pointsEarned,
            answerData: { selectedOptionId: input.selectedOptionId ?? null, answer: input.answer ?? null, answerText: input.answerText ?? null, answerData: input.answerData ?? null },
          },
        });
        await recordReward(transaction, {
          userId, sourceType: "PRACTICE", sourceId: String(attempt.id), xpDelta: pointsEarned, starsDelta: starsEarned,
          gradeId: question.gameLevel.gradeSubject.gradeId,
          subjectId: question.gameLevel.gradeSubject.subjectId,
          earnedAt: attempt.attemptedAt,
        });
        if (pointsEarned > 0 || starsEarned > 0) {
          await transaction.userGameProfile.upsert({
            where: { userId },
            update: { xp: { increment: pointsEarned }, stars: { increment: starsEarned } },
            create: { userId, xp: pointsEarned, stars: starsEarned },
          });
        }
        const updatedSession = await transaction.practiceSession.update({
          where: { id: sessionId },
          data: {
            answeredQuestions: { increment: 1 },
            ...(correct ? { correctAnswers: { increment: 1 } } : {}),
            pointsEarned: { increment: pointsEarned },
          },
          select: { answeredQuestions: true, totalQuestions: true },
        });
        const streak = await recordDailyActivity(transaction, userId, pointsEarned, todayKey);
        return {
          result: { attemptId: attempt.id, answeredQuestions: updatedSession.answeredQuestions, totalQuestions: updatedSession.totalQuestions },
          streak,
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
      return { success: true as const, correct, correctAnswer, pointsEarned, starsEarned, answeredQuestions: result.answeredQuestions, totalQuestions: result.totalQuestions, streak };
    } catch (error) {
      if (error instanceof PracticeError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new PracticeError("This question was already answered.", 409);
      throw error;
    }
  },

  complete: async (userId: number, sessionId: string) => {
    return prisma.$transaction(async (transaction) => {
      const session = await transaction.practiceSession.findFirst({ where: { id: sessionId, userId } });
      if (!session) throw new PracticeError("Practice session not found.", 404);
      if (session.completed) throw new PracticeError("This Practice session is already complete.", 409);
      if (session.answeredQuestions !== session.totalQuestions) throw new PracticeError("Answer every question before finishing Practice.", 409);

      const earnedPerfectStar = session.correctAnswers === session.totalQuestions;
      const completed = await transaction.practiceSession.updateMany({
        where: { id: sessionId, userId, completed: false, answeredQuestions: session.totalQuestions },
        data: { completed: true, completedAt: new Date(), starsEarned: earnedPerfectStar ? 1 : 0 },
      });
      if (completed.count !== 1) throw new PracticeError("This Practice session is already complete.", 409);

      if (earnedPerfectStar) {
        await recordReward(transaction, {
          userId,
          sourceType: "PRACTICE",
          sourceId: `${session.id}:perfect-star`,
          starsDelta: 1,
        });
        await transaction.userGameProfile.upsert({
          where: { userId },
          update: { stars: { increment: 1 } },
          create: { userId, stars: 1 },
        });
      }

      return {
        success: true as const,
        totalQuestions: session.totalQuestions,
        correctAnswers: session.correctAnswers,
        accuracy: percent(session.correctAnswers, session.totalQuestions),
        pointsEarned: session.pointsEarned,
        starsEarned: earnedPerfectStar ? 1 : 0,
      };
    });
  },
};
