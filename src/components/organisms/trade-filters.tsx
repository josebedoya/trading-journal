"use client";

import { useTranslations } from "next-intl";

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
import { usePathname, useRouter } from "@/lib/i18n/navigation";

type Props = {
  result?: string;
  from?: string;
  to?: string;
};

export function TradeFilters({ result, from, to }: Props) {
  const t = useTranslations("trades.filters");
  const router = useRouter();
  const pathname = usePathname();

  function apply(form: FormData) {
    const params = new URLSearchParams();
    const r = String(form.get("result") ?? "");
    const f = String(form.get("from") ?? "");
    const tt = String(form.get("to") ?? "");
    if (r && r !== "all") params.set("result", r);
    if (f) params.set("from", f);
    if (tt) params.set("to", tt);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <form
      action={apply}
      className="flex flex-wrap items-end gap-3 rounded-lg border p-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="from">{t("from")}</Label>
        <Input id="from" name="from" type="date" defaultValue={from} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="to">{t("to")}</Label>
        <Input id="to" name="to" type="date" defaultValue={to} />
      </div>
      <div className="space-y-1.5">
        <Label>{t("result")}</Label>
        <Select name="result" defaultValue={result ?? "all"}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allResults")}</SelectItem>
            <SelectItem value="win">{t("win")}</SelectItem>
            <SelectItem value="loss">{t("loss")}</SelectItem>
            <SelectItem value="breakeven">{t("breakeven")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" variant="secondary">
        {t("apply")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => router.replace(pathname)}
      >
        {t("clear")}
      </Button>
    </form>
  );
}
