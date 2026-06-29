import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Carga variables de .env.local para los comandos de drizzle-kit (CLI).
config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
