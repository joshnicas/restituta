import prisma from "../../prisma";
import type {
  AudioCategoryCreateBody,
  AudioCategoryUpdateBody,
} from "./audio-categories.schema";

export interface PublicAudioCategory {
  id: string;
  name: string;
}

export const audioCategoriesService = {
  getAll: async (): Promise<PublicAudioCategory[]> => {
    const categories = await prisma.audioCategory.findMany({
      orderBy: { id: "asc" },
    });

    return categories.map((category) => ({
      id: category.id.toString(),
      name: category.name,
    }));
  },

  getById: async (id: string): Promise<PublicAudioCategory | null> => {
    const categoryId = Number(id);

    if (!Number.isInteger(categoryId)) {
      return null;
    }

    const category = await prisma.audioCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return null;
    }

    return {
      id: category.id.toString(),
      name: category.name,
    };
  },

  create: async (data: AudioCategoryCreateBody): Promise<PublicAudioCategory> => {
    const category = await prisma.audioCategory.create({
      data,
    });

    return {
      id: category.id.toString(),
      name: category.name,
    };
  },

  update: async (
    id: string,
    data: AudioCategoryUpdateBody,
  ): Promise<PublicAudioCategory | null> => {
    const categoryId = Number(id);

    if (!Number.isInteger(categoryId)) {
      return null;
    }

    const existing = await prisma.audioCategory.findUnique({
      where: { id: categoryId },
    });

    if (!existing) {
      return null;
    }

    const category = await prisma.audioCategory.update({
      where: { id: categoryId },
      data,
    });

    return {
      id: category.id.toString(),
      name: category.name,
    };
  },

  delete: async (id: string): Promise<PublicAudioCategory | null> => {
    const categoryId = Number(id);

    if (!Number.isInteger(categoryId)) {
      return null;
    }

    const existing = await prisma.audioCategory.findUnique({
      where: { id: categoryId },
    });

    if (!existing) {
      return null;
    }

    const category = await prisma.audioCategory.delete({
      where: { id: categoryId },
    });

    return {
      id: category.id.toString(),
      name: category.name,
    };
  },
};
