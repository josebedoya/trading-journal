import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { routing } from "@/lib/i18n/routing";

// Next 16 renombró la convención `middleware` a `proxy`.
// Hace dos cosas en cada request:
//   1. next-intl resuelve y prefija el locale.
//   2. Supabase refresca la sesión (cookies) sobre la respuesta de i18n.
const handleI18n = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const response = handleI18n(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresca el token si expiró (no usar getSession aquí).
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Aplica a todo salvo internals de Next, API y archivos con extensión.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
