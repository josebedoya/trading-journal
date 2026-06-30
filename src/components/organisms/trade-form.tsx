"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
} from "react-hook-form";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/lib/i18n/navigation";
import {
  tradeSchema,
  type TradeFormInput,
  type TradeInput,
} from "@/lib/validations/trade";
import type { TradeActionResult } from "@/server/actions/trades";

/**
 * TradeForm — formulario de referencia (organism, 'use client').
 *
 * Patrón que copian AccountForm / TransactionForm:
 * - react-hook-form + zodResolver(tradeSchema). El esquema NO se redefine aquí;
 *   se importa de lib/validations/trade.
 * - Tipos: `TradeFormInput` (lo que sostienen los inputs, strings) como valores
 *   del form, y `TradeInput` (coercionado) como salida del submit y de la action.
 * - Layout con los primitivos Field/FieldGroup de shadcn.
 * - i18n: labels desde `trades.form.*`; mensajes de error son CLAVES que se
 *   resuelven con next-intl (`tv(issue.message)`), nunca texto hardcodeado.
 * - El server action devuelve un resultado tipado: éxito → navega; errores por
 *   campo → form.setError(campo); error general → form.setError("root").
 */

type AccountOpt = { id: string; name: string };
type SetupOpt = { id: string; name: string };

// Las capturas no están en el esquema (se manejan aparte). Se registran como
// campo extra en RHF; zod las ignora (strip) al validar.
type TradeFormFields = TradeFormInput & { screenshots?: FileList };

/** Valores existentes para el modo edición (vienen de la fila `trades`). */
export type TradeDefaults = {
  accountId: string;
  symbol: string;
  direction: "long" | "short";
  openedAt: Date;
  closedAt: Date | null;
  entryPrice: string | null;
  exitPrice: string | null;
  quantity: string | null;
  leverage: string | null;
  grossPnl: string;
  fees: string;
  plannedRr: string | null;
  realizedRr: string | null;
  riskAmount: string | null;
  session: string | null;
  setupId: string | null;
  notes: string | null;
};

const SESSIONS = ["asia", "london", "newyork", "overlap", "other"] as const;

/** Date → valor de un <input type="datetime-local"> en hora local. */
function toLocalInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** defaultValues para alta (vacío) y edición (trade existente). */
function buildDefaults(
  accounts: AccountOpt[],
  trade?: TradeDefaults,
): TradeFormFields {
  if (trade) {
    return {
      accountId: trade.accountId,
      symbol: trade.symbol,
      direction: trade.direction,
      openedAt: toLocalInput(trade.openedAt),
      closedAt: toLocalInput(trade.closedAt),
      entryPrice: trade.entryPrice ?? "",
      exitPrice: trade.exitPrice ?? "",
      quantity: trade.quantity ?? "",
      leverage: trade.leverage ?? "",
      grossPnl: trade.grossPnl,
      fees: trade.fees,
      plannedRr: trade.plannedRr ?? "",
      realizedRr: trade.realizedRr ?? "",
      riskAmount: trade.riskAmount ?? "",
      session: trade.session ?? "none",
      setupId: trade.setupId ?? "none",
      notes: trade.notes ?? "",
    };
  }
  return {
    accountId: accounts[0]?.id ?? "",
    symbol: "",
    direction: "long",
    openedAt: "",
    closedAt: "",
    entryPrice: "",
    exitPrice: "",
    quantity: "",
    leverage: "",
    grossPnl: "",
    fees: "0",
    plannedRr: "",
    realizedRr: "",
    riskAmount: "",
    session: "none",
    setupId: "none",
    notes: "",
  };
}

/** Input de texto enlazado a RHF + error i18n bajo el primitivo Field. */
function TextField({
  name,
  label,
  type = "text",
  placeholder,
}: {
  name: keyof TradeFormInput;
  label: string;
  type?: string;
  placeholder?: string;
}) {
  const { register, formState } = useFormContext<TradeFormInput>();
  const tv = useTranslations();
  const error = formState.errors[name];
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        type={type}
        inputMode={type === "text" ? "decimal" : undefined}
        placeholder={placeholder}
        aria-invalid={!!error}
        {...register(name)}
      />
      <FieldError>
        {error?.message ? tv(error.message as string) : null}
      </FieldError>
    </Field>
  );
}

