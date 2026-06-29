"use client";

import { ChevronsUpDown } from "lucide-react";
import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/lib/i18n/navigation";
import { setSelectedAccounts } from "@/server/actions/preferences";

type AccountLite = {
  id: string;
  name: string;
  status: "active" | "archived";
};

type Props = {
  accounts: AccountLite[];
  /** IDs efectivamente seleccionados (ya resueltos). */
  selected: string[];
  /** true cuando no hay selección explícita = "todas las activas". */
  allActive: boolean;
};

export function AccountSelector({ accounts, selected, allActive }: Props) {
  const t = useTranslations("accounts");
  const [pending, startTransition] = useTransition();
  const selectedSet = new Set(selected);

  if (accounts.length === 0) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link href="/settings">{t("createFirst")}</Link>
      </Button>
    );
  }

  function apply(ids: string[]) {
    startTransition(async () => {
      await setSelectedAccounts(ids);
    });
  }

  function toggle(id: string) {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    apply([...next]);
  }

  const label = allActive
    ? t("allAccounts")
    : selected.length === 1
      ? (accounts.find((a) => a.id === selected[0])?.name ?? t("allAccounts"))
      : t("nSelected", { count: selected.length });

  const active = accounts.filter((a) => a.status === "active");
  const archived = accounts.filter((a) => a.status === "archived");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending} className="gap-2">
          {label}
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuCheckboxItem
          checked={allActive}
          onCheckedChange={() => apply([])}
        >
          {t("allAccounts")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {active.map((a) => (
          <DropdownMenuCheckboxItem
            key={a.id}
            checked={!allActive && selectedSet.has(a.id)}
            onCheckedChange={() => toggle(a.id)}
            onSelect={(e) => e.preventDefault()}
          >
            {a.name}
          </DropdownMenuCheckboxItem>
        ))}
        {archived.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t("archived")}
            </DropdownMenuLabel>
            {archived.map((a) => (
              <DropdownMenuCheckboxItem
                key={a.id}
                checked={!allActive && selectedSet.has(a.id)}
                onCheckedChange={() => toggle(a.id)}
                onSelect={(e) => e.preventDefault()}
              >
                {a.name}
              </DropdownMenuCheckboxItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
