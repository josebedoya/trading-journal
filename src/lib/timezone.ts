import "server-only";

import { cookies } from "next/headers";

import { TZ_COOKIE } from "./timezone-shared";

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Zona horaria del usuario (de la cookie que fija <TimeZoneSync>). Las
 * agregaciones por día (calendario, equity, balance) la usan para agrupar en
 * hora local. Default "UTC" hasta que el cliente la reporte.
 */
export async function getUserTimeZone(): Promise<string> {
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  return tz && isValidTimeZone(tz) ? tz : "UTC";
}
