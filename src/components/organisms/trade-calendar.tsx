import { getTranslations } from "next-intl/server";

import type { DailyStat } from "@/lib/metrics/metrics";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Cell = { day: number; key: string; stat: DailyStat | null } | null;

function netClass(net: number) {
  if (net > 0) return "text-win";
  if (net < 0) return "text-loss";
  return "text-muted-foreground";
}

function buildMonth(year: number, month: number, byDay: Map<string, DailyStat>) {
  const first = new Date(Date.UTC(year, month, 1));
  // Lunes = 0 ... Domingo = 6
  const lead = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells: Cell[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, key, stat: byDay.get(key) ?? null });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export async function TradeCalendar({
  daily,
  locale,
  timeZone = "UTC",
}: {
  daily: DailyStat[];
  locale: string;
  timeZone?: string;
}) {
  const t = await getTranslations("dashboard.calendar");

  // "Hoy" en la zona horaria del usuario → mes a mostrar.
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month1] = todayKey.split("-").map(Number);
  const month = month1 - 1;
  const monthPrefix = `${year}-${String(month1).padStart(2, "0")}`;

  const byDay = new Map(daily.map((d) => [d.day, d]));
  const weeks = buildMonth(year, month, byDay);

  // Stats del mes: total y días tradeados (solo del mes mostrado).
  const monthDays = daily.filter((d) => d.day.startsWith(monthPrefix));
  const monthNet = monthDays.reduce((s, d) => s + d.net, 0);
  const monthTradedDays = monthDays.length;

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));

  const weekdayFmt = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: "UTC",
  });
  // 2024-01-01 (UTC) fue lunes → semana Lun..Dom alineada con buildMonth.
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    weekdayFmt.format(new Date(Date.UTC(2024, 0, 1 + i))),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium first-letter:uppercase">
          {monthLabel}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t("monthlyStats")}</span>
          <span className={cn("font-semibold tabular-nums", netClass(monthNet))}>
            {formatMoney(monthNet)}
          </span>
          <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
            {t("daysCount", { count: monthTradedDays })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(7,1fr)_minmax(7rem,auto)] gap-1 text-xs">
        {weekdays.map((w) => (
          <div key={w} className="px-1 py-1 text-center text-muted-foreground">
            {w}
          </div>
        ))}
        <div />

        {weeks.map((week, wi) => (
          <WeekRow key={wi} week={week} weekNumber={wi + 1} t={t} />
        ))}
      </div>
    </div>
  );
}

function WeekRow({
  week,
  weekNumber,
  t,
}: {
  week: Cell[];
  weekNumber: number;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const weekNet = week.reduce((s, c) => s + (c?.stat?.net ?? 0), 0);
  const daysTraded = week.filter((c) => c?.stat).length;

  return (
    <>
      {week.map((cell, i) => (
        <div
          key={i}
          className={cn(
            "flex min-h-26 flex-col rounded-md border p-1.5",
            cell == null && "border-transparent",
            cell?.stat && cell.stat.net > 0 && "border-win/30 bg-win/10",
            cell?.stat && cell.stat.net < 0 && "border-loss/30 bg-loss/10",
            cell?.stat && cell.stat.net === 0 && "bg-muted/40",
          )}
        >
          {cell && (
            <>
              <span className="text-right text-xs text-muted-foreground">
                {cell.day}
              </span>
              {cell.stat && (
                <div className="mt-auto text-end leading-tight">
                  <p
                    className={cn(
                      "text-lg font-semibold tabular-nums",
                      netClass(cell.stat.net),
                    )}
                  >
                    {formatMoney(cell.stat.net)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("tradesCount", { count: cell.stat.trades })}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {((cell.stat.wins / cell.stat.trades) * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      ))}

      <div className="flex min-h-26 flex-col justify-center gap-1 rounded-md border bg-muted/30 px-3 py-2">
        <p className="text-sm text-muted-foreground">
          {t("week", { number: weekNumber })}
        </p>
        <p className={cn("text-xl font-semibold tabular-nums", netClass(weekNet))}>
          {formatMoney(weekNet)}
        </p>
        <span className="w-fit rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {t("daysCount", { count: daysTraded })}
        </span>
      </div>
    </>
  );
}
