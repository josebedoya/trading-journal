import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";

type Props = {
  name: string;
  status: "active" | "archived";
  exchange?: string | null;
};

/** Etiqueta compacta de una cuenta (nombre + estado + exchange). */
export function AccountChip({ name, status, exchange }: Props) {
  const t = useTranslations("accounts");
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-medium">{name}</span>
      {exchange && (
        <span className="text-xs text-muted-foreground">{exchange}</span>
      )}
      {status === "archived" && (
        <Badge variant="secondary" className="text-[10px]">
          {t("statuses.archived")}
        </Badge>
      )}
    </span>
  );
}
