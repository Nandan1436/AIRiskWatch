import { z } from "zod";

// Mirrors the backend rules in app/schemas/user_schema.py and auth_schema.py.
export const UsernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(/^[A-Za-z0-9_.-]+$/, "Use letters, numbers, dots, dashes or underscores");

export const SignInSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const SignUpSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email"),
    username: UsernameSchema,
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const ProfileSchema = z.object({ username: UsernameSchema });

export type SignInForm = z.infer<typeof SignInSchema>;
export type SignUpForm = z.infer<typeof SignUpSchema>;
export type ProfileForm = z.infer<typeof ProfileSchema>;
