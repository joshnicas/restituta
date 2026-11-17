import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../../prisma";

declare global {
  namespace Express {
    interface Request {
      teacher?: { id: string };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET ?? "development-secret";

export async function requireTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader?.trim();
  if (!token) {
    res.status(401).json({ message: "Teacher authentication is required." });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub?: string; role?: string };
    if (!decoded.sub || decoded.role !== "teacher") throw new Error("Invalid teacher token.");
    const teacher = await prisma.teacher.findUnique({ where: { id: decoded.sub }, select: { id: true } });
    if (!teacher) {
      res.status(403).json({ message: "This teacher account was not found." });
      return;
    }
    req.teacher = { id: teacher.id };
    next();
  } catch {
    res.status(401).json({ message: "Teacher authentication is invalid or expired." });
  }
}
