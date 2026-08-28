import prisma from "../../prisma";

export interface PublicGradeSubject {
  id: string;
  gradeId: number;
  active: boolean;
  grade: { id: string; name: string; code: string };
}

export interface PublicSubject {
  id: string;
  name: string;
  code: string;
  icon?: string | null;
  description?: string | null;
  active: boolean;
  gradeSubjects?: PublicGradeSubject[];
}

type GradeSubjectRecord = {
  id: number;
  gradeId: number;
  active: boolean;
  grade: { id: number; name: string; code: string };
};

function serializeGradeSubjects(
  gradeSubjects?: GradeSubjectRecord[],
): PublicGradeSubject[] | undefined {
  return gradeSubjects?.map((placement) => ({
    id: placement.id.toString(),
    gradeId: placement.gradeId,
    active: placement.active,
    grade: {
      id: placement.grade.id.toString(),
      name: placement.grade.name,
      code: placement.grade.code,
    },
  }));
}

interface SubjectProjection {
  id: number | string;
  name: string;
  code: string;
  icon?: string | null;
  description?: string | null;
  active: boolean;
  gradeSubjects?: GradeSubjectRecord[];
}

function serializeSubject(subject: SubjectProjection): PublicSubject {
  return {
    id: typeof subject.id === "number" ? subject.id.toString() : subject.id,
    name: subject.name,
    code: subject.code,
    icon: subject.icon ?? null,
    description: subject.description ?? null,
    active: subject.active,
    gradeSubjects: serializeGradeSubjects(subject.gradeSubjects),
  };
}

function toCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

const GRADE_SUBJECT_INCLUDE = {
  gradeSubjects: {
    include: {
      grade: true,
    },
    orderBy: {
      id: "asc" as const,
    },
  },
};

export const subjectsService = {
  getAll: async (): Promise<PublicSubject[]> => {
    const subjects = await prisma.subject.findMany({
      include: GRADE_SUBJECT_INCLUDE,
      orderBy: {
        id: "asc",
      },
    });

    return subjects.map((subject) =>
      serializeSubject({
        id: subject.id.toString(),
        name: subject.name,
        code: subject.code,
        icon: subject.icon,
        description: subject.description,
        active: subject.active,
        gradeSubjects: subject.gradeSubjects.map((placement) => ({
          id: placement.id,
          gradeId: placement.gradeId,
          active: placement.active,
          grade: {
            id: placement.grade.id,
            name: placement.grade.name,
            code: placement.grade.code,
          },
        })),
      }));
  },

  getById: async (id: string): Promise<PublicSubject | null> => {
    const subjectId = Number(id);

    if (!Number.isInteger(subjectId)) {
      return null;
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: GRADE_SUBJECT_INCLUDE,
    });

    if (!subject) {
      return null;
    }

    return serializeSubject({
      id: subject.id.toString(),
      name: subject.name,
      code: subject.code,
      icon: subject.icon,
      description: subject.description,
      active: subject.active,
      gradeSubjects: subject.gradeSubjects.map((placement) => ({
        id: placement.id,
        gradeId: placement.gradeId,
        active: placement.active,
        grade: {
          id: placement.grade.id,
          name: placement.grade.name,
          code: placement.grade.code,
        },
      })),
    });
  },

  create: async (data: {
    name: string;
    code?: string;
    icon?: string | null;
    description?: string | null;
    active?: boolean;
    gradeIds?: number[];
  }): Promise<PublicSubject> => {
    const { gradeIds, ...subjectData } = data;

    const subject = await prisma.subject.create({
      data: {
        ...subjectData,
        code: toCode(subjectData.code ?? subjectData.name),
        // Mirror the topics flow: every chosen grade gets its own
        // grade_subjects row so levels/topics can attach right away.
        gradeSubjects: gradeIds?.length
          ? {
              create: gradeIds.map((gradeId) => ({ gradeId })),
            }
          : undefined,
      },
      include: GRADE_SUBJECT_INCLUDE,
    });

    return serializeSubject({
      id: subject.id.toString(),
      name: subject.name,
      code: subject.code,
      icon: subject.icon,
      description: subject.description,
      active: subject.active,
      gradeSubjects: subject.gradeSubjects.map((placement) => ({
        id: placement.id,
        gradeId: placement.gradeId,
        active: placement.active,
        grade: {
          id: placement.grade.id,
          name: placement.grade.name,
          code: placement.grade.code,
        },
      })),
    });
  },

  update: async (
    id: string,
    data: { name?: string; code?: string; icon?: string | null; description?: string | null; active?: boolean },
  ): Promise<PublicSubject | null> => {
    const subjectId = Number(id);

    if (!Number.isInteger(subjectId)) {
      return null;
    }

    const existing = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!existing) {
      return null;
    }

    const subject = await prisma.subject.update({
      where: { id: subjectId },
      data: {
        ...data,
        ...(data.code ? { code: toCode(data.code) } : {}),
      },
    });

    return {
      id: subject.id.toString(),
      name: subject.name,
      code: subject.code,
      icon: subject.icon,
      description: subject.description,
      active: subject.active,
    };
  },

  delete: async (id: string): Promise<PublicSubject | null> => {
    const subjectId = Number(id);

    if (!Number.isInteger(subjectId)) {
      return null;
    }

    const existing = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!existing) {
      return null;
    }

    const subject = await prisma.subject.delete({
      where: { id: subjectId },
    });

    return {
      id: subject.id.toString(),
      name: subject.name,
      code: subject.code,
      icon: subject.icon,
      description: subject.description,
      active: subject.active,
    };
  },
};
