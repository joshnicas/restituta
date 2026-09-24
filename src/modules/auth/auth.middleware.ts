import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import type { AuthUser } from "./auth.schema";

export interface AuthenticatedUser extends AuthUser {}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET ?? "development-secret";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ message: "Authentication token is missing or invalid." });
    return;
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "").trim()
    : authHeader.trim();

  if (!token) {
    res.status(401).json({ message: "Authentication token is missing or invalid." });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub?: string; email?: string };

    if (!decoded.sub) {
      throw new Error("Invalid token payload.");
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email ?? undefined,
    };

    next();
  } catch (error) {
    res.status(401).json({
      message: "Authentication token is missing or invalid.",
    });
  }
}
