import prisma from "../../prisma";
import type { QuestionCreateBody, QuestionUpdateBody } from "./questions.schema";

export interface PublicQuestion {
  id: string;
  gameLevelId: number;
  gameTypeId: number;
  text: string;
  image?: string | null;
  audio?: string | null;
  explanation?: string | null;
  points: number;
  timeLimit?: number | null;
  active: boolean;
  gameType?: {
    id: string;
    name: string;
    code: string;
  };
  context?: {
    grade: { id: string; name: string; code: string };
    subject: { id: string; name: string; code: string };
    topic: { id: string; name: string; code: string };
    level: { id: string; name: string; levelNumber: number };
  };
  options: Array<{
    id: string;
    text?: string | null;
    image?: string | null;
    audio?: string | null;
    isCorrect: boolean;
    order: number;
  }>;
  trueFalseAnswer?: boolean | null;
  matchingPairs: Array<{
    id: string;
    leftText?: string | null;
    leftImage?: string | null;
    rightText?: string | null;
    rightImage?: string | null;
    order: number;
  }>;
  orderingItems: Array<{
    id: string;
    text?: string | null;
    image?: string | null;
    correctOrder: number;
  }>;
  acceptedAnswers: Array<{
    id: string;
    answer: string;
    isCaseSensitive: boolean;
  }>;
  media: Array<{
    id: string;
    type: string;
    url: string;
    altText?: string | null;
    order: number;
  }>;
}

const questionInclude = {
  gameType: true,
  topic: true,
  gameLevel: {
    include: {
      gradeSubject: {
        include: {
          grade: true,
          subject: true,
        },
      },
    },
  },
  options: { orderBy: { order: "asc" as const } },
  trueFalse: true,
  matches: { orderBy: { order: "asc" as const } },
  orderingItems: { orderBy: { correctOrder: "asc" as const } },
  acceptedAnswers: true,
  media: { orderBy: { order: "asc" as const } },
};

type QuestionWithRelations = Awaited<ReturnType<typeof prisma.question.findFirst>> & {
  gameType?: { id: number; name: string; code: string };
  topic?: { id: number; name: string; code: string } | null;
  gameLevel?: {
    id: number;
    name: string;
    levelNumber: number;
    gradeSubject: {
      grade: { id: number; name: string; code: string };
      subject: { id: number; name: string; code: string };
    };
  };
  options?: Array<{
    id: number;
    text: string | null;
    image: string | null;
    audio: string | null;
    isCorrect: boolean;
    order: number;
  }>;
  trueFalse?: { answer: boolean } | null;
  matches?: Array<{
    id: number;
    leftText: string | null;
    leftImage: string | null;
    rightText: string | null;
    rightImage: string | null;
    order: number;
  }>;
  orderingItems?: Array<{
    id: number;
    text: string | null;
    image: string | null;
    correctOrder: number;
  }>;
  acceptedAnswers?: Array<{
    id: number;
    answer: string;
    isCaseSensitive: boolean;
  }>;
  media?: Array<{
    id: number;
    type: string;
    url: string;
    altText: string | null;
    order: number;
  }>;
};

