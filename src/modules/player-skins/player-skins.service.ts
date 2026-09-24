import prisma from "../../prisma";
import type { SkinCreateBody, SkinUpdateBody } from "./player-skins.schema";

export interface PublicSkin {
  id: string;
  playerId: number | null;
  name: string;
  description: string | null;
  url1: string | null;
  url2: string | null;
}

export const playerSkinsService = {
  getAll: async (): Promise<PublicSkin[]> => {
    const skins = await prisma.playerSkin.findMany({ orderBy: { id: "asc" } });

    return skins.map((s) => ({
      id: s.id.toString(),
      playerId: s.playerId ?? null,
      name: s.name,
      description: s.description ?? null,
      url1: s.url1 ?? null,
      url2: s.url2 ?? null,
    }));
  },

  getById: async (id: string): Promise<PublicSkin | null> => {
    const skinId = Number(id);

    if (!Number.isInteger(skinId)) return null;

    const s = await prisma.playerSkin.findUnique({ where: { id: skinId } });

    if (!s) return null;

    return {
      id: s.id.toString(),
      playerId: s.playerId ?? null,
      name: s.name,
      description: s.description ?? null,
      url1: s.url1 ?? null,
      url2: s.url2 ?? null,
    };
  },

  create: async (data: SkinCreateBody): Promise<PublicSkin> => {
    const s = await prisma.playerSkin.create({ data });

    return {
      id: s.id.toString(),
      playerId: s.playerId ?? null,
      name: s.name,
      description: s.description ?? null,
      url1: s.url1 ?? null,
      url2: s.url2 ?? null,
    };
  },

  update: async (id: string, data: SkinUpdateBody): Promise<PublicSkin | null> => {
    const skinId = Number(id);

    if (!Number.isInteger(skinId)) return null;

    const existing = await prisma.playerSkin.findUnique({ where: { id: skinId } });

    if (!existing) return null;

    const s = await prisma.playerSkin.update({ where: { id: skinId }, data });

    return {
      id: s.id.toString(),
      playerId: s.playerId ?? null,
      name: s.name,
      description: s.description ?? null,
      url1: s.url1 ?? null,
      url2: s.url2 ?? null,
    };
  },
  delete: async (id: string): Promise<PublicSkin | null> => {
    const skinId = Number(id);

    if (!Number.isInteger(skinId)) return null;

    const existing = await prisma.playerSkin.findUnique({ where: { id: skinId } });

    if (!existing) return null;

    const s = await prisma.playerSkin.delete({ where: { id: skinId } });

    return {
      id: s.id.toString(),
      playerId: s.playerId ?? null,
      name: s.name,
      description: s.description ?? null,
      url1: s.url1 ?? null,
      url2: s.url2 ?? null,
    };
  },
};
