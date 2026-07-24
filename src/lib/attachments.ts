import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "attachments";

function sanitizeFileName(name: string): string {
  const safe = name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_{2,}/g, "_");
  return safe.slice(-100) || "arquivo";
}

export async function uploadAttachmentFile(params: {
  userId: string;
  scopeId: string;
  file: File;
}): Promise<{ storagePath: string }> {
  const admin = createAdminClient();
  const safeName = sanitizeFileName(params.file.name);
  const storagePath = `${params.userId}/${params.scopeId}/${randomUUID()}-${safeName}`;

  const arrayBuffer = await params.file.arrayBuffer();
  const { error } = await admin.storage.from(BUCKET).upload(storagePath, arrayBuffer, {
    contentType: params.file.type,
    upsert: false,
  });

  if (error) throw new Error(`Falha ao enviar arquivo "${params.file.name}": ${error.message}`);

  return { storagePath };
}

export async function deleteAttachmentFiles(storagePaths: string[]) {
  if (storagePaths.length === 0) return;
  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove(storagePaths);
}

export async function getAttachmentSignedUrl(
  storagePath: string,
  expiresInSeconds = 60 * 5
): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data) throw new Error("Não foi possível gerar o link do arquivo.");
  return data.signedUrl;
}
