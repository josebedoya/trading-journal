import { createAuthClient } from "better-auth/react";

/**
 * Cliente de Better Auth para componentes `'use client'`.
 * (El login actual usa un server action; este cliente queda disponible para
 * flujos de auth desde el navegador.)
 */
export const authClient = createAuthClient();

export const { signIn, signOut, signUp, useSession } = authClient;
