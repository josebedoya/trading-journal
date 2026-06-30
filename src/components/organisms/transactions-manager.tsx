"use client";

import { useRef, useState, useTransition } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import type { TransactionState } from "@/server/actions/transactions";

type CreateAction = (
  state: TransactionState,
  formData: FormData,
) => Promise<TransactionState>;
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

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {label}
    </Button>
  );
}

function DeleteButton({
  id,
  onDelete,
}: {
  id: string;
  onDelete: DeleteAction;
}) {
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
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState("deposit");
  const [state, action] = useActionState(
    async (prev: TransactionState, fd: FormData) => {
      const res = await createAction(prev, fd);
      if (res.ok) {
        formRef.current?.reset();
        setType("deposit");
      }
      return res;
    },
    { error: null } as TransactionState,
  );

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
            <form ref={formRef} action={action} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("account")}</Label>
                <Select name="accountId" defaultValue={accounts[0]?.id}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("type")}</Label>
                <Select name="type" value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">{t("types.deposit")}</SelectItem>
                    <SelectItem value="withdrawal">
                      {t("types.withdrawal")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">{t("amount")}</Label>
                <Input id="amount" name="amount" inputMode="decimal" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="occurredAt">{t("occurredAt")}</Label>
                <Input id="occurredAt" name="occurredAt" type="date" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="note">{t("note")}</Label>
                <Input id="note" name="note" />
              </div>
              {state.error && (
                <p className="text-sm text-destructive sm:col-span-2" role="alert">
                  {t(`errors.${state.error}`)}
                </p>
              )}
              <div className="sm:col-span-2">
                <SubmitButton label={t("submit")} />
              </div>
            </form>
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
