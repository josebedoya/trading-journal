/**
 * Seed del super_admin.
 *
 * Crea (si no existe) el usuario me@josebedoya.co con contraseña `changeme123`
 * a través de Better Auth (el hash scrypt vive en `auth_accounts`), y lo eleva a
 * `super_admin` con cuota de 10 cuentas.
 *
 * Uso: `npm run db:seed` (requiere Postgres arriba y migraciones aplicadas).
 * Cambia la contraseña tras el primer login.
 */
import { config } from "dotenv";

// Carga .env.local ANTES de importar módulos que leen process.env (db/auth).
config({ path: ".env.local" });

const SUPER_ADMIN = {
  name: "Jose Bedoya",
  email: "me@josebedoya.co",
  password: "changeme123",
} as const;

async function main() {
  // Imports dinámicos: el cliente de DB lee DATABASE_URL al cargarse.
  const { betterAuth } = await import("better-auth");
  const { authOptions } = await import("../auth/options");
  const { db } = await import("./client");
  const { users } = await import("./schema");
  const { eq } = await import("drizzle-orm");

  // Instancia sin `nextCookies()` → no depende de `next/headers`.
  const auth = betterAuth(authOptions);

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, SUPER_ADMIN.email))
    .limit(1);

  if (existing.length === 0) {
    await auth.api.signUpEmail({
      body: {
        name: SUPER_ADMIN.name,
        email: SUPER_ADMIN.email,
        password: SUPER_ADMIN.password,
      },
      headers: new Headers(),
    });
    console.log(`✓ Usuario creado: ${SUPER_ADMIN.email}`);
  } else {
    console.log(`• Usuario ya existe: ${SUPER_ADMIN.email} (no se recrea)`);
  }

  await db
    .update(users)
    .set({ role: "super_admin", maxAccounts: 10 })
    .where(eq(users.email, SUPER_ADMIN.email));
  console.log("✓ Elevado a super_admin (max_accounts=10)");

  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Seed falló:", err);
  process.exit(1);
});
