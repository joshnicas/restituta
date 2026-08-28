import jwt from "jsonwebtoken";

import prisma from "../../prisma";
import type { AuthUser, LoginBody, RegisterBody, UpdateAccountBody } from "./auth.schema";

const JWT_SECRET = process.env.JWT_SECRET ?? "development-secret";

function buildToken(user: { id: number; email: string }): string {
  return jwt.sign({ sub: user.id.toString(), email: user.email }, JWT_SECRET, {
    expiresIn: "10m",
  });
}

export const authService = {
  register: async ({ userID, email, name, DoB, gradeId }: RegisterBody): Promise<{ token: string; user: AuthUser }> => {
    const normalizedUserId = userID.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUserByEmail) {
      throw new Error("A user with this email already exists.");
    }

    const existingUserById = await prisma.user.findUnique({
      where: { userID: normalizedUserId },
    });

    if (existingUserById) {
      throw new Error("This user ID is already taken.");
    }

    const user = await prisma.user.create({
      data: {
        userID: normalizedUserId,
        email: normalizedEmail,
        name: normalizedName,
        DoB: DoB ? new Date(DoB) : undefined,
        gradeId: gradeId ?? undefined,
        gameProfile: {
          create: {},
        },
      },
    });

    const token = buildToken({ id: user.id, email: user.email });

    return {
      token,
      user: {
        id: user.id.toString(),
        email: user.email,
      },
    };
  },

  login: async ({ userID }: LoginBody): Promise<{ token: string; user: AuthUser }> => {
    const normalizedUserId = userID.trim();

    const user = await prisma.user.findUnique({
      where: { userID: normalizedUserId },
    });

    if (!user) {
      throw new Error("Invalid user ID.");
    }

    const token = buildToken({ id: user.id, email: user.email });

    return {
      token,
      user: {
        id: user.id.toString(),
        email: user.email,
      },
    };
  },

  updateAccount: async (
    currentUserId: string,
    data: UpdateAccountBody,
  ): Promise<{ message: string; user: AuthUser }> => {
    const userIdNumber = Number(currentUserId);

    if (!Number.isInteger(userIdNumber)) {
      throw new Error("Invalid user session.");
    }

    const user = await prisma.user.findUnique({
      where: { id: userIdNumber },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    if (data.email) {
      const normalizedEmail = data.email.trim().toLowerCase();

      const existingByEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingByEmail && existingByEmail.id !== user.id) {
        throw new Error("This email is already in use.");
      }
    }

    if (data.userID) {
      const normalizedUserId = data.userID.trim();

      const existingByUserId = await prisma.user.findUnique({
        where: { userID: normalizedUserId },
      });

      if (existingByUserId && existingByUserId.id !== user.id) {
        throw new Error("This user ID is already taken.");
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.email ? { email: data.email.trim().toLowerCase() } : {}),
        ...(data.userID ? { userID: data.userID.trim() } : {}),
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.DoB ? { DoB: new Date(data.DoB) } : {}),
        ...(data.gradeId !== undefined ? { gradeId: data.gradeId } : {}),
      },
    });

    return {
      message: "Account updated successfully.",
      user: {
        id: updatedUser.id.toString(),
        email: updatedUser.email,
      },
    };
  },
};
