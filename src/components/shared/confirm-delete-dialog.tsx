"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ConfirmDeleteDialog({
  trigger,
  title = "Tem certeza que deseja excluir este registro?",
  description = "Essa ação não pode ser desfeita.",
  onConfirm,
}: {
  trigger: React.ReactNode;
  title?: string;
  description?: string;
  /** Retorne `false` explicitamente para manter o diálogo aberto (ex.: falha na exclusão,
   * já sinalizada via toast). Qualquer outro retorno fecha o diálogo normalmente. */
  onConfirm: () => void | boolean | Promise<void | boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              startTransition(async () => {
                try {
                  const result = await onConfirm();
                  if (result !== false) setOpen(false);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Não foi possível excluir.");
                }
              });
            }}
          >
            {isPending && <Loader2 className="animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
