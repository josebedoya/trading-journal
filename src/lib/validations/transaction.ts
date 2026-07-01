import { z } from "zod";

/**
 * Esquema de validación de movimiento (depósito/retiro) — patrón de referencia.
 * Mensajes por CLAVE i18n (namespace `validation`).
 */
const blankToUndefined = (v: unknown) => (v === "" || v == null ? undefined : v);

export const transactionSchema = z.object({
  accountId: z.uuid({ error: "validation.invalidId" }),
  type: z.enum(["deposit", "withdrawal"], { error: "validation.invalidOption" }),
  amount: z
    .coerce.number({ error: "validation.invalidNumber" })
    .positive({ error: "validation.positiveAmount" }),
  // Vacío → undefined; el server usa "ahora".
  occurredAt: z.preprocess(
    blankToUndefined,
    z.coerce.date({ error: "validation.invalidDate" }).optional(),
  ),
  note: z.preprocess(blankToUndefined, z.string().trim().optional()),
});

export type TransactionFormInput = z.input<typeof transactionSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
