import prisma from "../../prisma";
import type { GradeCreateBody, GradeUpdateBody } from "./grades.schema";

export interface PublicGrade {
  id: string;
  curriculumVersionId: number;
  name: string;
  code: string;
  level: number;
  stage: string;
  active: boolean;
}

export interface PublicGradeSubject {
  gradeSubjectId: number;
  subjectId: number;
  name: string;
  code: string;
  icon?: string | null;
  description?: string | null;
  active: boolean;
}

export const gradesService = {
  getAll: async (): Promise<PublicGrade[]> => {
    const grades = await prisma.grade.findMany({
      orderBy: { level: "asc" },
    });

    return grades.map((grade) => ({
      id: grade.id.toString(),
      curriculumVersionId: grade.curriculumVersionId,
      name: grade.name,
      code: grade.code,
      level: grade.level,
      stage: grade.stage,
      active: grade.active,
    }));
  },

  getById: async (id: string): Promise<PublicGrade | null> => {
    const gradeId = Number(id);

    if (!Number.isInteger(gradeId)) {
      return null;
    }

    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
    });

    if (!grade) {
      return null;
    }

    return {
      id: grade.id.toString(),
      curriculumVersionId: grade.curriculumVersionId,
      name: grade.name,
      code: grade.code,
      level: grade.level,
      stage: grade.stage,
      active: grade.active,
    };
  },

  create: async (data: GradeCreateBody): Promise<PublicGrade> => {
    const grade = await prisma.grade.create({
      data,
    });

    return {
      id: grade.id.toString(),
      curriculumVersionId: grade.curriculumVersionId,
      name: grade.name,
      code: grade.code,
      level: grade.level,
      stage: grade.stage,
      active: grade.active,
    };
  },

  update: async (id: string, data: GradeUpdateBody): Promise<PublicGrade | null> => {
    const gradeId = Number(id);

    if (!Number.isInteger(gradeId)) {
      return null;
    }

    const existing = await prisma.grade.findUnique({
      where: { id: gradeId },
    });

    if (!existing) {
      return null;
    }

    const grade = await prisma.grade.update({
      where: { id: gradeId },
      data,
    });

    return {
      id: grade.id.toString(),
      curriculumVersionId: grade.curriculumVersionId,
      name: grade.name,
      code: grade.code,
      level: grade.level,
      stage: grade.stage,
      active: grade.active,
    };
  },

  delete: async (id: string): Promise<PublicGrade | null> => {
    const gradeId = Number(id);

    if (!Number.isInteger(gradeId)) {
      return null;
    }

    const existing = await prisma.grade.findUnique({
      where: { id: gradeId },
    });

    if (!existing) {
      return null;
    }

    const grade = await prisma.grade.delete({
      where: { id: gradeId },
    });

    return {
      id: grade.id.toString(),
      curriculumVersionId: grade.curriculumVersionId,
      name: grade.name,
      code: grade.code,
      level: grade.level,
      stage: grade.stage,
      active: grade.active,
    };
  },

  getSubjectsByGradeId: async (id: string): Promise<{ grade: PublicGrade; subjects: PublicGradeSubject[]; count: number } | null> => {
    const gradeId = Number(id);

    if (!Number.isInteger(gradeId)) {
      return null;
    }

    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
    });

    if (!grade) {
      return null;
    }

    const gradeSubjects = await prisma.gradeSubject.findMany({
      where: {
        gradeId: gradeId,
      },
      include: {
        subject: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    const publicGrade: PublicGrade = {
      id: grade.id.toString(),
      curriculumVersionId: grade.curriculumVersionId,
      name: grade.name,
      code: grade.code,
      level: grade.level,
      stage: grade.stage,
      active: grade.active,
    };

    const subjects: PublicGradeSubject[] = gradeSubjects.map((gs) => ({
      gradeSubjectId: gs.id,
      subjectId: gs.subjectId,
      name: gs.subject.name,
      code: gs.subject.code,
      icon: gs.subject.icon,
      description: gs.subject.description,
      active: gs.active,
    }));

    return {
      grade: publicGrade,
      subjects,
      count: subjects.length,
    };
  },
};
