import "server-only";

import { createSupabaseServerClient } from "@/lib/auth/server";

// Interfaz abstracta de subida (hoy Supabase Storage; mañana Cloudflare R2
// sin reescribir los callers). En BD solo guardamos `storage_path`.
const BUCKET = "screenshots";

/** Sube una captura y devuelve su `storage_path`. Ruta: <userId>/<tradeId>/<uuid>.<ext> */
export async function uploadScreenshot(
  file: File,
  opts: { userId: string; tradeId: string },
): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const ext = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "png";
  const path = `${opts.userId}/${opts.tradeId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || "image/png" });

  if (error) throw new Error(`upload_failed: ${error.message}`);
  return path;
}

export async function deleteScreenshot(path: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.storage.from(BUCKET).remove([path]);
}

/** URL firmada temporal para servir una captura del bucket privado. */
export async function getSignedUrl(
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}
