import prisma from "../../prisma";

export interface PublicTopic {
  id: string;
  subjectId: number;
  name: string;
  code: string;
  description?: string | null;
  active: boolean;
  gradeSubjectTopics?: Array<{
    id: string;
    gradeSubjectId: number;
    gradeSubject: {
      id: string;
      grade: { id: string; name: string; code: string };
      subject: { id: string; name: string; code: string };
    };
  }>;
}

export interface PublicQuestionForGame {
  id: string;
  text: string;
  image?: string | null;
  audio?: string | null;
  explanation?: string | null;
  points: number;
  timeLimit?: number | null;
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
  }>;
}

function toCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function serializeTopic(topic: {
  id: number;
  subjectId: number;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
  gradeSubjectTopics?: Array<{
    id: number;
    gradeSubjectId: number;
    gradeSubject: {
      id: number;
      grade: { id: number; name: string; code: string };
      subject: { id: number; name: string; code: string };
    };
  }>;
}): PublicTopic {
  return {
    id: topic.id.toString(),
    subjectId: topic.subjectId,
    name: topic.name,
    code: topic.code,
    description: topic.description,
    active: topic.active,
    gradeSubjectTopics: topic.gradeSubjectTopics?.map((placement) => ({
      id: placement.id.toString(),
      gradeSubjectId: placement.gradeSubjectId,
      gradeSubject: {
        id: placement.gradeSubject.id.toString(),
        grade: {
          id: placement.gradeSubject.grade.id.toString(),
          name: placement.gradeSubject.grade.name,
          code: placement.gradeSubject.grade.code,
        },
        subject: {
          id: placement.gradeSubject.subject.id.toString(),
          name: placement.gradeSubject.subject.name,
          code: placement.gradeSubject.subject.code,
        },
      },
    })),
  };
}

export const topicsService = {
  getAll: async (): Promise<PublicTopic[]> => {
    const topics = await prisma.topic.findMany({
      include: {
        gradeSubjectTopics: {
          include: {
            gradeSubject: {
              include: {
                grade: true,
                subject: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    return topics.map(serializeTopic);
  },

  getById: async (id: string): Promise<PublicTopic | null> => {
    const topicId = Number(id);

    if (!Number.isInteger(topicId)) {
      return null;
    }

    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        gradeSubjectTopics: {
          include: {
            gradeSubject: {
              include: {
                grade: true,
                subject: true,
              },
            },
          },
        },
      },
    });

    if (!topic) {
      return null;
    }

    return serializeTopic(topic);
  },

  create: async (data: {
    subjectId: number;
    name: string;
    code?: string;
    description?: string | null;
    active?: boolean;
    gradeSubjectIds?: number[];
  }): Promise<PublicTopic> => {
    const { gradeSubjectIds, ...topicData } = data;
    const topic = await prisma.topic.create({
      data: {
        ...topicData,
        code: toCode(topicData.code ?? topicData.name),
        gradeSubjectTopics: gradeSubjectIds?.length
          ? {
              create: gradeSubjectIds.map((gradeSubjectId) => ({
                gradeSubjectId,
              })),
            }
          : undefined,
      },
      include: {
        gradeSubjectTopics: {
          include: {
            gradeSubject: {
              include: {
                grade: true,
                subject: true,
              },
            },
          },
        },
      },
    });

    return serializeTopic(topic);
  },

  update: async (
    id: string,
    data: {
      subjectId?: number;
      name?: string;
      code?: string;
      description?: string | null;
      active?: boolean;
      gradeSubjectIds?: number[];
    },
  ): Promise<PublicTopic | null> => {
    const topicId = Number(id);

    if (!Number.isInteger(topicId)) {
      return null;
    }

    const existing = await prisma.topic.findUnique({
      where: { id: topicId },
    });

    if (!existing) {
      return null;
    }

    const { gradeSubjectIds, ...topicData } = data;

    const topic = await prisma.topic.update({
      where: { id: topicId },
      data: {
        ...topicData,
        ...(topicData.code ? { code: toCode(topicData.code) } : {}),
        ...(gradeSubjectIds
          ? {
              gradeSubjectTopics: {
                deleteMany: {},
                create: gradeSubjectIds.map((gradeSubjectId) => ({
                  gradeSubjectId,
                })),
              },
            }
          : {}),
      },
      include: {
        gradeSubjectTopics: {
          include: {
            gradeSubject: {
              include: {
                grade: true,
                subject: true,
              },
            },
          },
        },
      },
    });

    return serializeTopic(topic);
  },

  delete: async (id: string): Promise<PublicTopic | null> => {
    const topicId = Number(id);

    if (!Number.isInteger(topicId)) {
      return null;
    }

    const existing = await prisma.topic.findUnique({
      where: { id: topicId },
    });

    if (!existing) {
      return null;
    }

    const topic = await prisma.topic.delete({
      where: { id: topicId },
    });

    return serializeTopic(topic);
  },

  getQuestionsByTopicId: async (id: string): Promise<{ topic: { id: string; name: string }; questions: PublicQuestionForGame[]; count: number } | null> => {
    const topicId = Number(id);

    if (!Number.isInteger(topicId)) {
      return null;
    }

    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      return null;
    }

    const questions = await prisma.question.findMany({
      where: {
        topicId: topicId,
      },
      include: {
        gameType: true,
        topic: true,
        options: {
          select: {
            id: true,
            text: true,
            image: true,
          },
          orderBy: {
            order: "asc",
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    const publicQuestions: PublicQuestionForGame[] = questions.map((q) => ({
      id: q.id.toString(),
      text: q.text,
      image: q.image,
      audio: q.audio,
      explanation: q.explanation,
      points: q.points,
      timeLimit: q.timeLimit,
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
      options: q.options.map((opt) => ({
        id: opt.id.toString(),
        text: opt.text,
        image: opt.image,
      })),
    }));

    return {
      topic: {
        id: topic.id.toString(),
        name: topic.name,
      },
      questions: publicQuestions,
      count: publicQuestions.length,
    };
  },
};
