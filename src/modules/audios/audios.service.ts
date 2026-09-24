import prisma from "../../prisma";
import type { AudioCreateBody, AudioUpdateBody } from "./audios.schema";

export interface PublicAudio {
  id: string;
  audioCategoryId: number;
  name: string;
  url: string | null;
}

export const audiosService = {
  categoryExists: async (audioCategoryId: number): Promise<boolean> => {
    const category = await prisma.audioCategory.findUnique({
      where: { id: audioCategoryId },
      select: { id: true },
    });

    return Boolean(category);
  },

  getAll: async (categoryId?: number): Promise<PublicAudio[]> => {
    const audios = await prisma.audio.findMany({
      where: categoryId ? { audioCategoryId: categoryId } : undefined,
      orderBy: { id: "asc" },
    });

    return audios.map((audio) => ({
      id: audio.id.toString(),
      audioCategoryId: audio.audioCategoryId,
      name: audio.name,
      url: audio.url,
    }));
  },

  getById: async (id: string): Promise<PublicAudio | null> => {
    const audioId = Number(id);

    if (!Number.isInteger(audioId)) {
      return null;
    }

    const audio = await prisma.audio.findUnique({
      where: { id: audioId },
    });

    if (!audio) {
      return null;
    }

    return {
      id: audio.id.toString(),
      audioCategoryId: audio.audioCategoryId,
      name: audio.name,
      url: audio.url,
    };
  },

  create: async (data: AudioCreateBody): Promise<PublicAudio> => {
    const audio = await prisma.audio.create({
      data,
    });

    return {
      id: audio.id.toString(),
      audioCategoryId: audio.audioCategoryId,
      name: audio.name,
      url: audio.url,
    };
  },

  update: async (id: string, data: AudioUpdateBody): Promise<PublicAudio | null> => {
    const audioId = Number(id);

    if (!Number.isInteger(audioId)) {
      return null;
    }

    const existing = await prisma.audio.findUnique({
      where: { id: audioId },
    });

    if (!existing) {
      return null;
    }

    const audio = await prisma.audio.update({
      where: { id: audioId },
      data,
    });

    return {
      id: audio.id.toString(),
      audioCategoryId: audio.audioCategoryId,
      name: audio.name,
      url: audio.url,
    };
  },

  delete: async (id: string): Promise<PublicAudio | null> => {
    const audioId = Number(id);

    if (!Number.isInteger(audioId)) {
      return null;
    }

    const existing = await prisma.audio.findUnique({
      where: { id: audioId },
    });

    if (!existing) {
      return null;
    }

    const audio = await prisma.audio.delete({
      where: { id: audioId },
    });

    return {
      id: audio.id.toString(),
      audioCategoryId: audio.audioCategoryId,
      name: audio.name,
      url: audio.url,
    };
  },
};
