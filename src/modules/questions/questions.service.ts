import prisma from "../../prisma";
import { normalizeLanguage, resolveLocalizedText } from "../localization/language";
import type { QuestionCreateBody, QuestionUpdateBody } from "./questions.schema";

export interface PublicQuestion {
  id: string;
  gameLevelId: number;
  topicId?: number | null;
  gameTypeId: number;
  text: string;
  image?: string | null;
  audio?: string | null;
  explanation?: string | null;
  points: number;
  timeLimit?: number | null;
  active: boolean;
  translationStatus: { EN: boolean; SW: boolean };
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
    translationStatus: { EN: boolean; SW: boolean };
  }>;
  trueFalseAnswer?: boolean | null;
  matchingPairs: Array<{
    id: string;
    leftText?: string | null;
    leftImage?: string | null;
    rightText?: string | null;
    rightImage?: string | null;
    order: number;
    translationStatus: { EN: boolean; SW: boolean };
  }>;
  orderingItems: Array<{
    id: string;
    text?: string | null;
    image?: string | null;
    correctOrder: number;
    translationStatus: { EN: boolean; SW: boolean };
  }>;
  acceptedAnswers: Array<{
    id: string;
    answer: string;
    isCaseSensitive: boolean;
    language: string;
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
  translations: true,
  options: {
    orderBy: { order: "asc" as const },
    include: { translations: true },
  },
  trueFalse: true,
  matches: {
    orderBy: { order: "asc" as const },
    include: { translations: true },
  },
  orderingItems: {
    orderBy: { correctOrder: "asc" as const },
    include: { translations: true },
  },
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
  translations?: Array<{ id: number; questionId: number; language: string; text: string; explanation: string | null }>;
  options?: Array<{
    id: number;
    text: string | null;
    image: string | null;
    audio: string | null;
    isCorrect: boolean;
    order: number;
    translations?: Array<{ id: number; questionOptionId: number; language: string; text: string | null }>;
  }>;
  trueFalse?: { answer: boolean } | null;
  matches?: Array<{
    id: number;
    leftText: string | null;
    leftImage: string | null;
    rightText: string | null;
    rightImage: string | null;
    order: number;
    translations?: Array<{ id: number; questionMatchPairId: number; language: string; leftText: string | null; rightText: string | null }>;
  }>;
  orderingItems?: Array<{
    id: number;
    text: string | null;
    image: string | null;
    correctOrder: number;
    translations?: Array<{ id: number; questionOrderingItemId: number; language: string; text: string | null }>;
  }>;
  acceptedAnswers?: Array<{
    id: number;
    answer: string;
    isCaseSensitive: boolean;
    language?: string;
  }>;
  media?: Array<{
    id: number;
    type: string;
    url: string;
    altText: string | null;
    order: number;
  }>;
};

function getPreferredAcceptedAnswers(acceptedAnswers: QuestionWithRelations["acceptedAnswers"], language: unknown) {
  const requested = normalizeLanguage(language);
  const answers = acceptedAnswers ?? [];

  if (requested === "SW") {
    const swAnswers = answers.filter((answer) => normalizeLanguage(answer?.language) === "SW");
    if (swAnswers.length > 0) {
      return swAnswers;
    }
  }

  return answers.filter((answer) => normalizeLanguage(answer?.language) === "EN");
}

