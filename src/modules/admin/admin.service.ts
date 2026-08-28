import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import prisma from "../../prisma";
import type { AdminLoginBody } from "./admin.schema";

const JWT_SECRET = process.env.JWT_SECRET ?? "development-secret";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "admin@resti.app").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

export interface AdminUser {
  id: string;
  email: string;
  role: "admin";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function seedDefaultAdmin(): Promise<void> {
  const email = ADMIN_EMAIL;

  const existingAdmin = await prisma.admin.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await prisma.admin.create({
    data: {
      email,
      password: hashedPassword,
      name: "System Admin",
    },
  });
}

function buildAdminToken(admin: { id: number; email: string }): string {
  return jwt.sign(
    {
      sub: admin.id.toString(),
      email: admin.email,
      role: "admin",
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export const adminAuthService = {
  login: async ({ email, password }: AdminLoginBody): Promise<{ token: string; admin: AdminUser }> => {
    const normalizedEmail = normalizeEmail(email);

    const admin = await prisma.admin.findUnique({
      where: { email: normalizedEmail },
    });

    if (!admin) {
      throw new Error("Invalid email or password.");
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      throw new Error("Invalid email or password.");
    }

    const token = buildAdminToken(admin);

    return {
      token,
      admin: {
        id: admin.id.toString(),
        email: admin.email,
        role: "admin",
      },
    };
  },

  register: async ({
    email,
    password,
    name,
  }: {
    email: string;
    password: string;
    name?: string;
  }): Promise<{ id: string; email: string; name?: string }> => {
    const normalizedEmail = normalizeEmail(email);

    const existing = await prisma.admin.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new Error("An admin with this email already exists.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const created = await prisma.admin.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name?.trim() || null,
      },
    });

    return {
      id: created.id.toString(),
      email: created.email,
      name: created.name ?? undefined,
    };
  },
};