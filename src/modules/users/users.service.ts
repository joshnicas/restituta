import prisma from "../../prisma";

export interface PublicUser {
  id: string;
  userID: string;
  email: string | null;
  emailStatus: boolean;
  gradeId?: number | null;
  grade?: {
    id: string;
    name: string;
    code: string;
  } | null;
  profilePic?: string | null;
  playerId?: number | null;
  playerSkinId?: number | null;
  player?: {
    id: number;
    name: string;
    url1?: string | null;
    url2?: string | null;
    description?: string | null;
  } | null;
  playerSkin?: {
    id: number;
    playerId?: number | null;
    name: string;
    url1?: string | null;
    url2?: string | null;
    description?: string | null;
  } | null;
}

export const usersService = {
  getAll: async (page: number = 1, limit: number = 15): Promise<{ users: PublicUser[]; total: number; page: number; limit: number; totalPages: number }> => {
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          userID: true,
          email: true,
          emailStatus: true,
          gradeId: true,
          grade: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          profilePic: true,
          playerId: true,
          playerSkinId: true,
          player: {
            select: {
              id: true,
              name: true,
              url1: true,
              url2: true,
              description: true,
            },
          },
          playerSkin: {
            select: {
              id: true,
              playerId: true,
              name: true,
              url1: true,
              url2: true,
              description: true,
            },
          },
        },
        orderBy: {
          id: "asc",
        },
        skip,
        take: limit,
      }),
      prisma.user.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      users: users.map((user) => ({
        id: user.id.toString(),
        userID: user.userID,
        email: user.email,
        emailStatus: user.emailStatus,
        gradeId: user.gradeId,
        grade: user.grade
          ? {
              id: user.grade.id.toString(),
              name: user.grade.name,
              code: user.grade.code,
            }
          : null,
        profilePic: user.profilePic,
        playerId: user.playerId,
        playerSkinId: user.playerSkinId,
        player: user.player
          ? {
              id: user.player.id,
              name: user.player.name,
              url1: user.player.url1,
              url2: user.player.url2,
              description: user.player.description,
            }
          : null,
        playerSkin: user.playerSkin
          ? {
              id: user.playerSkin.id,
              playerId: user.playerSkin.playerId,
              name: user.playerSkin.name,
              url1: user.playerSkin.url1,
              url2: user.playerSkin.url2,
              description: user.playerSkin.description,
            }
          : null,
      })),
      total,
      page,
      limit,
      totalPages,
    };
  },

  getById: async (id: string): Promise<PublicUser | null> => {
    const userId = Number(id);

    if (!Number.isInteger(userId)) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userID: true,
        email: true,
        emailStatus: true,
        gradeId: true,
        grade: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        profilePic: true,
        playerId: true,
        playerSkinId: true,
        player: {
          select: {
            id: true,
            name: true,
            url1: true,
            url2: true,
            description: true,
          },
        },
        playerSkin: {
          select: {
            id: true,
            playerId: true,
            name: true,
            url1: true,
            url2: true,
            description: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id.toString(),
      userID: user.userID,
      email: user.email,
      emailStatus: user.emailStatus,
      gradeId: user.gradeId,
      grade: user.grade
        ? {
            id: user.grade.id.toString(),
            name: user.grade.name,
            code: user.grade.code,
          }
        : null,
      profilePic: user.profilePic,
      playerId: user.playerId,
      playerSkinId: user.playerSkinId,
      player: user.player
        ? {
            id: user.player.id,
            name: user.player.name,
            url1: user.player.url1,
            url2: user.player.url2,
            description: user.player.description,
          }
        : null,
      playerSkin: user.playerSkin
        ? {
            id: user.playerSkin.id,
            playerId: user.playerSkin.playerId,
            name: user.playerSkin.name,
            url1: user.playerSkin.url1,
            url2: user.playerSkin.url2,
            description: user.playerSkin.description,
          }
        : null,
    };
  },

  getMe: async (id: string): Promise<PublicUser | null> => usersService.getById(id),
};
