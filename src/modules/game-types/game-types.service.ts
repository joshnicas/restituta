import prisma from "../../prisma";
import type { GameTypeCreateBody, GameTypeUpdateBody } from "./game-types.schema";

export interface PublicGameType {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  active: boolean;
}

export const gameTypesService = {
  getAll: async (): Promise<PublicGameType[]> => {
    const gameTypes = await prisma.gameType.findMany({
      orderBy: { id: "asc" },
    });

    return gameTypes.map((gameType) => ({
      id: gameType.id.toString(),
      name: gameType.name,
      code: gameType.code,
      description: gameType.description,
      active: gameType.active,
    }));
  },

  getById: async (id: string): Promise<PublicGameType | null> => {
    const gameTypeId = Number(id);

    if (!Number.isInteger(gameTypeId)) {
      return null;
    }

    const gameType = await prisma.gameType.findUnique({
      where: { id: gameTypeId },
    });

    if (!gameType) {
      return null;
    }

    return {
      id: gameType.id.toString(),
      name: gameType.name,
      code: gameType.code,
      description: gameType.description,
      active: gameType.active,
    };
  },

  create: async (data: GameTypeCreateBody): Promise<PublicGameType> => {
    const gameType = await prisma.gameType.create({
      data,
    });

    return {
      id: gameType.id.toString(),
      name: gameType.name,
      code: gameType.code,
      description: gameType.description,
      active: gameType.active,
    };
  },

  update: async (id: string, data: GameTypeUpdateBody): Promise<PublicGameType | null> => {
    const gameTypeId = Number(id);

    if (!Number.isInteger(gameTypeId)) {
      return null;
    }

    const existing = await prisma.gameType.findUnique({
      where: { id: gameTypeId },
    });

    if (!existing) {
      return null;
    }

    const gameType = await prisma.gameType.update({
      where: { id: gameTypeId },
      data,
    });

    return {
      id: gameType.id.toString(),
      name: gameType.name,
      code: gameType.code,
      description: gameType.description,
      active: gameType.active,
    };
  },

  delete: async (id: string): Promise<PublicGameType | null> => {
    const gameTypeId = Number(id);

    if (!Number.isInteger(gameTypeId)) {
      return null;
    }

    const existing = await prisma.gameType.findUnique({
      where: { id: gameTypeId },
    });

    if (!existing) {
      return null;
    }

    const gameType = await prisma.gameType.delete({
      where: { id: gameTypeId },
    });

    return {
      id: gameType.id.toString(),
      name: gameType.name,
      code: gameType.code,
      description: gameType.description,
      active: gameType.active,
    };
  },
};
