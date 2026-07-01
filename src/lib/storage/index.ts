import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as presign } from "@aws-sdk/s3-request-presigner";

/**
 * Interfaz abstracta de subida sobre almacenamiento S3-compatible.
 * Dev: MinIO (docker). Nube: Cloudflare R2. Solo cambian las variables de
 * entorno (S3_ENDPOINT/…); el resto del código no se entera. En BD solo se
 * guarda el `storage_path`; el archivo vive en el bucket.
 */
const BUCKET = process.env.S3_BUCKET ?? "screenshots";

let client: S3Client | null = null;
function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? "auto", // R2 usa "auto"
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true, // requerido por MinIO y R2 (endpoint custom)
    });
  }
  return client;
}

/** Sube una captura y devuelve su `storage_path`. Ruta: <userId>/<tradeId>/<uuid>.<ext> */
export async function uploadScreenshot(
  file: File,
  opts: { userId: string; tradeId: string },
): Promise<string> {
  const ext = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "png";
  const path = `${opts.userId}/${opts.tradeId}/${crypto.randomUUID()}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());

  await s3().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: path,
      Body: body,
      ContentType: file.type || "image/png",
    }),
  );
  return path;
}

export async function deleteScreenshot(path: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: path }));
}

/** URL firmada temporal para servir una captura del bucket privado. */
export async function getSignedUrl(
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  try {
    return await presign(
      s3(),
      new GetObjectCommand({ Bucket: BUCKET, Key: path }),
      { expiresIn },
    );
  } catch {
    return null;
  }
}
