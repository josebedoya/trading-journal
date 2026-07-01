import { z } from "zod";

/**
 * Esquema de validación del trade (Zod v4) — contrato de INPUTS del formulario.
 * Es el esquema de referencia: los demás (AccountForm, TransactionForm) lo copian.
 *
 * Convenciones (§13):
 * - Coerción para inputs que llegan como string desde el form
 *   (`z.coerce.number()`, `z.coerce.date()`).
 * - Optatividad espejada del schema Drizzle (`trades`) y del formulario.
 *   Requeridos: accountId, symbol, direction, openedAt, entryPrice, exitPrice,
 *               netPnl.
 *   Opcionales:  closedAt, realizedRr, riskAmount, session, setupId,
 *                strategy, timeframe, notes.
 *   `fees` es opcional con default 0 (igual que `numeric notNull default '0'`).
 *   Nota: quantity, leverage y plannedRr ya no se capturan en el form (sus
 *   columnas se conservan en BD como legacy/nullable).
 * - El form captura el P&L NETO directamente. `grossPnl` y `result` son
 *   DERIVADOS en el server action (gross = net + fees; result = signo(net)).
 * - i18n-ready: los mensajes son CLAVES, nunca texto. El consumidor las
 *   resuelve con next-intl (`t(issue.message)`). Claves (namespace `validation`):
 *     required · invalidOption · invalidNumber · invalidDate · invalidId
 *
 * Las claves de campo (camelCase) coinciden con los `name`/columnas existentes.
 */

/** Campo de texto vacío → undefined antes de coercionar. */
const blankToUndefined = (v: unknown) => (v === "" || v == null ? undefined : v);

/** "" o el sentinela "none" de los <Select> → undefined. */
const noneToUndefined = (v: unknown) =>
  v === "" || v === "none" || v == null ? undefined : v;

const optionalNumber = z.preprocess(
  blankToUndefined,
  z.coerce.number({ error: "validation.invalidNumber" }).optional(),
);

const optionalDate = z.preprocess(
  blankToUndefined,
  z.coerce.date({ error: "validation.invalidDate" }).optional(),
);

/** Number requerido: vacío → error (no coerciona "" a 0 silenciosamente). */
const requiredNumber = z.preprocess(
  blankToUndefined,
  z.coerce.number({ error: "validation.invalidNumber" }),
);

export const tradeSchema = z.object({
  // FK obligatoria. El server RE-verifica ownership; no se confía en el cliente.
  accountId: z.uuid({ error: "validation.invalidId" }),

  symbol: z
    .string({ error: "validation.required" })
    .trim()
    .min(1, { error: "validation.required" }),

  direction: z.enum(["long", "short"], { error: "validation.invalidOption" }),

  openedAt: z.coerce.date({ error: "validation.invalidDate" }),
  closedAt: optionalDate,

  entryPrice: requiredNumber,
  exitPrice: requiredNumber,

  netPnl: requiredNumber,
  fees: z.coerce.number({ error: "validation.invalidNumber" }).default(0),

  realizedRr: optionalNumber,
  riskAmount: optionalNumber,

  session: z.preprocess(
    noneToUndefined,
    z
      .enum(["asia", "london", "newyork", "overlap", "other"], {
        error: "validation.invalidOption",
      })
      .optional(),
  ),

  setupId: z.preprocess(
    noneToUndefined,
    z.uuid({ error: "validation.invalidId" }).optional(),
  ),

  strategy: z.preprocess(blankToUndefined, z.string().trim().optional()),
  timeframe: z.preprocess(blankToUndefined, z.string().trim().optional()),
  notes: z.preprocess(blankToUndefined, z.string().trim().optional()),
});

/** Valores de entrada (lo que sostienen los inputs, antes de coercionar). */
export type TradeFormInput = z.input<typeof tradeSchema>;
/** Valores ya validados/coercionados (lo que recibe el submit y el server). */
export type TradeInput = z.infer<typeof tradeSchema>;
