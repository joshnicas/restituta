import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().trim().email("A valid admin email is required."),
  password: z.string().min(6, "Password must be at least 6 characters long."),
});

export type AdminLoginBody = z.infer<typeof adminLoginSchema>;

export function parseAdminLoginBody(input: unknown): AdminLoginBody {
  const result = adminLoginSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid admin login data.");
  }

  return result.data;
}

export const adminRegisterSchema = z.object({
  email: z.string().trim().email("A valid admin email is required."),
  password: z.string().min(6, "Password must be at least 6 characters long."),
  name: z.string().trim().optional(),
});

export type AdminRegisterBody = z.infer<typeof adminRegisterSchema>;

export function parseAdminRegisterBody(input: unknown): AdminRegisterBody {
  const result = adminRegisterSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid admin registration data.");
  }

  return result.data;
}

export const adminUpdateUserSchema = z.object({
  email: z.string().trim().email("A valid email is required.").optional(),
  userID: z.string().trim().optional(),
  gradeId: z.number().int("Grade ID must be an integer.").positive("Grade ID must be positive.").nullable().optional(),
  profilePic: z.string().url("Profile picture must be a valid URL.").optional().nullable(),
});

export type AdminUpdateUserBody = z.infer<typeof adminUpdateUserSchema>;

export function parseAdminUpdateUserBody(input: unknown): AdminUpdateUserBody {
  const result = adminUpdateUserSchema.safeParse(input);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid user update data.");
  }

  return result.data;
}
