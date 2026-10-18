import prisma from "../../prisma";
import type { ImageCreateBody, ImageUpdateBody } from "./images.schema";

export interface PublicImage {
  id: string;
  imageCategoryId: number;
  name: string;
  url: string | null;
}

export const imagesService = {
  categoryExists: async (imageCategoryId: number): Promise<boolean> => {
    const category = await prisma.imageCategory.findUnique({
      where: { id: imageCategoryId },
      select: { id: true },
    });

    return Boolean(category);
  },

  getAll: async (categoryId?: number, pagination?: { page: number; limit: number }, search?: string): Promise<{
    images: PublicImage[];
    page?: number;
    limit?: number;
    total: number;
    totalPages?: number;
  }> => {
    const where = {
      ...(categoryId ? { imageCategoryId: categoryId } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    };
    const total = await prisma.image.count({ where });
    const images = await prisma.image.findMany({
      where,
      orderBy: { id: pagination ? "desc" : "asc" },
      ...(pagination ? { skip: (pagination.page - 1) * pagination.limit, take: pagination.limit } : {}),
    });

    return {
      images: images.map((image) => ({
        id: image.id.toString(),
        imageCategoryId: image.imageCategoryId,
        name: image.name,
        url: image.url,
      })),
      ...(pagination ? {
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
      } : {}),
      total,
    };
  },

  getById: async (id: string): Promise<PublicImage | null> => {
    const imageId = Number(id);

    if (!Number.isInteger(imageId)) {
      return null;
    }

    const image = await prisma.image.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      return null;
    }

    return {
      id: image.id.toString(),
      imageCategoryId: image.imageCategoryId,
      name: image.name,
      url: image.url,
    };
  },

  create: async (data: ImageCreateBody): Promise<PublicImage> => {
    const image = await prisma.image.create({
      data,
    });

    return {
      id: image.id.toString(),
      imageCategoryId: image.imageCategoryId,
      name: image.name,
      url: image.url,
    };
  },

  update: async (id: string, data: ImageUpdateBody): Promise<PublicImage | null> => {
    const imageId = Number(id);

    if (!Number.isInteger(imageId)) {
      return null;
    }

    const existing = await prisma.image.findUnique({
      where: { id: imageId },
    });

    if (!existing) {
      return null;
    }

    const image = await prisma.image.update({
      where: { id: imageId },
      data,
    });

    return {
      id: image.id.toString(),
      imageCategoryId: image.imageCategoryId,
      name: image.name,
      url: image.url,
    };
  },

  delete: async (id: string): Promise<PublicImage | null> => {
    const imageId = Number(id);

    if (!Number.isInteger(imageId)) {
      return null;
    }

    const existing = await prisma.image.findUnique({
      where: { id: imageId },
    });

    if (!existing) {
      return null;
    }

    const image = await prisma.image.delete({
      where: { id: imageId },
    });

    return {
      id: image.id.toString(),
      imageCategoryId: image.imageCategoryId,
      name: image.name,
      url: image.url,
    };
  },
};
