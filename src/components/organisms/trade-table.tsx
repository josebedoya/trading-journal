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
import { roi } from "@/lib/metrics/trade";
import type { TradeListItem } from "@/server/queries/trades";

function money(value: string, currency: string) {
  const n = Number(value);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)} ${currency}`;
}

function pnlClass(value: string) {
  const n = Number(value);
  if (n > 0) return "text-win";
  if (n < 0) return "text-loss";
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
          <TableHead className="text-right">{t("roi")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trades.map((tr) => {
          const r = roi(tr.netPnl, tr.entryPrice, tr.quantity);
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
                {money(tr.netPnl, tr.currency)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {r === null ? "—" : `${(r * 100).toFixed(2)}%`}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
