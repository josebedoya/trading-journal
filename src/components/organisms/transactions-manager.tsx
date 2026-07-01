"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useTransition } from "react";
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
  type UseFormReturn,
} from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import {
  transactionSchema,
  type TransactionFormInput,
  type TransactionInput,
} from "@/lib/validations/transaction";
import type { TransactionActionResult } from "@/server/actions/transactions";

type CreateAction = (input: TransactionInput) => Promise<TransactionActionResult>;
type DeleteAction = (id: string) => Promise<void>;

type AccountOpt = { id: string; name: string };
type Tx = {
  id: string;
  type: "deposit" | "withdrawal";
  amount: string;
  occurredAt: Date;
  note: string | null;
  accountName: string;
  currency: string;
};

function applyErrors(
  form: UseFormReturn<TransactionFormInput, unknown, TransactionInput>,
  res: Extract<TransactionActionResult, { ok: false }>,
) {
  for (const [name, msgs] of Object.entries(res.fieldErrors ?? {})) {
    if (msgs?.[0])
      form.setError(name as keyof TransactionFormInput, { message: msgs[0] });
  }
  if (res.formError) form.setError("root", { message: res.formError });
}

function TextField({
  name,
  label,
  type = "text",
  freeText,
  className,
}: {
  name: keyof TransactionFormInput;
  label: string;
  type?: string;
  freeText?: boolean;
  className?: string;
}) {
  const { register, formState } = useFormContext<TransactionFormInput>();
  const tv = useTranslations();
  const error = formState.errors[name];
  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        type={type}
        inputMode={freeText || type !== "text" ? undefined : "decimal"}
        aria-invalid={!!error}
        {...register(name)}
      />
      <FieldError>
        {error?.message ? tv(error.message as string) : null}
      </FieldError>
    </Field>
  );
}

function SelectField({
  name,
  label,
  options,
}: {
  name: keyof TransactionFormInput;
  label: string;
  options: { value: string; label: string }[];
}) {
  const { control, formState } = useFormContext<TransactionFormInput>();
  const tv = useTranslations();
  const error = formState.errors[name];
  return (
    <Field data-invalid={!!error}>
      <FieldLabel>{label}</FieldLabel>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select value={(field.value as string) ?? ""} onValueChange={field.onChange}>
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

function DeleteButton({ id, onDelete }: { id: string; onDelete: DeleteAction }) {
  const t = useTranslations("transactions");
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(async () => void (await onDelete(id)))}
    >
      {t("delete")}
    </Button>
  );
}

function CreateForm({
  accounts,
  createAction,
}: {
  accounts: AccountOpt[];
  createAction: CreateAction;
}) {
  const t = useTranslations("transactions");
  const tv = useTranslations();
  const form = useForm<TransactionFormInput, unknown, TransactionInput>({
    resolver: standardSchemaResolver(transactionSchema),
    defaultValues: {
      accountId: accounts[0]?.id ?? "",
      type: "deposit",
      amount: "",
      occurredAt: "",
      note: "",
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    const res = await createAction(data);
    if (res.ok) {
      form.reset();
      return;
    }
    applyErrors(form, res);
  });

  const rootError = form.formState.errors.root?.message;

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="accountId"
          label={t("account")}
          options={accounts.map((a) => ({ value: a.id, label: a.name }))}
        />
        <SelectField
          name="type"
          label={t("type")}
          options={[
            { value: "deposit", label: t("types.deposit") },
            { value: "withdrawal", label: t("types.withdrawal") },
          ]}
        />
        <TextField name="amount" label={t("amount")} />
        <TextField name="occurredAt" label={t("occurredAt")} type="date" />
        <TextField name="note" label={t("note")} freeText className="sm:col-span-2" />
        {rootError && (
          <p className="text-sm text-destructive sm:col-span-2" role="alert">
            {tv(rootError)}
          </p>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {t("submit")}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

export function TransactionsManager({
  accounts,
  transactions,
  createAction,
  deleteAction,
}: {
  accounts: AccountOpt[];
  transactions: Tx[];
  createAction: CreateAction;
  deleteAction: DeleteAction;
}) {
  const t = useTranslations("transactions");
  const locale = useLocale();
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("new")}</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noAccounts")}</p>
          ) : (
            <CreateForm accounts={accounts} createAction={createAction} />
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">{t("history")}</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <div className="flex items-center gap-3 text-sm">
                <span
                  className={
                    tx.type === "deposit"
                      ? "font-medium text-win"
                      : "font-medium text-loss"
                  }
                >
                  {formatMoney(
                    tx.type === "deposit"
                      ? Number(tx.amount)
                      : -Number(tx.amount),
                  )}
                </span>
                <span className="text-muted-foreground">
                  {t(`types.${tx.type}`)} · {tx.accountName} ·{" "}
                  {dateFmt.format(new Date(tx.occurredAt))}
                </span>
                {tx.note && (
                  <span className="text-muted-foreground">— {tx.note}</span>
                )}
              </div>
              <DeleteButton id={tx.id} onDelete={deleteAction} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
