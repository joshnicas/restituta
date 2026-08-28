import prisma from "../../prisma";
import type { ThemeCreateBody, ThemeUpdateBody } from "./themes.schema";

export interface PublicTheme {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  active: boolean;
}

export const themesService = {
  getAll: async (): Promise<PublicTheme[]> => {
    const themes = await prisma.crossCuttingTheme.findMany({
      orderBy: { id: "asc" },
    });

    return themes.map((theme) => ({
      id: theme.id.toString(),
      name: theme.name,
      code: theme.code,
      description: theme.description,
      active: theme.active,
    }));
  },

  getById: async (id: string): Promise<PublicTheme | null> => {
    const themeId = Number(id);

    if (!Number.isInteger(themeId)) {
      return null;
    }

    const theme = await prisma.crossCuttingTheme.findUnique({
      where: { id: themeId },
    });

    if (!theme) {
      return null;
    }

    return {
      id: theme.id.toString(),
      name: theme.name,
      code: theme.code,
      description: theme.description,
      active: theme.active,
    };
  },

  create: async (data: ThemeCreateBody): Promise<PublicTheme> => {
    const theme = await prisma.crossCuttingTheme.create({
      data,
    });

    return {
      id: theme.id.toString(),
      name: theme.name,
      code: theme.code,
      description: theme.description,
      active: theme.active,
    };
  },

  update: async (id: string, data: ThemeUpdateBody): Promise<PublicTheme | null> => {
    const themeId = Number(id);

    if (!Number.isInteger(themeId)) {
      return null;
    }

    const existing = await prisma.crossCuttingTheme.findUnique({
      where: { id: themeId },
    });

    if (!existing) {
      return null;
    }

    const theme = await prisma.crossCuttingTheme.update({
      where: { id: themeId },
      data,
    });

    return {
      id: theme.id.toString(),
      name: theme.name,
      code: theme.code,
      description: theme.description,
      active: theme.active,
    };
  },

  delete: async (id: string): Promise<PublicTheme | null> => {
    const themeId = Number(id);

    if (!Number.isInteger(themeId)) {
      return null;
    }

    const existing = await prisma.crossCuttingTheme.findUnique({
      where: { id: themeId },
    });

    if (!existing) {
      return null;
    }

    const theme = await prisma.crossCuttingTheme.delete({
      where: { id: themeId },
    });

    return {
      id: theme.id.toString(),
      name: theme.name,
      code: theme.code,
      description: theme.description,
      active: theme.active,
    };
  },
};
