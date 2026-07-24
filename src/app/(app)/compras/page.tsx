import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { PurchasesTable, type PurchaseRow } from "@/components/purchases/purchases-table";
import { QueryToast } from "@/components/shared/query-toast";

export default async function ComprasPage() {
  const user = await requireUser();

  const purchases = await prisma.purchase.findMany({
    where: { deletedAt: null, product: { userId: user.id } },
    orderBy: { purchaseDate: "desc" },
    include: {
      product: { include: { category: true } },
      seller: true,
    },
  });

  const rows: PurchaseRow[] = purchases.map((p) => ({
    id: p.id,
    productId: p.productId,
    productName: p.product.name,
    categoryName: p.product.category.name,
    purchaseDate: p.purchaseDate.toISOString(),
    paidAmount: Number(p.paidAmount),
    totalInvested: Number(p.totalInvested),
    sellerName: p.seller?.fullName ?? "—",
    status: p.product.status,
  }));

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <QueryToast successMessage="Compra registrada com sucesso." />
      </Suspense>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compras</h1>
          <p className="text-muted-foreground">Produtos comprados e dados de quem você comprou.</p>
        </div>
        <Button asChild>
          <Link href="/compras/novo">
            <Plus />
            Nova compra
          </Link>
        </Button>
      </div>

      <PurchasesTable purchases={rows} />
    </div>
  );
}
