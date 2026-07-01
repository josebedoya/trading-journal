"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useState, useTransition } from "react";
import {
  FormProvider,
  useForm,
  useFormContext,
  type UseFormReturn,
} from "react-hook-form";
import { useTranslations } from "next-intl";

import { AccountChip } from "@/components/molecules/account-chip";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import {
  accountSchema,
  type AccountFormInput,
  type AccountInput,
} from "@/lib/validations/account";
import type { AccountActionResult } from "@/server/actions/accounts";

type CreateAction = (input: AccountInput) => Promise<AccountActionResult>;
type UpdateAction = (
  id: string,
  input: AccountInput,
) => Promise<AccountActionResult>;
type ToggleAction = (id: string) => Promise<AccountActionResult>;

type Account = {
  id: string;
  name: string;
  exchange: string | null;
  currency: string;
  startingBalance: string;
  status: "active" | "archived";
};

/** Vuelca los errores del server (claves i18n) al formulario RHF. */
function applyErrors(
  form: UseFormReturn<AccountFormInput, unknown, AccountInput>,
  res: Extract<AccountActionResult, { ok: false }>,
) {
  for (const [name, msgs] of Object.entries(res.fieldErrors ?? {})) {
    if (msgs?.[0]) form.setError(name as keyof AccountFormInput, { message: msgs[0] });
  }
  if (res.formError) form.setError("root", { message: res.formError });
}

/** Input de texto enlazado a RHF + error i18n bajo el primitivo Field. */
function TextField({
  name,
  label,
  placeholder,
  freeText,
  className,
}: {
  name: keyof AccountFormInput;
  label: string;
  placeholder?: string;
  freeText?: boolean;
  className?: string;
}) {
  const { register, formState } = useFormContext<AccountFormInput>();
  const tv = useTranslations();
  const error = formState.errors[name];
  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        inputMode={freeText ? "text" : "decimal"}
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

function FormFields() {
  const t = useTranslations("accounts.fields");
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField name="name" label={t("name")} freeText className="sm:col-span-2" />
      <TextField
        name="exchange"
        label={t("exchange")}
        placeholder={t("exchangePlaceholder")}
        freeText
      />
      <TextField name="currency" label={t("currency")} freeText />
      <TextField
        name="startingBalance"
        label={t("startingBalance")}
        className="sm:col-span-2"
      />
    </div>
  );
}

function RootError({
  form,
}: {
  form: UseFormReturn<AccountFormInput, unknown, AccountInput>;
}) {
  const tv = useTranslations();
  const msg = form.formState.errors.root?.message;
  if (!msg) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {tv(msg)}
    </p>
  );
}

function CreateForm({
  disabled,
  createAction,
}: {
  disabled: boolean;
  createAction: CreateAction;
}) {
  const t = useTranslations("accounts");
  const form = useForm<AccountFormInput, unknown, AccountInput>({
    resolver: standardSchemaResolver(accountSchema),
    defaultValues: { name: "", exchange: "", currency: "USD", startingBalance: "0" },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    const res = await createAction(data);
    if (res.ok) {
      form.reset();
      return;
    }
    applyErrors(form, res);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("create.title")}</CardTitle>
        <CardDescription>{t("create.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {disabled ? (
          <p className="text-sm text-muted-foreground">{t("errors.quota_reached")}</p>
        ) : (
          <FormProvider {...form}>
            <form onSubmit={onSubmit} className="space-y-4">
              <FormFields />
              <RootError form={form} />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {t("create.submit")}
              </Button>
            </form>
          </FormProvider>
        )}
      </CardContent>
    </Card>
  );
}

function EditDialog({
  account,
  updateAction,
}: {
  account: Account;
  updateAction: UpdateAction;
}) {
  const t = useTranslations("accounts");
  const [open, setOpen] = useState(false);
  const form = useForm<AccountFormInput, unknown, AccountInput>({
    resolver: standardSchemaResolver(accountSchema),
    defaultValues: {
      name: account.name,
      exchange: account.exchange ?? "",
      currency: account.currency,
      startingBalance: account.startingBalance,
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    const res = await updateAction(account.id, data);
    if (res.ok) {
      setOpen(false);
      return;
    }
    applyErrors(form, res);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t("edit.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
          <DialogDescription>{account.name}</DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormFields />
            <RootError form={form} />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {t("edit.submit")}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function StatusButton({
  account,
  archiveAction,
  unarchiveAction,
}: {
  account: Account;
  archiveAction: ToggleAction;
  unarchiveAction: ToggleAction;
}) {
  const t = useTranslations("accounts");
  const [pending, startTransition] = useTransition();
  const archive = account.status === "active";

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await (archive ? archiveAction(account.id) : unarchiveAction(account.id));
        })
      }
    >
      {archive ? t("archive") : t("unarchive")}
    </Button>
  );
}

export function AccountsManager({
  accounts,
  activeCount,
  maxAccounts,
  isAdmin,
  createAction,
  updateAction,
  archiveAction,
  unarchiveAction,
}: {
  accounts: Account[];
  activeCount: number;
  maxAccounts: number;
  isAdmin: boolean;
  createAction: CreateAction;
  updateAction: UpdateAction;
  archiveAction: ToggleAction;
  unarchiveAction: ToggleAction;
}) {
  const t = useTranslations("accounts");
  const quotaReached = !isAdmin && activeCount >= maxAccounts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{t("title")}</h2>
        <span className="text-sm text-muted-foreground">
          {isAdmin
            ? t("quotaUnlimited", { active: activeCount })
            : t("quota", { active: activeCount, max: maxAccounts })}
        </span>
      </div>

      <CreateForm disabled={quotaReached} createAction={createAction} />

      <div className="space-y-2">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          accounts.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <div className="space-y-0.5">
                <AccountChip
                  name={a.name}
                  status={a.status}
                  exchange={a.exchange}
                />
                <p className="text-xs text-muted-foreground">
                  {t("startingBalanceLabel", {
                    amount: formatMoney(a.startingBalance),
                  })}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <EditDialog account={a} updateAction={updateAction} />
                <StatusButton
                  account={a}
                  archiveAction={archiveAction}
                  unarchiveAction={unarchiveAction}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
