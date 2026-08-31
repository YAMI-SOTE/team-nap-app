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
