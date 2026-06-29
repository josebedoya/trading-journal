import { getTranslations } from "next-intl/server";

import { DeleteTradeButton } from "@/components/molecules/delete-trade-button";
import { ImageThumb } from "@/components/molecules/image-thumb";
import { ResultBadge } from "@/components/molecules/result-badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";
import { holdTimeMs, roi } from "@/lib/metrics/trade";
import type { accounts, trades } from "@/lib/db/schema";

type Trade = typeof trades.$inferSelect;
type Account = typeof accounts.$inferSelect;
type Shot = { id: string; url: string | null; caption: string | null };

function fmtHold(ms: number | null): string {
  if (ms === null) return "—";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

export async function TradeDetail({
  trade,
  account,
  screenshots,
  locale,
}: {
  trade: Trade;
  account: Account;
  screenshots: Shot[];
  locale: string;
}) {
  const t = await getTranslations("trades.detail");
  const dateFmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const r = roi(trade.netPnl, trade.entryPrice, trade.quantity);
  const cur = account.currency;

  const rows: [string, string][] = [
    [t("account"), account.name],
    [t("direction"), t(`directions.${trade.direction}`)],
    [t("session"), trade.session ? t(`sessions.${trade.session}`) : "—"],
    [t("opened"), dateFmt.format(new Date(trade.openedAt))],
    [t("closed"), trade.closedAt ? dateFmt.format(new Date(trade.closedAt)) : "—"],
    [t("holdTime"), fmtHold(holdTimeMs(trade.openedAt, trade.closedAt))],
    [t("entryPrice"), trade.entryPrice ?? "—"],
    [t("exitPrice"), trade.exitPrice ?? "—"],
    [t("quantity"), trade.quantity ?? "—"],
    [t("leverage"), trade.leverage ? `${trade.leverage}x` : "—"],
    [t("grossPnl"), `${trade.grossPnl} ${cur}`],
    [t("fees"), `${trade.fees} ${cur}`],
    [t("netPnl"), `${trade.netPnl} ${cur}`],
    [t("roi"), r === null ? "—" : `${(r * 100).toFixed(2)}%`],
    [t("plannedRr"), trade.plannedRr ?? "—"],
    [t("realizedRr"), trade.realizedRr ?? "—"],
    [t("riskAmount"), trade.riskAmount ? `${trade.riskAmount} ${cur}` : "—"],
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {trade.symbol}
          </h1>
          <ResultBadge result={trade.result} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/trades/${trade.id}/edit`}>{t("edit")}</Link>
          </Button>
          <DeleteTradeButton id={trade.id} />
        </div>
      </div>

      <dl className="grid gap-x-8 gap-y-3 rounded-lg border p-6 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {trade.notes && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t("notes")}
          </h2>
          <p className="whitespace-pre-wrap rounded-lg border p-4 text-sm">
            {trade.notes}
          </p>
        </section>
      )}

      {screenshots.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t("screenshots")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {screenshots.map((s) => (
              <ImageThumb key={s.id} id={s.id} url={s.url} caption={s.caption} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
