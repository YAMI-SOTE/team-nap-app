import { z } from "zod";

export const memberIdParams = z.object({
  id: z.string().min(1),
});