function serializeQuestion(question: QuestionWithRelations): PublicQuestion {
  if (!question) {
    throw new Error("Question not found.");
  }

  const topic = question.topic
    ? {
        id: question.topic.id.toString(),
        name: question.topic.name,
        code: question.topic.code,
      }
    : question.gameLevel?.gradeSubject
      ? {
          id: "unknown",
          name: "Unknown Topic",
          code: "UNKNOWN",
        }
      : undefined;

  return {
    id: question.id.toString(),
    gameLevelId: question.gameLevelId,
    gameTypeId: question.gameTypeId,
    text: question.text,
    image: question.image,
    audio: question.audio,
    explanation: question.explanation,
    points: question.points,
    timeLimit: question.timeLimit,
    active: question.active,
    gameType: question.gameType
      ? {
          id: question.gameType.id.toString(),
          name: question.gameType.name,
          code: question.gameType.code,
        }
      : undefined,
    context: question.gameLevel?.gradeSubject
      ? {
          grade: {
            id: question.gameLevel.gradeSubject.grade.id.toString(),
            name: question.gameLevel.gradeSubject.grade.name,
            code: question.gameLevel.gradeSubject.grade.code,
          },
          subject: {
            id: question.gameLevel.gradeSubject.subject.id.toString(),
            name: question.gameLevel.gradeSubject.subject.name,
            code: question.gameLevel.gradeSubject.subject.code,
          },
          topic: topic ?? {
            id: "unknown",
            name: "Unknown Topic",
            code: "UNKNOWN",
          },
          level: {
            id: question.gameLevel.id.toString(),
            name: question.gameLevel.name,
            levelNumber: question.gameLevel.levelNumber,
          },
        }
      : undefined,
    options: (question.options ?? []).map((option) => ({
      id: option.id.toString(),
      text: option.text,
      image: option.image,
      audio: option.audio,
      isCorrect: option.isCorrect,
      order: option.order,
    })),
    trueFalseAnswer: question.trueFalse?.answer ?? null,
    matchingPairs: (question.matches ?? []).map((pair) => ({
      id: pair.id.toString(),
      leftText: pair.leftText,
      leftImage: pair.leftImage,
      rightText: pair.rightText,
      rightImage: pair.rightImage,
      order: pair.order,
    })),
    orderingItems: (question.orderingItems ?? []).map((item) => ({
      id: item.id.toString(),
      text: item.text,
      image: item.image,
      correctOrder: item.correctOrder,
    })),
    acceptedAnswers: (question.acceptedAnswers ?? []).map((answer) => ({
      id: answer.id.toString(),
      answer: answer.answer,
      isCaseSensitive: answer.isCaseSensitive,
    })),
    media: (question.media ?? []).map((media) => ({
      id: media.id.toString(),
      type: media.type,
      url: media.url,
      altText: media.altText,
      order: media.order,
    })),
  };
}

function buildNestedCreate(data: QuestionCreateBody) {
  return {
    gameLevelId: data.gameLevelId,
    gameTypeId: data.gameTypeId,
    text: data.text,
    image: data.image,
    audio: data.audio,
    explanation: data.explanation,
    points: data.points,
    timeLimit: data.timeLimit,
    active: data.active,
    options: data.options?.length
      ? {
          create: data.options.map((option, index) => ({
            text: option.text,
            image: option.image,
            audio: option.audio,
            isCorrect: option.isCorrect ?? false,
            order: option.order ?? index,
          })),
        }
      : undefined,
    trueFalse: data.trueFalseAnswer !== undefined ? { create: { answer: data.trueFalseAnswer } } : undefined,
    matches: data.matchingPairs?.length
      ? {
          create: data.matchingPairs.map((pair, index) => ({
            leftText: pair.leftText,
            leftImage: pair.leftImage,
            rightText: pair.rightText,
            rightImage: pair.rightImage,
            order: pair.order ?? index,
          })),
        }
      : undefined,
    orderingItems: data.orderingItems?.length
      ? {
          create: data.orderingItems,
        }
      : undefined,
    acceptedAnswers: data.acceptedAnswers?.length
      ? {
          create: data.acceptedAnswers.map((answer) => ({
            answer: answer.answer,
            isCaseSensitive: answer.isCaseSensitive ?? false,
          })),
        }
      : undefined,
    media: data.media?.length
      ? {
          create: data.media.map((media, index) => ({
            type: media.type,
            url: media.url,
            altText: media.altText,
            order: media.order ?? index,
          })),
        }
      : undefined,
    competencies: data.competencyIds?.length
      ? {
          create: data.competencyIds.map((competencyId) => ({
            competencyId,
          })),
        }
      : undefined,
    themes: data.themeIds?.length
      ? {
          create: data.themeIds.map((themeId) => ({
            themeId,
          })),
        }
      : undefined,
  };
}

