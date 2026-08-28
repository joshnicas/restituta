import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import type { AdminUser } from "./admin.service";

export interface AuthenticatedAdmin extends AdminUser {}

declare global {
  namespace Express {
    interface Request {
      admin?: AuthenticatedAdmin;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET ?? "development-secret";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ message: "Admin authentication token is missing or invalid." });
    return;
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "").trim()
    : authHeader.trim();

  if (!token) {
    res.status(401).json({ message: "Admin authentication token is missing or invalid." });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub?: string; email?: string; role?: string };

    if (!decoded.sub || !decoded.email || decoded.role !== "admin") {
      throw new Error("Invalid admin token payload.");
    }

    req.admin = {
      id: decoded.sub,
      email: decoded.email,
      role: "admin",
    };

    next();
  } catch (error) {
    res.status(401).json({
      message: "Admin authentication token is missing or invalid.",
    });
  }
}
