import { getTranslations } from "next-intl/server";

import { ResultBadge } from "@/components/molecules/result-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/lib/i18n/navigation";
import { displayR, returnPct } from "@/lib/metrics/trade";
import { formatMoney } from "@/lib/money";
import type { TradeListItem } from "@/server/queries/trades";

function pnlClass(value: string) {
  const n = Number(value);
  if (n > 0) return "text-win";
  if (n < 0) return "text-loss";
  return "text-muted-foreground";
}

/** R-múltiplo: "2.6R", "-1R", "—". Muestra hasta 2 decimales sin ceros de más. */
export function formatR(r: number | null) {
  if (r === null) return "—";
  return `${r.toFixed(2).replace(/\.?0+$/, "")}R`;
}

export function formatReturnPct(p: number | null) {
  return p === null ? "—" : `${(p * 100).toFixed(2)}%`;
}

export function rClass(r: number | null) {
  if (r === null) return "text-muted-foreground";
  if (r > 0) return "text-win";
  if (r < 0) return "text-loss";
  return "text-muted-foreground";
}

export async function TradeTable({
  trades,
  locale,
}: {
  trades: TradeListItem[];
  locale: string;
}) {
  const t = await getTranslations("trades.table");
  const dateFmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  if (trades.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        {t("empty")}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("opened")}</TableHead>
          <TableHead>{t("symbol")}</TableHead>
          <TableHead>{t("direction")}</TableHead>
          <TableHead>{t("result")}</TableHead>
          <TableHead>{t("account")}</TableHead>
          <TableHead className="text-right">{t("netPnl")}</TableHead>
          <TableHead className="text-right">{t("r")}</TableHead>
          <TableHead className="text-right">{t("returnPct")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trades.map((tr) => {
          const r = displayR(tr.realizedRr, tr.netPnl, tr.riskAmount);
          const ret = returnPct(tr.direction, tr.entryPrice, tr.exitPrice);
          return (
            <TableRow key={tr.id} className="cursor-pointer">
              <TableCell>
                <Link
                  href={`/trades/${tr.id}`}
                  className="block hover:underline"
                >
                  {dateFmt.format(new Date(tr.openedAt))}
                </Link>
              </TableCell>
              <TableCell className="font-medium">{tr.symbol}</TableCell>
              <TableCell>{t(`directions.${tr.direction}`)}</TableCell>
              <TableCell>
                <ResultBadge result={tr.result} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tr.accountName}
              </TableCell>
              <TableCell className={`text-right tabular-nums ${pnlClass(tr.netPnl)}`}>
                {formatMoney(tr.netPnl)}
              </TableCell>
              <TableCell className={`text-right font-medium tabular-nums ${rClass(r)}`}>
                {formatR(r)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {formatReturnPct(ret)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
