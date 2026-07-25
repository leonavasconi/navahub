"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { deletePurchase } from "@/lib/actions/purchases";

export function PurchaseActions({ productId, canDelete }: { productId: string; canDelete: boolean }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-1">
      <Button asChild variant="ghost" size="icon-sm">
        <Link href={`/estoque/${productId}/editar`} aria-label="Editar compra">
          <Pencil className="size-4" />
        </Link>
      </Button>
      {canDelete && (
        <ConfirmDeleteDialog
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label="Excluir compra">
              <Trash2 className="size-4" />
            </Button>
          }
          title="Excluir esta compra?"
          description="O produto e todo o histórico dessa compra saem do estoque. Essa ação não pode ser desfeita."
          onConfirm={async () => {
            await deletePurchase(productId);
            router.push(`/estoque?success=${encodeURIComponent("Compra excluída.")}`);
          }}
        />
      )}
    </div>
  );
}
