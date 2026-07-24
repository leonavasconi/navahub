import { z } from "zod";
import { ALLOWED_ATTACHMENT_MIME_TYPES, ATTACHMENT_KINDS, MAX_ATTACHMENT_SIZE_BYTES } from "./shared";

export const attachmentFileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_ATTACHMENT_SIZE_BYTES, "Arquivo maior que 10MB.")
  .refine(
    (file) => ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type),
    "Tipo de arquivo não permitido. Use PDF, JPG, PNG ou WEBP."
  );

export const newAttachmentSchema = z.object({
  kind: z.enum(ATTACHMENT_KINDS),
  file: attachmentFileSchema,
});

export type NewAttachment = z.infer<typeof newAttachmentSchema>;
