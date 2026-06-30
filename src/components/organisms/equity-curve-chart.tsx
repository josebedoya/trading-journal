"use client";

import dynamic from "next/dynamic";

import type { CurvePoint } from "@/lib/metrics/metrics";

// Recharts es pesado → se carga client-side en su propio chunk (bundle-dynamic-imports).
const Impl = dynamic(() => import("./equity-curve-chart-impl"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full animate-pulse rounded-lg bg-muted/40" />
  ),
});

export function EquityCurveChart(props: {
  points: CurvePoint[];
  currency: string;
}) {
  return <Impl {...props} />;
}
