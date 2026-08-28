import prisma from "../../prisma";

export interface PublicUser {
  id: string;
  userID: string;
  email: string;
  gradeId?: number | null;
  grade?: {
    id: string;
    name: string;
    code: string;
  } | null;
  profilePic?: string | null;
}

export const usersService = {
  getAll: async (): Promise<PublicUser[]> => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        userID: true,
        email: true,
        gradeId: true,
        grade: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        profilePic: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    return users.map((user) => ({
      id: user.id.toString(),
      userID: user.userID,
      email: user.email,
      gradeId: user.gradeId,
      grade: user.grade
        ? {
            id: user.grade.id.toString(),
            name: user.grade.name,
            code: user.grade.code,
          }
        : null,
      profilePic: user.profilePic,
    }));
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
        gradeId: true,
        grade: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        profilePic: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id.toString(),
      userID: user.userID,
      email: user.email,
      gradeId: user.gradeId,
      grade: user.grade
        ? {
            id: user.grade.id.toString(),
            name: user.grade.name,
            code: user.grade.code,
          }
        : null,
      profilePic: user.profilePic,
    };
  },

  getMe: async (id: string): Promise<PublicUser | null> => usersService.getById(id),
};
