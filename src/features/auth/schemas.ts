import { z } from "zod";

export const loginInputSchema = z.object({
  email: z
    .email("Informe um email valido.")
    .trim()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Informe uma senha com pelo menos 8 caracteres."),
});

export type LoginInput = z.infer<typeof loginInputSchema>;
