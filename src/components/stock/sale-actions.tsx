"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { deleteSale } from "@/lib/actions/sales";

export function SaleActions({ productId }: { productId: string }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-1">
      <Button asChild variant="ghost" size="icon-sm">
        <Link href={`/estoque/${productId}/venda/editar`} aria-label="Editar venda">
          <Pencil className="size-4" />
        </Link>
      </Button>
      <ConfirmDeleteDialog
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label="Excluir venda">
            <Trash2 className="size-4" />
          </Button>
        }
        title="Excluir esta venda?"
        description="O produto volta a ficar disponível no estoque e os lançamentos financeiros dessa venda são removidos."
        onConfirm={async () => {
          await deleteSale(productId);
          toast.success("Venda excluída. O produto voltou para o estoque disponível.");
          router.refresh();
        }}
      />
    </div>
  );
}
