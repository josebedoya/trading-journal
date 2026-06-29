"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createTrade,
  updateTrade,
  type TradeState,
} from "@/server/actions/trades";

type AccountOpt = { id: string; name: string };
type SetupOpt = { id: string; name: string };

export type TradeFormValues = {
  id: string;
  accountId: string;
  symbol: string;
  direction: "long" | "short";
  openedAt: Date;
  closedAt: Date | null;
  entryPrice: string | null;
  exitPrice: string | null;
  quantity: string | null;
  leverage: string | null;
  fees: string;
  grossPnl: string;
  plannedRr: string | null;
  realizedRr: string | null;
  riskAmount: string | null;
  session: string | null;
  setupId: string | null;
  notes: string | null;
};

const SESSIONS = ["asia", "london", "newyork", "overlap", "other"] as const;

function toLocalInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {label}
    </Button>
  );
}

function Field({
  name,
  label,
  defaultValue,
  required,
  type = "text",
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        inputMode={type === "text" ? "decimal" : undefined}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
      />
    </div>
  );
}

export function TradeForm({
  mode,
  accounts,
  setups,
  trade,
}: {
  mode: "create" | "edit";
  accounts: AccountOpt[];
  setups: SetupOpt[];
  trade?: TradeFormValues;
}) {
  const t = useTranslations("trades.form");
  const locale = useLocale();
  const [state, action] = useActionState<TradeState, FormData>(
    mode === "create" ? createTrade : updateTrade,
    { error: null },
  );

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      {mode === "edit" && trade && (
        <input type="hidden" name="id" value={trade.id} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("account")}</Label>
          <Select
            name="accountId"
            defaultValue={trade?.accountId ?? accounts[0]?.id}
          >
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

        <Field
          name="symbol"
          label={t("symbol")}
          defaultValue={trade?.symbol}
          required
          placeholder="BTC/USDT"
        />

        <div className="space-y-2">
          <Label>{t("direction")}</Label>
          <Select name="direction" defaultValue={trade?.direction ?? "long"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="long">{t("directions.long")}</SelectItem>
              <SelectItem value="short">{t("directions.short")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("session")}</Label>
          <Select name="session" defaultValue={trade?.session ?? "none"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("sessions.none")}</SelectItem>
              {SESSIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`sessions.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Field
          name="openedAt"
          label={t("openedAt")}
          type="datetime-local"
          defaultValue={toLocalInput(trade?.openedAt ?? null)}
          required
        />
        <Field
          name="closedAt"
          label={t("closedAt")}
          type="datetime-local"
          defaultValue={toLocalInput(trade?.closedAt ?? null)}
        />

        <Field name="entryPrice" label={t("entryPrice")} defaultValue={trade?.entryPrice ?? ""} />
        <Field name="exitPrice" label={t("exitPrice")} defaultValue={trade?.exitPrice ?? ""} />
        <Field name="quantity" label={t("quantity")} defaultValue={trade?.quantity ?? ""} />
        <Field name="leverage" label={t("leverage")} defaultValue={trade?.leverage ?? ""} />

        <Field
          name="grossPnl"
          label={t("grossPnl")}
          defaultValue={trade?.grossPnl}
          required
        />
        <Field name="fees" label={t("fees")} defaultValue={trade?.fees ?? "0"} />

        <Field name="plannedRr" label={t("plannedRr")} defaultValue={trade?.plannedRr ?? ""} />
        <Field name="realizedRr" label={t("realizedRr")} defaultValue={trade?.realizedRr ?? ""} />
        <Field name="riskAmount" label={t("riskAmount")} defaultValue={trade?.riskAmount ?? ""} />

        {setups.length > 0 && (
          <div className="space-y-2">
            <Label>{t("setup")}</Label>
            <Select name="setupId" defaultValue={trade?.setupId ?? "none"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("noSetup")}</SelectItem>
                {setups.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea id="notes" name="notes" rows={4} defaultValue={trade?.notes ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="screenshots">{t("screenshots")}</Label>
        <Input
          id="screenshots"
          name="screenshots"
          type="file"
          accept="image/*"
          multiple
        />
        <p className="text-xs text-muted-foreground">{t("screenshotsHint")}</p>
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {t(`errors.${state.error}`)}
        </p>
      )}

      <SubmitButton label={mode === "create" ? t("submitCreate") : t("submitEdit")} />
    </form>
  );
}