function buildNestedUpdate(data: QuestionUpdateBody) {
  return {
    ...(data.gameLevelId !== undefined ? { gameLevelId: data.gameLevelId } : {}),
    ...(data.gameTypeId !== undefined ? { gameTypeId: data.gameTypeId } : {}),
    ...(data.text !== undefined ? { text: data.text } : {}),
    ...(data.image !== undefined ? { image: data.image } : {}),
    ...(data.audio !== undefined ? { audio: data.audio } : {}),
    ...(data.explanation !== undefined ? { explanation: data.explanation } : {}),
    ...(data.points !== undefined ? { points: data.points } : {}),
    ...(data.timeLimit !== undefined ? { timeLimit: data.timeLimit } : {}),
    ...(data.active !== undefined ? { active: data.active } : {}),
    ...(data.options
      ? {
          options: {
            deleteMany: {},
            create: data.options.map((option, index) => ({
              text: option.text,
              image: option.image,
              audio: option.audio,
              isCorrect: option.isCorrect ?? false,
              order: option.order ?? index,
            })),
          },
        }
      : {}),
    ...(data.trueFalseAnswer !== undefined
      ? {
          trueFalse: {
            upsert: {
              create: { answer: data.trueFalseAnswer },
              update: { answer: data.trueFalseAnswer },
            },
          },
        }
      : {}),
    ...(data.matchingPairs
      ? {
          matches: {
            deleteMany: {},
            create: data.matchingPairs.map((pair, index) => ({
              leftText: pair.leftText,
              leftImage: pair.leftImage,
              rightText: pair.rightText,
              rightImage: pair.rightImage,
              order: pair.order ?? index,
            })),
          },
        }
      : {}),
    ...(data.orderingItems
      ? {
          orderingItems: {
            deleteMany: {},
            create: data.orderingItems,
          },
        }
      : {}),
    ...(data.acceptedAnswers
      ? {
          acceptedAnswers: {
            deleteMany: {},
            create: data.acceptedAnswers.map((answer) => ({
              answer: answer.answer,
              isCaseSensitive: answer.isCaseSensitive ?? false,
            })),
          },
        }
      : {}),
    ...(data.media
      ? {
          media: {
            deleteMany: {},
            create: data.media.map((media, index) => ({
              type: media.type,
              url: media.url,
              altText: media.altText,
              order: media.order ?? index,
            })),
          },
        }
      : {}),
    ...(data.competencyIds
      ? {
          competencies: {
            deleteMany: {},
            create: data.competencyIds.map((competencyId) => ({
              competencyId,
            })),
          },
        }
      : {}),
    ...(data.themeIds
      ? {
          themes: {
            deleteMany: {},
            create: data.themeIds.map((themeId) => ({
              themeId,
            })),
          },
        }
      : {}),
  };
}

export const questionsService = {
  getAll: async (): Promise<PublicQuestion[]> => {
    const questions = await prisma.question.findMany({
      include: questionInclude,
      orderBy: {
        id: "asc",
      },
    });

    return questions.map(serializeQuestion);
  },

  getById: async (id: string): Promise<PublicQuestion | null> => {
    const questionId = Number(id);

    if (!Number.isInteger(questionId)) {
      return null;
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: questionInclude,
    });

    if (!question) {
      return null;
    }

    return serializeQuestion(question);
  },

  create: async (data: QuestionCreateBody): Promise<PublicQuestion> => {
    const question = await prisma.question.create({
      data: buildNestedCreate(data),
      include: questionInclude,
    });

    return serializeQuestion(question);
  },

  update: async (id: string, data: QuestionUpdateBody): Promise<PublicQuestion | null> => {
    const questionId = Number(id);

    if (!Number.isInteger(questionId)) {
      return null;
    }

    const existing = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!existing) {
      return null;
    }

    const question = await prisma.question.update({
      where: { id: questionId },
      data: buildNestedUpdate(data),
      include: questionInclude,
    });

    return serializeQuestion(question);
  },

  delete: async (id: string): Promise<PublicQuestion | null> => {
    const questionId = Number(id);

    if (!Number.isInteger(questionId)) {
      return null;
    }

    const existing = await prisma.question.findUnique({
      where: { id: questionId },
      include: questionInclude,
    });

    if (!existing) {
      return null;
    }

    await prisma.question.delete({
      where: { id: questionId },
    });

    return serializeQuestion(existing);
  },
};
