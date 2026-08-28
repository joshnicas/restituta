import prisma from "../../prisma";

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

  getQuestionsByLevelId: async (id: string): Promise<{ level: { id: string; levelNumber: number; name: string }; questions: PublicQuestionForGame[]; count: number } | null> => {
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

    const questions = await prisma.question.findMany({
      where: {
        gameLevelId: levelId,
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
