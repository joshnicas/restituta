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
  translations?: Partial<Record<"EN" | "SW", { name: string; description?: string | null }>>;
  translationStatus?: { EN: boolean; SW: boolean };
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
  translations?: Array<{ language: string; name: string; description: string | null }>;
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
    translations: Object.fromEntries((subject.translations ?? []).map((t) => [t.language, { name: t.name, description: t.description }])),
    translationStatus: { EN: true, SW: Boolean(subject.translations?.some((t) => t.language === "SW" && t.name.trim())) },
    gradeSubjects: serializeGradeSubjects(subject.gradeSubjects),
  };
}

function toCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

const GRADE_SUBJECT_INCLUDE = {
  translations: true,
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
        translations: subject.translations,
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
      translations: subject.translations,
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
    translations?: { SW?: { name?: string; description?: string | null } };
    code?: string;
    icon?: string | null;
    description?: string | null;
    active?: boolean;
    gradeIds?: number[];
  }): Promise<PublicSubject> => {
    const { gradeIds, translations, ...subjectData } = data;

    const subject = await prisma.subject.create({
      data: {
        ...subjectData,
        ...(translations?.SW?.name?.trim() ? { translations: { create: [{ language: "SW", name: translations.SW.name.trim(), description: translations.SW.description ?? null }] } } : {}),
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
        translations: subject.translations,
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
    data: { name?: string; code?: string; icon?: string | null; description?: string | null; active?: boolean; translations?: { SW?: { name?: string; description?: string | null } } },
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

    const { translations, ...subjectData } = data;
    const sw = translations?.SW;
    const subject = await prisma.subject.update({
      where: { id: subjectId },
      data: {
        ...subjectData,
        ...(subjectData.code ? { code: toCode(subjectData.code) } : {}),
        ...(sw?.name?.trim() ? { translations: { upsert: { where: { subjectId_language: { subjectId, language: "SW" } }, create: { language: "SW", name: sw.name.trim(), description: sw.description ?? null }, update: { name: sw.name.trim(), description: sw.description ?? null } } } } : {}),
      },
      include: { translations: true },
    });

    return {
      id: subject.id.toString(),
      name: subject.name,
      code: subject.code,
      icon: subject.icon,
      description: subject.description,
      active: subject.active,
      translations: Object.fromEntries(subject.translations.map((t) => [t.language, { name: t.name, description: t.description }])),
      translationStatus: { EN: true, SW: Boolean(subject.translations.some((t) => t.language === "SW" && t.name.trim())) },
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
