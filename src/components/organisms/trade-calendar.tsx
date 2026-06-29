import { getTranslations } from "next-intl/server";

import type { DailyNet } from "@/lib/metrics/metrics";
import { cn } from "@/lib/utils";

type Cell = { day: number; key: string; net: number | null } | null;

function buildMonth(year: number, month: number, byDay: Map<string, number>) {
  const first = new Date(Date.UTC(year, month, 1));
  // Lunes = 0 ... Domingo = 6
  const lead = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells: Cell[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, key, net: byDay.has(key) ? byDay.get(key)! : null });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export async function TradeCalendar({
  daily,
  currency,
  locale,
}: {
  daily: DailyNet[];
  currency: string;
  locale: string;
}) {
  const t = await getTranslations("dashboard.calendar");
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const byDay = new Map(daily.map((d) => [d.day, d.net]));
  const weeks = buildMonth(year, month, byDay);

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(now);

  // Nombres de día (Lun..Dom) a partir de una semana de referencia.
  const weekdayFmt = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: "UTC",
  });
  // 2024-01-01 (UTC) fue lunes → semana Lun..Dom alineada con buildMonth.
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    weekdayFmt.format(new Date(Date.UTC(2024, 0, 1 + i))),
  );

  const fmtNet = (n: number) =>
    `${n >= 0 ? "+" : ""}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium first-letter:uppercase">{monthLabel}</p>
      <div className="grid grid-cols-[repeat(7,1fr)_auto] gap-1 text-xs">
        {weekdays.map((w) => (
          <div key={w} className="px-1 py-1 text-center text-muted-foreground">
            {w}
          </div>
        ))}
        <div className="px-1 py-1 text-center text-muted-foreground">
          {t("weekTotal")}
        </div>

        {weeks.map((week, wi) => {
          const weekTotal = week.reduce((s, c) => s + (c?.net ?? 0), 0);
          const hasData = week.some((c) => c?.net != null);
          return (
            <WeekRow
              key={wi}
              week={week}
              weekTotal={weekTotal}
              hasData={hasData}
              fmtNet={fmtNet}
              currency={currency}
            />
          );
        })}
      </div>
    </div>
  );
}

function WeekRow({
  week,
  weekTotal,
  hasData,
  fmtNet,
  currency,
}: {
  week: Cell[];
  weekTotal: number;
  hasData: boolean;
  fmtNet: (n: number) => string;
  currency: string;
}) {
  return (
    <>
      {week.map((cell, i) => (
        <div
          key={i}
          className={cn(
            "flex min-h-14 flex-col rounded-md border p-1",
            cell == null && "border-transparent",
            cell?.net != null && cell.net > 0 && "border-win/30 bg-win/10",
            cell?.net != null && cell.net < 0 && "border-loss/30 bg-loss/10",
          )}
        >
          {cell && (
            <>
              <span className="text-[10px] text-muted-foreground">{cell.day}</span>
              {cell.net != null && (
                <span
                  className={cn(
                    "mt-auto text-right text-[11px] font-medium tabular-nums",
                    cell.net > 0 ? "text-win" : cell.net < 0 ? "text-loss" : "",
                  )}
                >
                  {fmtNet(cell.net)}
                </span>
              )}
            </>
          )}
        </div>
      ))}
      <div
        className={cn(
          "flex min-h-14 flex-col justify-center rounded-md border px-2 text-right",
          hasData ? "bg-muted/40" : "border-transparent",
        )}
      >
        {hasData && (
          <span
            className={cn(
              "text-xs font-semibold tabular-nums",
              weekTotal > 0 ? "text-win" : weekTotal < 0 ? "text-loss" : "",
            )}
          >
            {fmtNet(weekTotal)} {currency}
          </span>
        )}
      </div>
    </>
  );
}
