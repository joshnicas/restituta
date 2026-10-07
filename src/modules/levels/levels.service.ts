import prisma from "../../prisma";
import { normalizeLanguage, resolveLocalizedText } from "../localization/language";

export interface PublicLevel {
  id: string;
  gradeSubjectId: number;
  levelNumber: number;
  name: string;
  description?: string | null;
  difficulty: string;
  requiredPoints: number;
  timeLimit?: number | null;
  active: boolean;
  gradeSubject?: {
    grade: { id: number; name: string; code: string };
    subject: { id: number; name: string; code: string };
  };
  context?: {
    grade: { id: string; name: string; code: string };
    subject: { id: string; name: string; code: string };
  };
}

export interface PublicQuestionForGame {
  id: string;
  text: string;
  image?: string | null;
  audio?: string | null;
  explanation?: string | null;
  translationStatus: { EN: boolean; SW: boolean };
  points: number;
  timeLimit?: number | null;
  gameLevelId: number;
  topicId?: number | null;
  gameTypeId: number;
  gameType: {
    id: string;
    name: string;
    code: string;
  };
  topic?: {
    id: string;
    name: string;
  };
  options: Array<{
    id: string;
    text?: string | null;
    image?: string | null;
    translationStatus: { EN: boolean; SW: boolean };
  }>;
  context?: {
    grade: { id: string; name: string; code: string };
    subject: { id: string; name: string; code: string };
    topic: { id: string; name: string; code: string };
    level: { id: string; name: string; levelNumber: number };
  };
}

const levelInclude = {
  gradeSubject: {
    include: {
      grade: true,
      subject: true,
    },
  },
};

type LevelWithContext = {
  id: number;
  gradeSubjectId: number;
  levelNumber: number;
  name: string;
  description: string | null;
  difficulty: string;
  requiredPoints: number;
  timeLimit: number | null;
  active: boolean;
  gradeSubject?: {
    grade: { id: number; name: string; code: string };
    subject: { id: number; name: string; code: string };
  };
};

function mapByLanguage<T extends { language: string }>(items: T[] | undefined): Partial<Record<"EN" | "SW", T>> {
  const result: Partial<Record<"EN" | "SW", T>> = {};

  for (const item of items ?? []) {
    result[normalizeLanguage(item.language)] = item;
  }

  return result;
}

function serializeLevel(level: LevelWithContext): PublicLevel {
  const gradeSubject = level.gradeSubject
    ? {
        grade: {
          id: level.gradeSubject.grade.id,
          name: level.gradeSubject.grade.name,
          code: level.gradeSubject.grade.code,
        },
        subject: {
          id: level.gradeSubject.subject.id,
          name: level.gradeSubject.subject.name,
          code: level.gradeSubject.subject.code,
        },
      }
    : undefined;

  return {
    id: level.id.toString(),
    gradeSubjectId: level.gradeSubjectId,
    levelNumber: level.levelNumber,
    name: level.name,
    description: level.description,
    difficulty: level.difficulty,
    requiredPoints: level.requiredPoints,
    timeLimit: level.timeLimit,
    active: level.active,
    gradeSubject,
    context: gradeSubject
      ? {
          grade: {
            id: gradeSubject.grade.id.toString(),
            name: gradeSubject.grade.name,
            code: gradeSubject.grade.code,
          },
          subject: {
            id: gradeSubject.subject.id.toString(),
            name: gradeSubject.subject.name,
            code: gradeSubject.subject.code,
          },
        }
      : undefined,
  };
}

