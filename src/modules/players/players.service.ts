import prisma from "../../prisma";
import type { PlayerCreateBody, PlayerUpdateBody } from "./players.schema";

export interface PublicPlayer {
  id: string;
  name: string;
  description: string | null;
  url1: string | null;
  url2: string | null;
}

export const playersService = {
  getAll: async (): Promise<PublicPlayer[]> => {
    const players = await prisma.player.findMany({ orderBy: { id: "asc" } });

    return players.map((p) => ({
      id: p.id.toString(),
      name: p.name,
      description: p.description ?? null,
      url1: p.url1 ?? null,
      url2: p.url2 ?? null,
    }));
  },

  getById: async (id: string): Promise<PublicPlayer | null> => {
    const playerId = Number(id);

    if (!Number.isInteger(playerId)) {
      return null;
    }

    const p = await prisma.player.findUnique({ where: { id: playerId } });

    if (!p) return null;

    return {
      id: p.id.toString(),
      name: p.name,
      description: p.description ?? null,
      url1: p.url1 ?? null,
      url2: p.url2 ?? null,
    };
  },

  create: async (data: PlayerCreateBody): Promise<PublicPlayer> => {
    const p = await prisma.player.create({ data });

    return {
      id: p.id.toString(),
      name: p.name,
      description: p.description ?? null,
      url1: p.url1 ?? null,
      url2: p.url2 ?? null,
    };
  },

  update: async (id: string, data: PlayerUpdateBody): Promise<PublicPlayer | null> => {
    const playerId = Number(id);

    if (!Number.isInteger(playerId)) return null;

    const existing = await prisma.player.findUnique({ where: { id: playerId } });

    if (!existing) return null;

    const p = await prisma.player.update({ where: { id: playerId }, data });

    return {
      id: p.id.toString(),
      name: p.name,
      description: p.description ?? null,
      url1: p.url1 ?? null,
      url2: p.url2 ?? null,
    };
  },
  delete: async (id: string): Promise<PublicPlayer | null> => {
    const playerId = Number(id);

    if (!Number.isInteger(playerId)) return null;

    const existing = await prisma.player.findUnique({ where: { id: playerId } });

    if (!existing) return null;

    const p = await prisma.player.delete({ where: { id: playerId } });

    return {
      id: p.id.toString(),
      name: p.name,
      description: p.description ?? null,
      url1: p.url1 ?? null,
      url2: p.url2 ?? null,
    };
  },
};
