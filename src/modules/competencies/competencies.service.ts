import prisma from "../../prisma";
import type { CompetencyCreateBody, CompetencyUpdateBody } from "./competencies.schema";

export interface PublicCompetency {
  id: string;
  topicId: number;
  name: string;
  code?: string | null;
  description?: string | null;
  active: boolean;
}

export const competenciesService = {
  getAll: async (): Promise<PublicCompetency[]> => {
    const competencies = await prisma.competency.findMany({
      orderBy: { id: "asc" },
    });

    return competencies.map((competency) => ({
      id: competency.id.toString(),
      topicId: competency.topicId,
      name: competency.name,
      code: competency.code,
      description: competency.description,
      active: competency.active,
    }));
  },

  getById: async (id: string): Promise<PublicCompetency | null> => {
    const competencyId = Number(id);

    if (!Number.isInteger(competencyId)) {
      return null;
    }

    const competency = await prisma.competency.findUnique({
      where: { id: competencyId },
    });

    if (!competency) {
      return null;
    }

    return {
      id: competency.id.toString(),
      topicId: competency.topicId,
      name: competency.name,
      code: competency.code,
      description: competency.description,
      active: competency.active,
    };
  },

  create: async (data: CompetencyCreateBody): Promise<PublicCompetency> => {
    const competency = await prisma.competency.create({
      data,
    });

    return {
      id: competency.id.toString(),
      topicId: competency.topicId,
      name: competency.name,
      code: competency.code,
      description: competency.description,
      active: competency.active,
    };
  },

  update: async (id: string, data: CompetencyUpdateBody): Promise<PublicCompetency | null> => {
    const competencyId = Number(id);

    if (!Number.isInteger(competencyId)) {
      return null;
    }

    const existing = await prisma.competency.findUnique({
      where: { id: competencyId },
    });

    if (!existing) {
      return null;
    }

    const competency = await prisma.competency.update({
      where: { id: competencyId },
      data,
    });

    return {
      id: competency.id.toString(),
      topicId: competency.topicId,
      name: competency.name,
      code: competency.code,
      description: competency.description,
      active: competency.active,
    };
  },

  delete: async (id: string): Promise<PublicCompetency | null> => {
    const competencyId = Number(id);

    if (!Number.isInteger(competencyId)) {
      return null;
    }

    const existing = await prisma.competency.findUnique({
      where: { id: competencyId },
    });

    if (!existing) {
      return null;
    }

    const competency = await prisma.competency.delete({
      where: { id: competencyId },
    });

    return {
      id: competency.id.toString(),
      topicId: competency.topicId,
      name: competency.name,
      code: competency.code,
      description: competency.description,
      active: competency.active,
    };
  },
};
