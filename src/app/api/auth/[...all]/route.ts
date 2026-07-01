import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

// Endpoints de Better Auth (sign-in/out, sesión, etc.). Fuera del segmento
// [locale]: el proxy de i18n excluye /api.
export const { GET, POST } = toNextJsHandler(auth);
