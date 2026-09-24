import prisma from "../../prisma";
import type {
  ImageCategoryCreateBody,
  ImageCategoryUpdateBody,
} from "./image-categories.schema";

export interface PublicImageCategory {
  id: string;
  name: string;
}

export const imageCategoriesService = {
  getAll: async (): Promise<PublicImageCategory[]> => {
    const categories = await prisma.imageCategory.findMany({
      orderBy: { id: "asc" },
    });

    return categories.map((category) => ({
      id: category.id.toString(),
      name: category.name,
    }));
  },

  getById: async (id: string): Promise<PublicImageCategory | null> => {
    const categoryId = Number(id);

    if (!Number.isInteger(categoryId)) {
      return null;
    }

    const category = await prisma.imageCategory.findUnique({
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

  create: async (data: ImageCategoryCreateBody): Promise<PublicImageCategory> => {
    const category = await prisma.imageCategory.create({
      data,
    });

    return {
      id: category.id.toString(),
      name: category.name,
    };
  },

  update: async (
    id: string,
    data: ImageCategoryUpdateBody,
  ): Promise<PublicImageCategory | null> => {
    const categoryId = Number(id);

    if (!Number.isInteger(categoryId)) {
      return null;
    }

    const existing = await prisma.imageCategory.findUnique({
      where: { id: categoryId },
    });

    if (!existing) {
      return null;
    }

    const category = await prisma.imageCategory.update({
      where: { id: categoryId },
      data,
    });

    return {
      id: category.id.toString(),
      name: category.name,
    };
  },

  delete: async (id: string): Promise<PublicImageCategory | null> => {
    const categoryId = Number(id);

    if (!Number.isInteger(categoryId)) {
      return null;
    }

    const existing = await prisma.imageCategory.findUnique({
      where: { id: categoryId },
    });

    if (!existing) {
      return null;
    }

    const category = await prisma.imageCategory.delete({
      where: { id: categoryId },
    });

    return {
      id: category.id.toString(),
      name: category.name,
    };
  },
};
