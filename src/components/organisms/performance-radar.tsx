"use client";

import { useTranslations } from "next-intl";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import type { RadarAxis } from "@/lib/metrics/trade-score";

export function PerformanceRadar({
  axes,
  score,
}: {
  axes: RadarAxis[];
  score: number;
}) {
  const t = useTranslations("dashboard.radar");
  const data = axes.map((a) => ({ axis: t(`axes.${a.axis}`), value: a.value }));

  return (
    <div className="flex flex-col items-center">
      <div className="text-center">
        <p className="text-4xl font-semibold tabular-nums">{score}</p>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("score")}
        </p>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              dataKey="value"
              stroke="var(--primary)"
              fill="var(--primary)"
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
