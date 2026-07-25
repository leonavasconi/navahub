import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SaleForm, type SaleFormInitialValues } from "@/components/sales/sale-form";
import { formatCurrency } from "@/lib/format";
import { activeOnly } from "@/lib/soft-delete";

export default async function EditarVendaPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const user = await requireUser();
  const { productId } = await params;

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id, deletedAt: null },
    include: {
      purchase: true,
      sale: {
        include: {
          buyer: true,
          attachments: true,
          financialTransactions: { where: { deletedAt: null } },
        },
      },
    },
  });

  const sale = product && activeOnly(product.sale);
  if (!product || !product.purchase || !sale) notFound();

  const costItems = sale.financialTransactions
    .filter((t) => t.category !== "VENDA")
    .map((t) => ({
      category: t.category as SaleFormInitialValues["costItems"][number]["category"],
      description: t.description ?? "",
      amount: String(t.amount),
    }));

  const initialValues: SaleFormInitialValues = {
    saleDate: sale.saleDate.toISOString().slice(0, 10),
    saleAmount: String(sale.saleAmount),
    paymentMethod: sale.paymentMethod,
    saleNotes: sale.notes ?? "",
    costItems,
    buyerFullName: sale.buyer?.fullName ?? "",
    buyerPhone: sale.buyer?.phone ?? "",
    buyerCity: sale.buyer?.city ?? "",
    buyerState: sale.buyer?.state ?? "",
    buyerNotes: sale.buyer?.notes ?? "",
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/estoque/${product.id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {product.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Editar venda</h1>
        <p className="text-muted-foreground">
          {product.name} · custo total {formatCurrency(product.purchase.totalInvested)}
        </p>
      </div>

      <div className="max-w-3xl">
        <SaleForm
          productId={product.id}
          paidAmount={Number(product.purchase.paidAmount)}
          totalInvested={Number(product.purchase.totalInvested)}
          mode="edit"
          initialValues={initialValues}
          existingAttachments={sale.attachments}
        />
      </div>
    </div>
  );
}
