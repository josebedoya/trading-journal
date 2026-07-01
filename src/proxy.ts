import createMiddleware from "next-intl/middleware";

import { routing } from "@/lib/i18n/routing";

// Next 16 renombró la convención `middleware` a `proxy`.
// next-intl resuelve y prefija el locale en cada request. La sesión de Better
// Auth vive en cookies y se valida en los layouts/server actions vía
// `getCurrentUser()`, así que aquí solo corre i18n.
export default createMiddleware(routing);

export const config = {
  // Aplica a todo salvo internals de Next, API y archivos con extensión.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
