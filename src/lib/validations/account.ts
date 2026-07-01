import { z } from "zod";

/**
 * Esquema de validación de cuenta (Zod v4) — mismo patrón que trade.
 * Mensajes por CLAVE i18n (namespace `validation`), coerción para money.
 */
const blankToUndefined = (v: unknown) => (v === "" || v == null ? undefined : v);

export const accountSchema = z.object({
  name: z
    .string({ error: "validation.required" })
    .trim()
    .min(1, { error: "validation.required" }),
  exchange: z.preprocess(blankToUndefined, z.string().trim().optional()),
  // Vacío → "USD" (default de la columna).
  currency: z.preprocess(
    (v) => (v === "" || v == null ? "USD" : v),
    z.string().trim(),
  ),
  startingBalance: z
    .coerce.number({ error: "validation.invalidNumber" })
    .default(0),
});

export type AccountFormInput = z.input<typeof accountSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
