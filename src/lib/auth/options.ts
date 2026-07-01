import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { BetterAuthOptions } from "better-auth";

import { db } from "@/lib/db/client";
import {
  authAccounts,
  sessions,
  users,
  verifications,
} from "@/lib/db/schema";

/**
 * Config compartida de Better Auth (sin plugins de Next).
 *
 * La instancia de la app (`./index.ts`) le añade `nextCookies()`; el seed y
 * cualquier script la usan tal cual para no depender de `next/headers`.
 *
 * - Adaptador Drizzle sobre el mismo `db` (node-postgres local / neon-serverless
 *   en prod). Modelos mapeados: `account` → `auth_accounts` (evita chocar con las
 *   cuentas de trading `accounts`).
 * - Ids uuid: coinciden con `users.id`, referenciado por el resto del modelo.
 */
export const authOptions = {
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: authAccounts,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // MVP: sin verificación por email todavía.
    requireEmailVerification: false,
  },
  advanced: {
    database: {
      // uuid v4 para todas las tablas de auth (coincide con `users.id` uuid).
      generateId: () => crypto.randomUUID(),
    },
  },
} satisfies BetterAuthOptions;
