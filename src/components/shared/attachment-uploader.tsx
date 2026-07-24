"use client";

import { useRef } from "react";
import { FileText, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ATTACHMENT_KIND_LABELS, ATTACHMENT_KINDS } from "@/lib/validations/shared";

export type AttachmentDraft = {
  id: string;
  file: File;
  kind: (typeof ATTACHMENT_KINDS)[number];
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentUploader({
  value,
  onChange,
}: {
  value: AttachmentDraft[];
  onChange: (drafts: AttachmentDraft[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const drafts: AttachmentDraft[] = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      file,
      kind: "OUTRO",
    }));
    onChange([...value, ...drafts]);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        className="w-fit"
      >
        <Paperclip />
        Anexar arquivos
      </Button>
      <p className="text-xs text-muted-foreground">
        PDF, JPG, PNG ou WEBP — até 10MB por arquivo.
      </p>

      {value.length > 0 && (
        <div className="flex flex-col gap-2">
          {value.map((draft) => (
            <div
              key={draft.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-2.5"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <div className="mr-auto min-w-0">
                <p className="truncate text-sm font-medium">{draft.file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(draft.file.size)}</p>
              </div>
              <Select
                value={draft.kind}
                onValueChange={(kind) =>
                  onChange(
                    value.map((d) =>
                      d.id === draft.id
                        ? { ...d, kind: kind as (typeof ATTACHMENT_KINDS)[number] }
                        : d
                    )
                  )
                }
              >
                <SelectTrigger size="sm" className="w-[190px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ATTACHMENT_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {ATTACHMENT_KIND_LABELS[kind]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onChange(value.filter((d) => d.id !== draft.id))}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
