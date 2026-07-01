import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import {
  drizzle as drizzleNode,
  type NodePgDatabase,
} from "drizzle-orm/node-postgres";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { Pool as PgPool } from "pg";
import ws from "ws";

import * as schema from "./schema";

/**
 * Cliente Drizzle con driver seleccionable por entorno.
 *
 * - Local (dev): `drizzle-orm/node-postgres` contra el contenedor Postgres.
 * - Producción (Neon): `drizzle-orm/neon-serverless` (WebSocket, soporta
 *   transacciones) contra Neon.
 *
 * El `schema` y todas las queries son idénticos en ambos entornos; solo cambia
 * el adaptador. El driver se elige con `DB_DRIVER` ("node" | "neon"); si no está
 * definido se infiere de `NODE_ENV` ("neon" en producción, "node" en dev).
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL no está definida. Copia .env.example a .env.local y arranca el stack (`docker compose up -d`).",
  );
}

const driver =
  process.env.DB_DRIVER ??
  (process.env.NODE_ENV === "production" ? "neon" : "node");

// Tipo común: ambos drivers exponen la misma API de Drizzle sobre el schema.
type Db = NodePgDatabase<typeof schema>;

// Reusa la conexión entre hot-reloads en desarrollo para no agotar el pool.
const globalForDb = globalThis as unknown as { db?: Db };

function createDb(): Db {
  if (driver === "neon") {
    // En runtime Node (no Edge) neon-serverless necesita un WebSocket.
    neonConfig.webSocketConstructor ??= ws;
    return drizzleNeon(new NeonPool({ connectionString }), {
      schema,
    }) as unknown as Db;
  }
  return drizzleNode(new PgPool({ connectionString }), { schema });
}

export const db: Db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
