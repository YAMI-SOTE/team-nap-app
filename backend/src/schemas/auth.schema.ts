import { z } from "zod";

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(8, "password must be at least 8 characters").max(200);

export const signUpBody = z.object({
  name: z.string().trim().min(1, "name is required").max(50),
  email,
  password,
});

export const loginBody = z.object({
  email,
  password: z.string().min(1, "password is required").max(200),
});

export const sessionIdParams = z.object({
  id: z.string().uuid(),
});

export const passwordResetRequestBody = z.object({ email });

export const passwordResetConfirmBody = z.object({
  token: z.string().min(1, "token is required"),
  password,
});

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1, "current password is required").max(200),
  newPassword: password,
});

export const updateProfileBody = z
  .object({
    name: z.string().trim().min(1, "name is required").max(50),
    email,
  })
  .partial()
  .refine(
    (v) => v.name !== undefined || v.email !== undefined,
    "name or email is required",
  );
