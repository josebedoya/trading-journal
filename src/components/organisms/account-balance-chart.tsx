"use client";

import dynamic from "next/dynamic";

import type { BalancePoint } from "@/server/queries/transactions";

// Recharts es pesado → se carga client-side en su propio chunk (bundle-dynamic-imports).
const Impl = dynamic(() => import("./account-balance-chart-impl"), {
  ssr: false,
  loading: () => (
    <div className="h-72 w-full animate-pulse rounded-lg bg-muted/40" />
  ),
});

export function AccountBalanceChart(props: {
  points: BalancePoint[];
  currency: string;
}) {
  return <Impl {...props} />;
}
