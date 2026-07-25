import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StockTable, type StockRow } from "@/components/stock/stock-table";
import { QueryToast } from "@/components/shared/query-toast";
import { calcDaysInStock } from "@/lib/calculations";
import { activeOnly } from "@/lib/soft-delete";

export default async function EstoquePage() {
  const user = await requireUser();

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { category: true, purchase: true, sale: true },
    }),
    prisma.category.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);

  const rows: StockRow[] = products
    .filter((p) => p.purchase)
    .map((p) => {
      const sale = activeOnly(p.sale);
      return {
        id: p.id,
        name: p.name,
        model: p.model,
        serialNumber: p.serialNumber,
        categoryId: p.categoryId,
        categoryName: p.category.name,
        purchaseDate: p.purchase!.purchaseDate.toISOString(),
        totalInvested: Number(p.purchase!.totalInvested),
        daysInStock: calcDaysInStock(p.purchase!.purchaseDate, sale?.saleDate ?? new Date()),
        status: p.status,
      };
    });

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <QueryToast />
      </Suspense>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Estoque</h1>
        <p className="text-muted-foreground">
          Produtos disponíveis, reservados, em manutenção ou já vendidos.
        </p>
      </div>

      <StockTable products={rows} categories={categories} />
    </div>
  );
}
