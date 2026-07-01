import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { authOptions } from "./options";

/**
 * Instancia de Better Auth para la app (auth por email/contraseña).
 *
 * `nextCookies()` debe ir al final de `plugins`: gestiona las cookies de sesión
 * en Server Actions. La config base vive en `./options` (compartida con el seed).
 */
export const auth = betterAuth({
  ...authOptions,
  plugins: [nextCookies()],
});
