import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SaleForm } from "@/components/sales/sale-form";
import { formatCurrency } from "@/lib/format";

export default async function RegistrarVendaPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const user = await requireUser();
  const { productId } = await params;

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id, deletedAt: null },
    include: { purchase: true, sale: true },
  });

  if (!product || !product.purchase) notFound();
  if (product.sale) redirect(`/estoque/${product.id}`);

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
        <h1 className="text-2xl font-semibold tracking-tight">Registrar venda</h1>
        <p className="text-muted-foreground">
          {product.name} · custo total {formatCurrency(product.purchase.totalInvested)}
        </p>
      </div>

      <div className="max-w-3xl">
        <SaleForm
          productId={product.id}
          paidAmount={Number(product.purchase.paidAmount)}
          totalInvested={Number(product.purchase.totalInvested)}
        />
      </div>
    </div>
  );
}
