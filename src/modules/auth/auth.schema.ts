import { z } from "zod";

export const loginSchema = z.object({
  userID: z.string().trim().min(1, "User ID is required."),
});

export const registerSchema = z.object({
  userID: z.string().trim().min(3, "User ID must be at least 3 characters long."),
  email: z.string().trim().email("A valid email is required."),
  name: z.string().trim().min(1, "Name is required."),
  DoB: z.coerce.date().optional(),
  gradeId: z.number().int("Grade ID must be an integer.").positive("Grade ID must be positive.").optional(),
});

export const updateAccountSchema = z
  .object({
    email: z.string().trim().email("A valid email is required.").optional(),
    userID: z.string().trim().min(3, "User ID must be at least 3 characters long.").optional(),
    name: z.string().trim().min(1, "Name is required.").optional(),
    DoB: z.coerce.date().optional(),
    gradeId: z.number().int("Grade ID must be an integer.").positive("Grade ID must be positive.").nullable().optional(),
  })
  .refine(
    (data) => Boolean(data.email || data.userID || data.name || data.DoB || data.gradeId !== undefined),
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
  email: string;
}

function formatValidationError(input: unknown, schema: z.ZodSchema): Error {
  const result = schema.safeParse(input);

  if (result.success) {
    return new Error("Invalid request data.");
  }

  const firstIssue = result.error.issues[0];
  const rawMessage = firstIssue?.message ?? "Invalid request data.";

  if (typeof rawMessage === "string" && rawMessage.includes("required") && rawMessage.includes("undefined")) {
    const match = rawMessage.match(/Expected `([^`]+)`/);
    if (match) {
      return new Error(`${match[1]} is required.`);
    }
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
