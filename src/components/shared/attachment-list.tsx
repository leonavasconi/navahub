import { Download, FileText } from "lucide-react";
import { ATTACHMENT_KIND_LABELS, type ATTACHMENT_KINDS } from "@/lib/validations/shared";

export type AttachmentItem = {
  id: string;
  fileName: string;
  kind: (typeof ATTACHMENT_KINDS)[number];
  sizeBytes: number;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentList({ attachments }: { attachments: AttachmentItem[] }) {
  if (attachments.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {attachments.map((a) => (
        <a
          key={a.id}
          href={`/api/attachments/${a.id}/download`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
        >
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{a.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {ATTACHMENT_KIND_LABELS[a.kind]} · {formatSize(a.sizeBytes)}
            </p>
          </div>
          <Download className="size-4 shrink-0 text-muted-foreground" />
        </a>
      ))}
    </div>
  );
}
