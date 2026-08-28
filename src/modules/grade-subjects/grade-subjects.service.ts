import prisma from "../../prisma";

export interface PublicGradeSubject {
  id: string;
  gradeId: number;
  subjectId: number;
  active: boolean;
  grade?: {
    id: string;
    name: string;
    code: string;
  };
  subject?: {
    id: string;
    name: string;
    code: string;
    icon?: string | null;
    description?: string | null;
  };
}

export interface PublicTopic {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  active: boolean;
}

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
}

const gradeSubjectInclude = {
  grade: true,
  subject: true,
};

function serializeGradeSubject(gradeSubject: {
  id: number;
  gradeId: number;
  subjectId: number;
  active: boolean;
  grade?: { id: number; name: string; code: string };
  subject?: { id: number; name: string; code: string; icon?: string | null; description?: string | null };
}): PublicGradeSubject {
  return {
    id: gradeSubject.id.toString(),
    gradeId: gradeSubject.gradeId,
    subjectId: gradeSubject.subjectId,
    active: gradeSubject.active,
    grade: gradeSubject.grade
      ? {
          id: gradeSubject.grade.id.toString(),
          name: gradeSubject.grade.name,
          code: gradeSubject.grade.code,
        }
      : undefined,
    subject: gradeSubject.subject
      ? {
          id: gradeSubject.subject.id.toString(),
          name: gradeSubject.subject.name,
          code: gradeSubject.subject.code,
          icon: gradeSubject.subject.icon,
          description: gradeSubject.subject.description,
        }
      : undefined,
  };
}

function serializeTopic(topic: {
  id: number;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
}): PublicTopic {
  return {
    id: topic.id.toString(),
    name: topic.name,
    code: topic.code,
    description: topic.description,
    active: topic.active,
  };
}

function serializeLevel(level: {
  id: number;
  gradeSubjectId: number;
  levelNumber: number;
  name: string;
  description: string | null;
  difficulty: string;
  requiredPoints: number;
  timeLimit: number | null;
  active: boolean;
}): PublicLevel {
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
  };
}

export const gradeSubjectsService = {
  getById: async (id: string): Promise<PublicGradeSubject | null> => {
    const gradeSubjectId = Number(id);

    if (!Number.isInteger(gradeSubjectId)) {
      return null;
    }

    const gradeSubject = await prisma.gradeSubject.findUnique({
      where: { id: gradeSubjectId },
      include: gradeSubjectInclude,
    });

    if (!gradeSubject) {
      return null;
    }

    return serializeGradeSubject(gradeSubject);
  },

  getTopicsByGradeSubjectId: async (gradeSubjectId: string): Promise<{ gradeSubjectId: number; topics: PublicTopic[]; count: number } | null> => {
    const id = Number(gradeSubjectId);

    if (!Number.isInteger(id)) {
      return null;
    }

    const gradeSubject = await prisma.gradeSubject.findUnique({
      where: { id },
    });

    if (!gradeSubject) {
      return null;
    }

    const topics = await prisma.topic.findMany({
      where: {
        gradeSubjectTopics: {
          some: {
            gradeSubjectId: id,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    return {
      gradeSubjectId: id,
      topics: topics.map(serializeTopic),
      count: topics.length,
    };
  },

  getLevelsByGradeSubjectId: async (gradeSubjectId: string): Promise<{ gradeSubjectId: number; levels: PublicLevel[]; count: number } | null> => {
    const id = Number(gradeSubjectId);

    if (!Number.isInteger(id)) {
      return null;
    }

    const gradeSubject = await prisma.gradeSubject.findUnique({
      where: { id },
    });

    if (!gradeSubject) {
      return null;
    }

    const levels = await prisma.gameLevel.findMany({
      where: {
        gradeSubjectId: id,
      },
      orderBy: {
        levelNumber: "asc",
      },
    });

    return {
      gradeSubjectId: id,
      levels: levels.map(serializeLevel),
      count: levels.length,
    };
  },
};
