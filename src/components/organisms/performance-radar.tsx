"use client";

import dynamic from "next/dynamic";

import type { RadarAxis } from "@/lib/metrics/trade-score";

// Recharts es pesado → se carga client-side en su propio chunk (bundle-dynamic-imports).
const Impl = dynamic(() => import("./performance-radar-impl"), {
  ssr: false,
  loading: () => (
    <div className="h-72 w-full animate-pulse rounded-lg bg-muted/40" />
  ),
});

export function PerformanceRadar(props: { axes: RadarAxis[]; score: number }) {
  return <Impl {...props} />;
}