/** Select (Radix) enlazado a RHF vía Controller + error i18n. */
function SelectField({
  name,
  label,
  options,
}: {
  name: keyof TradeFormInput;
  label: string;
  options: { value: string; label: string }[];
}) {
  const { control, formState } = useFormContext<TradeFormInput>();
  const tv = useTranslations();
  const error = formState.errors[name];
  return (
    <Field data-invalid={!!error}>
      <FieldLabel>{label}</FieldLabel>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            value={(field.value as string) ?? ""}
            onValueChange={field.onChange}
          >
            <SelectTrigger aria-invalid={!!error}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FieldError>
        {error?.message ? tv(error.message as string) : null}
      </FieldError>
    </Field>
  );
}

export function TradeForm({
  mode,
  accounts,
  setups,
  trade,
  action,
}: {
  mode: "create" | "edit";
  accounts: AccountOpt[];
  setups: SetupOpt[];
  trade?: TradeDefaults;
  action: (input: TradeInput, files: File[]) => Promise<TradeActionResult>;
}) {
  const t = useTranslations("trades.form");
  const tv = useTranslations();
  const router = useRouter();

  // Valores del form = TradeFormFields; salida del submit = TradeInput (coercionado).
  // Usamos el resolver Standard Schema (zod v4 lo implementa) para no acoplarnos
  // a los internos de versión de zod del resolver dedicado.
  const form = useForm<TradeFormFields, unknown, TradeInput>({
    resolver: standardSchemaResolver(tradeSchema),
    defaultValues: buildDefaults(accounts, trade),
  });
  const { handleSubmit, setError, getValues, formState } = form;

  const onSubmit = handleSubmit(async (data) => {
    const fileList = getValues("screenshots");
    const files = fileList ? Array.from(fileList) : [];

    const res = await action(data, files);

    if (res.ok) {
      router.push(`/trades/${res.id}`);
      return;
    }
    // Errores por campo → al input correspondiente (mensaje = clave i18n).
    for (const [name, msgs] of Object.entries(res.fieldErrors ?? {})) {
      if (msgs?.[0]) {
        setError(name as keyof TradeFormInput, { message: msgs[0] });
      }
    }
    // Error general → a nivel de formulario.
    if (res.formError) setError("root", { message: res.formError });
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              name="accountId"
              label={t("account")}
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            />
            <TextField
              name="symbol"
              label={t("symbol")}
              placeholder={t("symbolPlaceholder")}
            />
            <SelectField
              name="direction"
              label={t("direction")}
              options={[
                { value: "long", label: t("directions.long") },
                { value: "short", label: t("directions.short") },
              ]}
            />
            <SelectField
              name="session"
              label={t("session")}
              options={[
                { value: "none", label: t("sessions.none") },
                ...SESSIONS.map((s) => ({ value: s, label: t(`sessions.${s}`) })),
              ]}
            />
            <TextField name="openedAt" label={t("openedAt")} type="datetime-local" />
            <TextField name="closedAt" label={t("closedAt")} type="datetime-local" />
            <TextField name="entryPrice" label={t("entryPrice")} />
            <TextField name="exitPrice" label={t("exitPrice")} />
            <TextField name="quantity" label={t("quantity")} />
            <TextField name="leverage" label={t("leverage")} />
            <TextField name="grossPnl" label={t("grossPnl")} />
            <TextField name="fees" label={t("fees")} />
            <TextField name="plannedRr" label={t("plannedRr")} />
            <TextField name="realizedRr" label={t("realizedRr")} />
            <TextField name="riskAmount" label={t("riskAmount")} />
            {setups.length > 0 && (
              <SelectField
                name="setupId"
                label={t("setup")}
                options={[
                  { value: "none", label: t("noSetup") },
                  ...setups.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
            )}
          </div>

          <Field>
            <FieldLabel htmlFor="notes">{t("notes")}</FieldLabel>
            <Textarea id="notes" rows={4} {...form.register("notes")} />
          </Field>

          <Field>
            <FieldLabel htmlFor="screenshots">{t("screenshots")}</FieldLabel>
            {/* Las capturas se manejan aparte del esquema (zod las ignora). */}
            <Input
              id="screenshots"
              type="file"
              accept="image/*"
              multiple
              {...form.register("screenshots")}
            />
            <FieldDescription>{t("screenshotsHint")}</FieldDescription>
          </Field>

          {formState.errors.root?.message && (
            <p className="text-sm text-destructive" role="alert">
              {tv(formState.errors.root.message)}
            </p>
          )}

          <Button type="submit" disabled={formState.isSubmitting}>
            {mode === "create" ? t("submitCreate") : t("submitEdit")}
          </Button>
        </FieldGroup>
      </form>
    </FormProvider>
  );
}
