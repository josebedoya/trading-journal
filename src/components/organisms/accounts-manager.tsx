"use client";

import { useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useActionState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  archiveAccount,
  createAccount,
  unarchiveAccount,
  updateAccount,
  type AccountState,
} from "@/server/actions/accounts";

type Account = {
  id: string;
  name: string;
  exchange: string | null;
  currency: string;
  startingBalance: string;
  status: "active" | "archived";
};

const emptyState: AccountState = { error: null };

function Fields({ account }: { account?: Account }) {
  const t = useTranslations("accounts");
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="name">{t("fields.name")}</Label>
        <Input id="name" name="name" defaultValue={account?.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="exchange">{t("fields.exchange")}</Label>
        <Input
          id="exchange"
          name="exchange"
          defaultValue={account?.exchange ?? ""}
          placeholder="Bitget"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="currency">{t("fields.currency")}</Label>
        <Input
          id="currency"
          name="currency"
          defaultValue={account?.currency ?? "USD"}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="startingBalance">{t("fields.startingBalance")}</Label>
        <Input
          id="startingBalance"
          name="startingBalance"
          inputMode="decimal"
          defaultValue={account?.startingBalance ?? "0"}
        />
      </div>
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {label}
    </Button>
  );
}

function ErrorText({ error }: { error: string | null }) {
  const t = useTranslations("accounts");
  if (!error) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {t(`errors.${error}`)}
    </p>
  );
}

function CreateForm({ disabled }: { disabled: boolean }) {
  const t = useTranslations("accounts");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(
    async (prev: AccountState, fd: FormData) => {
      const res = await createAccount(prev, fd);
      if (res.ok) formRef.current?.reset();
      return res;
    },
    emptyState,
  );

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
          <form ref={formRef} action={action} className="space-y-4">
            <Fields />
            <ErrorText error={state.error} />
            <SubmitButton label={t("create.submit")} />
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function EditDialog({ account }: { account: Account }) {
  const t = useTranslations("accounts");
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(
    async (prev: AccountState, fd: FormData) => {
      const res = await updateAccount(prev, fd);
      if (res.ok) setOpen(false);
      return res;
    },
    emptyState,
  );

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
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={account.id} />
          <Fields account={account} />
          <ErrorText error={state.error} />
          <DialogFooter>
            <SubmitButton label={t("edit.submit")} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatusButton({ account }: { account: Account }) {
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
          await (archive ? archiveAccount(account.id) : unarchiveAccount(account.id));
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
}: {
  accounts: Account[];
  activeCount: number;
  maxAccounts: number;
  isAdmin: boolean;
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

      <CreateForm disabled={quotaReached} />

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
                    amount: a.startingBalance,
                    currency: a.currency,
                  })}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <EditDialog account={a} />
                <StatusButton account={a} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