function serializeQuestion(question: QuestionWithRelations, language: unknown = "EN"): PublicQuestion {
  if (!question) {
    throw new Error("Question not found.");
  }

  const requestedLanguage = normalizeLanguage(language);
  const translationsByLanguage = Object.fromEntries(
    (question.translations ?? []).map((translation) => [normalizeLanguage(translation.language), translation]),
  ) as Record<string, { text: string; explanation: string | null } | undefined>;

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
    topicId: question.topicId,
    gameTypeId: question.gameTypeId,
    text: resolveLocalizedText(requestedLanguage, {
      EN: translationsByLanguage.EN?.text ?? question.text,
      SW: translationsByLanguage.SW?.text ?? translationsByLanguage.EN?.text ?? question.text,
    }, question.text) ?? question.text,
    image: question.image,
    audio: question.audio,
    explanation: resolveLocalizedText(requestedLanguage, {
      EN: translationsByLanguage.EN?.explanation ?? question.explanation ?? undefined,
      SW: translationsByLanguage.SW?.explanation ?? translationsByLanguage.EN?.explanation ?? question.explanation ?? undefined,
    }, question.explanation ?? null),
    points: question.points,
    timeLimit: question.timeLimit,
    active: question.active,
    translationStatus: {
      EN: true,
      SW: Boolean(translationsByLanguage.SW?.text?.trim()),
    },
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
    options: (question.options ?? []).map((option) => {
      const optionTranslationsByLanguage = Object.fromEntries(
        (option.translations ?? []).map((translation) => [normalizeLanguage(translation.language), translation]),
      ) as Record<string, { text: string | null } | undefined>;

      return {
        id: option.id.toString(),
        text: resolveLocalizedText(requestedLanguage, {
          EN: optionTranslationsByLanguage.EN?.text ?? option.text ?? undefined,
          SW: optionTranslationsByLanguage.SW?.text ?? optionTranslationsByLanguage.EN?.text ?? option.text ?? undefined,
        }, option.text ?? null) ?? option.text ?? null,
        image: option.image,
        audio: option.audio,
        isCorrect: option.isCorrect,
        order: option.order,
        translationStatus: {
          EN: Boolean(optionTranslationsByLanguage.EN?.text?.trim() || option.text?.trim()),
          SW: Boolean(optionTranslationsByLanguage.SW?.text?.trim()),
        },
      };
    }),
    trueFalseAnswer: question.trueFalse?.answer ?? null,
    matchingPairs: (question.matches ?? []).map((pair) => {
      const pairTranslationsByLanguage = Object.fromEntries(
        (pair.translations ?? []).map((translation) => [normalizeLanguage(translation.language), translation]),
      ) as Record<string, { leftText: string | null; rightText: string | null } | undefined>;

      return {
        id: pair.id.toString(),
        leftText: resolveLocalizedText(requestedLanguage, {
          EN: pairTranslationsByLanguage.EN?.leftText ?? pair.leftText ?? undefined,
          SW: pairTranslationsByLanguage.SW?.leftText ?? pairTranslationsByLanguage.EN?.leftText ?? pair.leftText ?? undefined,
        }, pair.leftText ?? null) ?? pair.leftText ?? null,
        leftImage: pair.leftImage,
        rightText: resolveLocalizedText(requestedLanguage, {
          EN: pairTranslationsByLanguage.EN?.rightText ?? pair.rightText ?? undefined,
          SW: pairTranslationsByLanguage.SW?.rightText ?? pairTranslationsByLanguage.EN?.rightText ?? pair.rightText ?? undefined,
        }, pair.rightText ?? null) ?? pair.rightText ?? null,
        rightImage: pair.rightImage,
        order: pair.order,
        translationStatus: {
          EN: Boolean((pairTranslationsByLanguage.EN?.leftText?.trim() || pair.leftText?.trim() || pair.leftImage) && (pairTranslationsByLanguage.EN?.rightText?.trim() || pair.rightText?.trim() || pair.rightImage)),
          SW: Boolean((pair.leftImage || pair.leftText == null || pairTranslationsByLanguage.SW?.leftText?.trim()) && (pair.rightImage || pair.rightText == null || pairTranslationsByLanguage.SW?.rightText?.trim())),
        },
      };
    }),
    orderingItems: (question.orderingItems ?? []).map((item) => {
      const orderingTranslationsByLanguage = Object.fromEntries(
        (item.translations ?? []).map((translation) => [normalizeLanguage(translation.language), translation]),
      ) as Record<string, { text: string | null } | undefined>;

      return {
        id: item.id.toString(),
        text: resolveLocalizedText(requestedLanguage, {
          EN: orderingTranslationsByLanguage.EN?.text ?? item.text ?? undefined,
          SW: orderingTranslationsByLanguage.SW?.text ?? orderingTranslationsByLanguage.EN?.text ?? item.text ?? undefined,
        }, item.text ?? null) ?? item.text ?? null,
        image: item.image,
        correctOrder: item.correctOrder,
        translationStatus: {
          EN: Boolean(orderingTranslationsByLanguage.EN?.text?.trim() || item.text?.trim() || item.image),
          SW: Boolean(item.image || orderingTranslationsByLanguage.SW?.text?.trim()),
        },
      };
    }),
    acceptedAnswers: getPreferredAcceptedAnswers(question.acceptedAnswers, requestedLanguage).map((answer) => ({
      id: answer.id.toString(),
      answer: answer.answer,
      isCaseSensitive: answer.isCaseSensitive,
      language: answer.language ?? "EN",
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

function buildTranslationCreateEntries<T extends Record<string, { text?: string; explanation?: string | null } | undefined>>(translations: T | undefined) {
  const entries: Array<{ language: "EN" | "SW"; text?: string; explanation?: string | null }> = [];

  for (const language of ["EN", "SW"] as const) {
    const item = translations?.[language];
    if (!item) {
      continue;
    }

    entries.push({
      language,
      ...(item.text !== undefined ? { text: item.text } : {}),
      ...(item.explanation !== undefined ? { explanation: item.explanation } : {}),
    });
  }

  return entries;
}

function buildNestedCreate(data: QuestionCreateBody) {
  return {
    gameLevelId: data.gameLevelId,
    topicId: data.topicId,
    gameTypeId: data.gameTypeId,
    text: data.text,
    explanation: data.explanation,
    ...(data.translations
      ? {
          translations: {
            create: buildTranslationCreateEntries(data.translations) as any,
          },
        }
      : {}),
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
            ...(option.translations
              ? {
                  translations: {
                    create: buildTranslationCreateEntries(option.translations) as any,
                  },
                }
              : {}),
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
            ...(pair.translations
              ? {
                  translations: {
                    create: (Object.entries(pair.translations) as Array<["EN" | "SW", { leftText?: string | null; rightText?: string | null } | undefined]>).flatMap(([language, value]) => value ? [{ language, ...(value.leftText !== undefined ? { leftText: value.leftText } : {}), ...(value.rightText !== undefined ? { rightText: value.rightText } : {}) }] : []) as any,
                  },
                }
              : {}),
          })),
        }
      : undefined,
    orderingItems: data.orderingItems?.length
      ? {
          create: data.orderingItems.map((item) => ({
            text: item.text,
            image: item.image,
            correctOrder: item.correctOrder,
            ...(item.translations
              ? {
                  translations: {
                    create: (Object.entries(item.translations) as Array<["EN" | "SW", { text?: string } | undefined]>).flatMap(([language, value]) => value?.text !== undefined ? [{ language, text: value.text }] : []) as any,
                  },
                }
              : {}),
          })),
        }
      : undefined,
    acceptedAnswers: data.acceptedAnswers?.length
      ? {
          create: data.acceptedAnswers.map((answer) => ({
            answer: answer.answer,
            language: answer.language ?? "EN",
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

function buildNestedUpdate(data: QuestionUpdateBody, questionId: number) {
  const questionTranslationUpserts = data.translations
    ? (Object.entries(data.translations) as Array<["EN" | "SW", { text?: string; explanation?: string | null } | undefined]>)
        .flatMap(([language, value]) => value && value.text !== undefined ? [{
          where: { questionId_language: { questionId, language } },
          create: { language, text: value.text, explanation: value.explanation ?? null },
          update: { text: value.text, ...(value.explanation !== undefined ? { explanation: value.explanation } : {}) },
        }] : [])
    : [];
  const textTranslations = (translations: Record<string, { text?: string | null } | undefined> | undefined, childId: number, relationId: "questionOptionId" | "questionOrderingItemId") =>
    (Object.entries(translations ?? {}) as Array<["EN" | "SW", { text?: string | null } | undefined]>)
      .flatMap(([language, value]) => value?.text !== undefined ? [{
        where: { [`${relationId}_language`]: { [relationId]: childId, language } },
        create: { language, text: value.text },
        update: { text: value.text },
      }] : []);
  return {
    ...(questionTranslationUpserts.length ? { translations: { upsert: questionTranslationUpserts } } : {}),
    ...(data.gameLevelId !== undefined ? { gameLevelId: data.gameLevelId } : {}),
    ...(data.topicId !== undefined ? { topicId: data.topicId } : {}),
    ...(data.gameTypeId !== undefined ? { gameTypeId: data.gameTypeId } : {}),
    ...(data.text !== undefined ? { text: data.text } : {}),
    ...(data.explanation !== undefined ? { explanation: data.explanation } : {}),
    ...(data.points !== undefined ? { points: data.points } : {}),
    ...(data.timeLimit !== undefined ? { timeLimit: data.timeLimit } : {}),
    ...(data.active !== undefined ? { active: data.active } : {}),
    ...(data.options
      ? data.options.every((option) => option.id !== undefined)
        ? { options: { update: data.options.map((option) => ({
            where: { id: Number(option.id) },
            data: {
              ...(option.text !== undefined ? { text: option.text } : {}),
              ...(option.image !== undefined ? { image: option.image } : {}),
              ...(option.audio !== undefined ? { audio: option.audio } : {}),
              ...(option.isCorrect !== undefined ? { isCorrect: option.isCorrect } : {}),
              ...(option.order !== undefined ? { order: option.order } : {}),
              ...(option.translations ? { translations: { upsert: (Object.entries(option.translations) as Array<["EN" | "SW", { text?: string } | undefined]>).flatMap(([language, value]) => value?.text !== undefined ? [{ where: { questionOptionId_language: { questionOptionId: Number(option.id), language } }, create: { language, text: value.text }, update: { text: value.text } }] : []) } } : {}),
            },
          })) } }
        : { options: { deleteMany: {}, create: data.options.map((option, index) => ({
            text: option.text, image: option.image, audio: option.audio,
            isCorrect: option.isCorrect ?? false, order: option.order ?? index,
            ...(option.translations ? { translations: { create: buildTranslationCreateEntries(option.translations) as any } } : {}),
          })) } }
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
      ? data.matchingPairs.every((pair) => pair.id !== undefined)
        ? { matches: { update: data.matchingPairs.map((pair) => ({
            where: { id: Number(pair.id) },
            data: {
              ...(pair.leftText !== undefined ? { leftText: pair.leftText } : {}),
              ...(pair.leftImage !== undefined ? { leftImage: pair.leftImage } : {}),
              ...(pair.rightText !== undefined ? { rightText: pair.rightText } : {}),
              ...(pair.rightImage !== undefined ? { rightImage: pair.rightImage } : {}),
              ...(pair.order !== undefined ? { order: pair.order } : {}),
              ...(pair.translations ? { translations: { upsert: (Object.entries(pair.translations) as Array<["EN" | "SW", { leftText?: string | null; rightText?: string | null } | undefined]>).flatMap(([language, value]) => value ? [{ where: { questionMatchPairId_language: { questionMatchPairId: Number(pair.id), language } }, create: { language, leftText: value.leftText ?? null, rightText: value.rightText ?? null }, update: { leftText: value.leftText ?? null, rightText: value.rightText ?? null } }] : []) } } : {}),
            },
          })) } }
        : { matches: { deleteMany: {}, create: data.matchingPairs.map((pair, index) => ({
            leftText: pair.leftText, leftImage: pair.leftImage, rightText: pair.rightText, rightImage: pair.rightImage,
            order: pair.order ?? index,
            ...(pair.translations ? { translations: { create: (Object.entries(pair.translations) as Array<["EN" | "SW", { leftText?: string | null; rightText?: string | null } | undefined]>).flatMap(([language, value]) => value ? [{ language, ...(value.leftText !== undefined ? { leftText: value.leftText } : {}), ...(value.rightText !== undefined ? { rightText: value.rightText } : {}) }] : []) as any } } : {}),
          })) } }
      : {}),
    ...(data.orderingItems
      ? data.orderingItems.every((item) => item.id !== undefined)
        ? { orderingItems: { update: data.orderingItems.map((item) => ({
            where: { id: Number(item.id) },
            data: {
              ...(item.text !== undefined ? { text: item.text } : {}),
              ...(item.image !== undefined ? { image: item.image } : {}),
              ...(item.correctOrder !== undefined ? { correctOrder: item.correctOrder } : {}),
              ...(item.translations ? { translations: { upsert: textTranslations(item.translations, Number(item.id), "questionOrderingItemId") } } : {}),
            },
          })) } }
        : { orderingItems: { deleteMany: {}, create: data.orderingItems.map((item) => ({
            text: item.text, image: item.image, correctOrder: item.correctOrder,
            ...(item.translations ? { translations: { create: (Object.entries(item.translations) as Array<["EN" | "SW", { text?: string } | undefined]>).flatMap(([language, value]) => value?.text !== undefined ? [{ language, text: value.text }] : []) as any } } : {}),
          })) } }
      : {}),
    ...(data.acceptedAnswers
      ? data.acceptedAnswers.every((answer) => answer.id !== undefined)
        ? { acceptedAnswers: { update: data.acceptedAnswers.map((answer) => ({
            where: { id: Number(answer.id) },
            data: {
              answer: answer.answer,
              language: answer.language ?? "EN",
              isCaseSensitive: answer.isCaseSensitive ?? false,
            },
          })) } }
        : { acceptedAnswers: {
            deleteMany: {},
            create: data.acceptedAnswers.map((answer) => ({
              answer: answer.answer,
              language: answer.language ?? "EN",
              isCaseSensitive: answer.isCaseSensitive ?? false,
            })),
          } }
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
  getAll: async ({ page = 1, limit = 20, language = "EN" }: { page?: number; limit?: number; language?: unknown } = {}): Promise<{
    questions: PublicQuestion[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> => {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);
    const skip = (safePage - 1) * safeLimit;

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        include: questionInclude,
        orderBy: {
          id: "asc",
        },
        skip,
        take: safeLimit,
      }),
      prisma.question.count(),
    ]);

    return {
      questions: questions.map((question) => serializeQuestion(question, language)),
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  },

  getById: async (id: string, language: unknown = "EN"): Promise<PublicQuestion | null> => {
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

    return serializeQuestion(question, language);
  },

  create: async (data: QuestionCreateBody): Promise<PublicQuestion> => {
    const question = await prisma.question.create({
      data: buildNestedCreate(data),
      include: questionInclude,
    });

    return serializeQuestion(question, "EN");
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
      data: buildNestedUpdate(data, questionId),
      include: questionInclude,
    });

    return serializeQuestion(question, "EN");
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

    return serializeQuestion(existing, "EN");
  },
};
