import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";

import prisma from "../../prisma";
import { normalizePhoneNumber, phoneNumberLookupVariants } from "../../utils/phone";
import { schoolsService } from "../schools/schools.service";
import type { AuthUser, LoginBody, RegisterBody, UpdateAccountBody } from "./auth.schema";

const JWT_SECRET = process.env.JWT_SECRET ?? "development-secret";

function buildToken(user: { id: number; email?: string | null }): string {
  return jwt.sign({ sub: user.id.toString(), email: user.email ?? null }, JWT_SECRET, {
    expiresIn: "10m",
  });
}

const REFRESH_SESSION_DAYS = 90;
function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function issueSession(user: { id: number; email?: string }, requestedDeviceId: string) {
  const deviceId = requestedDeviceId.trim().slice(0, 128) || "default";
  const refreshToken = randomBytes(48).toString("base64url");
  const tokenHash = hashRefreshToken(refreshToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REFRESH_SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.authSession.upsert({
    where: { userId_deviceId: { userId: user.id, deviceId } },
    create: { userId: user.id, deviceId, tokenHash, expiresAt, lastUsedAt: now },
    update: { tokenHash, expiresAt, revokedAt: null, lastUsedAt: now },
  });
  return { token: buildToken(user), refreshToken, refreshExpiresAt: expiresAt };
}

export const authService = {
  register: async ({ userID, email, phoneNumber, DoB, gradeId }: RegisterBody, deviceId = "default"): Promise<{ token: string; refreshToken: string; refreshExpiresAt: Date; user: AuthUser }> => {
    const normalizedUserId = userID.trim();
    const normalizedEmail = email ? email.trim().toLowerCase() : undefined;
    const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : undefined;

    if (normalizedPhone && !/^\+?[0-9]{7,15}$/.test(normalizedPhone)) {
      throw new Error("Enter a valid phone number, including country code where applicable.");
    }

    if (normalizedEmail) {
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUserByEmail) {
        throw new Error("A user with this email already exists.");
      }
    }

    if (normalizedPhone && await prisma.user.findFirst({ where: { phoneNumber: { in: phoneNumberLookupVariants(normalizedPhone) } } })) {
      throw new Error("A user with this phone number already exists.");
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
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
        ...(normalizedPhone ? { phoneNumber: normalizedPhone } : {}),
        DoB: DoB ? new Date(DoB) : undefined,
        grade: gradeId ? { connect: { id: gradeId } } : undefined,
        selectedPlayer: 2,
        gameProfile: {
          create: {},
        },
      },
    });

    const session = await issueSession({ id: user.id, email: user.email ?? undefined }, deviceId);

    return {
      ...session,
      user: {
        id: user.id.toString(),
        email: user.email,
        language: user.language,
        selectedPlayer: user.selectedPlayer,
      },
    };
  },

  login: async (body: LoginBody, deviceId = "default"): Promise<{ token: string; refreshToken: string; refreshExpiresAt: Date; user: AuthUser }> => {
    const identifier = (body.identifier ?? body.userID ?? "").trim();
    const phoneVariants = phoneNumberLookupVariants(identifier);
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { userID: identifier },
          { email: identifier.toLowerCase() },
          { phoneNumber: { in: phoneVariants } },
        ],
      },
    });

    if (!user || (user.passwordHash
      ? !body.password || !(await bcrypt.compare(body.password, user.passwordHash))
      : Boolean(body.password))) {
      throw new Error("Invalid user ID, email, or password.");
    }

    const session = await issueSession({ id: user.id, email: user.email ?? undefined }, deviceId);

    return {
      ...session,
      user: {
        id: user.id.toString(),
        userID: user.userID,
        email: user.email,
        language: user.language,
        hasPassword: Boolean(user.passwordHash),
        selectedPlayer: user.selectedPlayer,
      },
    };
  },

  addPassword: async (currentUserId: string, password: string): Promise<void> => {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await prisma.user.updateMany({
      where: { id: Number(currentUserId), passwordHash: null },
      data: { passwordHash },
    });
    if (result.count !== 1) {
      throw new Error("A password is already set for this account.");
    }
  },

  changePassword: async (currentUserId: string, currentPassword: string, newPassword: string): Promise<void> => {
    const userId = Number(currentUserId);
    if (!Number.isInteger(userId)) throw new Error("Invalid user session.");

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user?.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new Error("Current password is incorrect.");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  },

  refresh: async (refreshToken: string): Promise<{ token: string; refreshToken: string; refreshExpiresAt: Date }> => {
    if (refreshToken.length < 32 || refreshToken.length > 256) throw new Error("Refresh session is invalid or expired.");
    const currentHash = hashRefreshToken(refreshToken);
    const session = await prisma.authSession.findUnique({ where: { tokenHash: currentHash }, include: { user: { select: { id: true, email: true } } } });
    const now = new Date();
    if (!session || session.revokedAt || session.expiresAt <= now) throw new Error("Refresh session is invalid or expired.");

    const replacement = randomBytes(48).toString("base64url");
    const replacementHash = hashRefreshToken(replacement);
    const expiresAt = new Date(now.getTime() + REFRESH_SESSION_DAYS * 24 * 60 * 60 * 1000);
    const rotated = await prisma.authSession.updateMany({
      where: { id: session.id, tokenHash: currentHash, revokedAt: null, expiresAt: { gt: now } },
      data: { tokenHash: replacementHash, expiresAt, lastUsedAt: now },
    });
    if (rotated.count !== 1) throw new Error("Refresh session is invalid or expired.");
    return { token: buildToken(session.user), refreshToken: replacement, refreshExpiresAt: expiresAt };
  },

  revokeRefreshToken: async (refreshToken: string): Promise<void> => {
    if (!refreshToken || refreshToken.length > 256) return;
    await prisma.authSession.updateMany({ where: { tokenHash: hashRefreshToken(refreshToken), revokedAt: null }, data: { revokedAt: new Date() } });
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

    if (data.phoneNumber !== undefined) {
      const normalizedPhone = data.phoneNumber === null ? null : normalizePhoneNumber(data.phoneNumber);
      if (normalizedPhone && !/^\+?[0-9]{7,15}$/.test(normalizedPhone)) throw new Error("Enter a valid phone number, including country code where applicable.");
      if (normalizedPhone) {
        const existingByPhone = await prisma.user.findFirst({ where: { phoneNumber: { in: phoneNumberLookupVariants(normalizedPhone) } } });
        if (existingByPhone && existingByPhone.id !== user.id) throw new Error("This phone number is already in use.");
      }
      data.phoneNumber = normalizedPhone;
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

    const normalizedSchoolCode = data.schoolCode === undefined
      ? undefined
      : data.schoolCode === null
        ? null
        : data.schoolCode.trim().toUpperCase();
    if (normalizedSchoolCode && !schoolsService.getByCode(normalizedSchoolCode) && !schoolsService.getByCode(normalizedSchoolCode, "zanzibar")) {
      throw new Error("Selected school was not found.");
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.email ? { email: data.email.trim().toLowerCase() } : {}),
        ...(data.phoneNumber !== undefined ? { phoneNumber: data.phoneNumber } : {}),
        ...(data.userID ? { userID: data.userID.trim() } : {}),
        ...(data.language ? { language: data.language } : {}),
        ...(data.selectedPlayer !== undefined ? { selectedPlayer: data.selectedPlayer } : {}),
        // `name` field removed from user model
        ...(data.DoB ? { DoB: new Date(data.DoB) } : {}),
        ...(normalizedSchoolCode !== undefined ? { schoolCode: normalizedSchoolCode } : {}),
        ...(data.gradeId !== undefined
          ? data.gradeId === null
            ? { grade: { disconnect: true } }
            : { grade: { connect: { id: data.gradeId } } }
          : {}),
      },
    });

    return {
      message: "Account updated successfully.",
      user: {
        id: updatedUser.id.toString(),
        userID: updatedUser.userID,
        email: updatedUser.email,
        phoneNumber: data.phoneNumber ?? user.phoneNumber,
        language: updatedUser.language,
        selectedPlayer: updatedUser.selectedPlayer,
        schoolCode: updatedUser.schoolCode,
      },
    };
  },
};