export const levelsService = {
  getAll: async (): Promise<PublicLevel[]> => {
    const levels = await prisma.gameLevel.findMany({
      include: levelInclude,
      orderBy: {
        id: "asc",
      },
    });

    return levels.map(serializeLevel);
  },

  getById: async (id: string): Promise<PublicLevel | null> => {
    const levelId = Number(id);

    if (!Number.isInteger(levelId)) {
      return null;
    }

    const level = await prisma.gameLevel.findUnique({
      where: { id: levelId },
      include: levelInclude,
    });

    if (!level) {
      return null;
    }

    return serializeLevel(level);
  },

  create: async (data: {
    gradeSubjectId: number;
    levelNumber: number;
    name?: string;
    description?: string | null;
    difficulty?: "EASY" | "MEDIUM" | "HARD" | "EXPERT";
    requiredPoints?: number;
    timeLimit?: number | null;
    active?: boolean;
  }): Promise<PublicLevel> => {
    const level = await prisma.gameLevel.create({
      data: {
        ...data,
        name: data.name ?? `Level ${data.levelNumber}`,
      },
      include: levelInclude,
    });

    return serializeLevel(level);
  },

  update: async (
    id: string,
    data: {
      gradeSubjectId?: number;
      levelNumber?: number;
      name?: string;
      description?: string | null;
      difficulty?: "EASY" | "MEDIUM" | "HARD" | "EXPERT";
      requiredPoints?: number;
      timeLimit?: number | null;
      active?: boolean;
    },
  ): Promise<PublicLevel | null> => {
    const levelId = Number(id);

    if (!Number.isInteger(levelId)) {
      return null;
    }

    const existing = await prisma.gameLevel.findUnique({
      where: { id: levelId },
    });

    if (!existing) {
      return null;
    }

    const level = await prisma.gameLevel.update({
      where: { id: levelId },
      data,
      include: levelInclude,
    });

    return serializeLevel(level);
  },

  delete: async (id: string): Promise<PublicLevel | null> => {
    const levelId = Number(id);

    if (!Number.isInteger(levelId)) {
      return null;
    }

    const existing = await prisma.gameLevel.findUnique({
      where: { id: levelId },
    });

    if (!existing) {
      return null;
    }

    const level = await prisma.gameLevel.delete({
      where: { id: levelId },
    });

    return serializeLevel(level);
  },

  getQuestionsByLevelId: async (
    id: string,
    filters?: { topicId?: number; gameTypeId?: number; language?: unknown },
  ): Promise<{ level: { id: string; levelNumber: number; name: string }; questions: PublicQuestionForGame[]; count: number } | null> => {
    const levelId = Number(id);

    if (!Number.isInteger(levelId)) {
      return null;
    }

    const level = await prisma.gameLevel.findUnique({
      where: { id: levelId },
    });

    if (!level) {
      return null;
    }

    const language = normalizeLanguage(filters?.language ?? "EN");

    const questions = await prisma.question.findMany({
      where: {
        gameLevelId: levelId,
        active: true,
        ...(filters?.topicId !== undefined ? { topicId: filters.topicId } : {}),
        ...(filters?.gameTypeId !== undefined ? { gameTypeId: filters.gameTypeId } : {}),
      },
      include: {
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
        translations: true,
        options: {
          select: {
            id: true,
            text: true,
            image: true,
            audio: true,
            isCorrect: true,
            order: true,
            translations: true,
          },
          orderBy: {
            order: "asc",
          },
        },
        trueFalse: true,
        matches: {
          include: { translations: true },
          orderBy: {
            order: "asc",
          },
        },
        orderingItems: {
          include: { translations: true },
          orderBy: {
            correctOrder: "asc",
          },
        },
        acceptedAnswers: true,
        media: {
          orderBy: {
            order: "asc",
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    const publicQuestions: PublicQuestionForGame[] = questions.map((q) => {
      const translationsByLanguage = mapByLanguage(q.translations ?? []);
      const text = resolveLocalizedText(language, {
        EN: translationsByLanguage.EN?.text ?? q.text,
        SW: translationsByLanguage.SW?.text ?? translationsByLanguage.EN?.text ?? q.text,
      }, q.text) ?? q.text;
      const explanation = resolveLocalizedText(language, {
        EN: translationsByLanguage.EN?.explanation ?? q.explanation ?? undefined,
        SW: translationsByLanguage.SW?.explanation ?? translationsByLanguage.EN?.explanation ?? q.explanation ?? undefined,
      }, q.explanation ?? null);

      return {
        id: q.id.toString(),
        text,
        translationStatus: {
          EN: Boolean(translationsByLanguage.EN?.text?.trim() ?? q.text?.trim()),
          SW: Boolean(translationsByLanguage.SW?.text?.trim()),
        },
        image: q.image,
        audio: q.audio,
        explanation,
        points: q.points,
        timeLimit: q.timeLimit,
        gameLevelId: q.gameLevelId,
        topicId: q.topicId,
        gameTypeId: q.gameTypeId,
        gameType: {
          id: q.gameType.id.toString(),
          name: q.gameType.name,
          code: q.gameType.code,
        },
        topic: q.topic
          ? {
              id: q.topic.id.toString(),
              name: q.topic.name,
            }
          : undefined,
        options: q.options.map((opt) => {
          const optionTranslationsByLanguage = mapByLanguage(opt.translations ?? []);
          return {
            id: opt.id.toString(),
            text: resolveLocalizedText(language, {
              EN: optionTranslationsByLanguage.EN?.text ?? opt.text ?? undefined,
              SW: optionTranslationsByLanguage.SW?.text ?? optionTranslationsByLanguage.EN?.text ?? opt.text ?? undefined,
            }, opt.text ?? null) ?? opt.text ?? null,
            image: opt.image,
            audio: opt.audio,
            isCorrect: opt.isCorrect,
            order: opt.order,
            translationStatus: {
              EN: Boolean(optionTranslationsByLanguage.EN?.text?.trim() ?? opt.text?.trim()),
              SW: Boolean(optionTranslationsByLanguage.SW?.text?.trim()),
            },
          };
        }),
        trueFalseAnswer: q.trueFalse?.answer ?? null,
        matchingPairs: q.matches.map((pair) => {
          const updatedTranslationsByLanguage = mapByLanguage(pair.translations ?? []);
          return {
            id: pair.id.toString(),
            leftText: resolveLocalizedText(language, {
              EN: updatedTranslationsByLanguage.EN?.leftText ?? pair.leftText ?? undefined,
              SW: updatedTranslationsByLanguage.SW?.leftText ?? updatedTranslationsByLanguage.EN?.leftText ?? pair.leftText ?? undefined,
            }, pair.leftText ?? null) ?? pair.leftText ?? null,
            leftImage: pair.leftImage,
            rightText: resolveLocalizedText(language, {
              EN: updatedTranslationsByLanguage.EN?.rightText ?? pair.rightText ?? undefined,
              SW: updatedTranslationsByLanguage.SW?.rightText ?? updatedTranslationsByLanguage.EN?.rightText ?? pair.rightText ?? undefined,
            }, pair.rightText ?? null) ?? pair.rightText ?? null,
            rightImage: pair.rightImage,
            order: pair.order,
            translationStatus: {
              EN: Boolean(updatedTranslationsByLanguage.EN?.leftText?.trim() ?? pair.leftText?.trim()) && Boolean(updatedTranslationsByLanguage.EN?.rightText?.trim() ?? pair.rightText?.trim()),
              SW: Boolean(updatedTranslationsByLanguage.SW?.leftText?.trim()) && Boolean(updatedTranslationsByLanguage.SW?.rightText?.trim()),
            },
          };
        }),
        orderingItems: q.orderingItems.map((item) => {
          const orderingTranslationsByLanguage = mapByLanguage(item.translations ?? []);
          return {
            id: item.id.toString(),
            text: resolveLocalizedText(language, {
              EN: orderingTranslationsByLanguage.EN?.text ?? item.text ?? undefined,
              SW: orderingTranslationsByLanguage.SW?.text ?? orderingTranslationsByLanguage.EN?.text ?? item.text ?? undefined,
            }, item.text ?? null) ?? item.text ?? null,
            image: item.image,
            correctOrder: item.correctOrder,
            translationStatus: {
              EN: Boolean(orderingTranslationsByLanguage.EN?.text?.trim() ?? item.text?.trim()),
              SW: Boolean(orderingTranslationsByLanguage.SW?.text?.trim()),
            },
          };
        }),
        acceptedAnswers: (language === "SW"
          ? q.acceptedAnswers.filter((answer) => normalizeLanguage(answer.language) === "SW")
          : q.acceptedAnswers.filter((answer) => normalizeLanguage(answer.language) === "EN")
        ).map((answer) => ({
          id: answer.id.toString(),
          answer: answer.answer,
          isCaseSensitive: answer.isCaseSensitive,
          language: answer.language,
        })),
        media: q.media.map((media) => ({
          id: media.id.toString(),
          type: media.type,
          url: media.url,
          altText: media.altText,
          order: media.order,
        })),
        context: q.gameLevel?.gradeSubject
          ? {
              grade: {
                id: q.gameLevel.gradeSubject.grade.id.toString(),
                name: q.gameLevel.gradeSubject.grade.name,
                code: q.gameLevel.gradeSubject.grade.code,
              },
              subject: {
                id: q.gameLevel.gradeSubject.subject.id.toString(),
                name: q.gameLevel.gradeSubject.subject.name,
                code: q.gameLevel.gradeSubject.subject.code,
              },
              topic: q.topic
                ? {
                    id: q.topic.id.toString(),
                    name: q.topic.name,
                    code: q.topic.code,
                  }
                : {
                    id: "unknown",
                    name: "Unknown Topic",
                    code: "UNKNOWN",
                  },
              level: {
                id: q.gameLevel.id.toString(),
                name: q.gameLevel.name,
                levelNumber: q.gameLevel.levelNumber,
              },
            }
          : undefined,
      };
    });

    return {
      level: {
        id: level.id.toString(),
        levelNumber: level.levelNumber,
        name: level.name,
      },
      questions: publicQuestions,
      count: publicQuestions.length,
    };
  },
};
