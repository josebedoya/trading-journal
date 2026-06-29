import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

type Result = "win" | "loss" | "breakeven";

const styles: Record<Result, string> = {
  win: "bg-win text-win-foreground",
  loss: "bg-loss text-loss-foreground",
  breakeven: "bg-breakeven text-breakeven-foreground",
};

export function ResultBadge({ result }: { result: Result }) {
  const t = useTranslations("trades.results");
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        styles[result],
      )}
    >
      {t(result)}
    </span>
  );
}
