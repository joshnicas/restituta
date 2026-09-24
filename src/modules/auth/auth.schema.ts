import { z } from "zod";

export const loginSchema = z.object({
  userID: z.string().trim().min(1, "User ID is required."),
});

export const registerSchema = z.object({
  userID: z.string().trim().min(3, "User ID must be at least 3 characters long."),
  email: z.string().trim().email("A valid email is required.").optional(),
  DoB: z.coerce.date().optional(),
  gradeId: z.number().int("Grade ID must be an integer.").positive("Grade ID must be positive.").optional(),
});

export const updateAccountSchema = z
  .object({
    email: z.string().trim().email("A valid email is required.").optional(),
    userID: z.string().trim().min(3, "User ID must be at least 3 characters long.").optional(),
    DoB: z.coerce.date().optional(),
    gradeId: z.number().int("Grade ID must be an integer.").positive("Grade ID must be positive.").nullable().optional(),
    playerId: z.number().int("Player ID must be an integer.").positive("Player ID must be positive.").nullable().optional(),
    playerSkinId: z.number().int("Player skin ID must be an integer.").positive("Player skin ID must be positive.").nullable().optional(),
  })
  .refine(
    (data) => Boolean(data.email || data.userID || data.DoB || data.gradeId !== undefined || data.playerId !== undefined || data.playerSkinId !== undefined),
    {
      message: "At least one field to update is required.",
      path: ["email"],
    },
  );

export type LoginBody = z.infer<typeof loginSchema>;
export type RegisterBody = z.infer<typeof registerSchema>;
export type UpdateAccountBody = z.infer<typeof updateAccountSchema>;

export interface AuthUser {
  id: string;
  email?: string | null;
  emailStatus?: boolean;
  playerId?: number | null;
  playerSkinId?: number | null;
}

function formatValidationError(input: unknown, schema: z.ZodSchema): Error {
  const result = schema.safeParse(input);

  if (result.success) {
    return new Error("Invalid request data.");
  }

  const firstIssue = result.error.issues[0];
  const fieldPath = firstIssue?.path.length ? firstIssue.path.map((segment) => String(segment)).join(".") : "request";
  const rawMessage = firstIssue?.message ?? "Invalid request data.";

  if (
    firstIssue &&
    firstIssue.code === "invalid_type" &&
    "received" in firstIssue &&
    firstIssue.received === "undefined"
  ) {
    return new Error(`${fieldPath === "request" ? "Request" : fieldPath} is required.`);
  }

  if (fieldPath !== "request") {
    return new Error(`${fieldPath}: ${rawMessage}`);
  }

  return new Error(rawMessage);
}

export function parseLoginBody(input: unknown): LoginBody {
  const result = loginSchema.safeParse(input);

  if (!result.success) {
    throw formatValidationError(input, loginSchema);
  }

  return result.data;
}

export function parseRegisterBody(input: unknown): RegisterBody {
  const result = registerSchema.safeParse(input);

  if (!result.success) {
    throw formatValidationError(input, registerSchema);
  }

  return result.data;
}

export function parseUpdateAccountBody(input: unknown): UpdateAccountBody {
  const result = updateAccountSchema.safeParse(input);

  if (!result.success) {
    throw formatValidationError(input, updateAccountSchema);
  }

  return result.data;
}
