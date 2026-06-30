"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { TZ_COOKIE } from "@/lib/timezone-shared";

/**
 * Reporta la zona horaria del navegador al server vía cookie. Si difiere de la
 * actual (la que el server ya leyó), la actualiza y refresca para que las
 * agregaciones por día se agrupen en hora local. No renderiza nada.
 */
export function TimeZoneSync({ current }: { current: string }) {
  const router = useRouter();

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== current) {
      document.cookie = `${TZ_COOKIE}=${tz}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [current, router]);

  return null;
}
