import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StockTable, type StockRow } from "@/components/stock/stock-table";
import { calcDaysInStock } from "@/lib/calculations";

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
    .map((p) => ({
      id: p.id,
      name: p.name,
      model: p.model,
      serialNumber: p.serialNumber,
      categoryId: p.categoryId,
      categoryName: p.category.name,
      purchaseDate: p.purchase!.purchaseDate.toISOString(),
      totalInvested: Number(p.purchase!.totalInvested),
      daysInStock: calcDaysInStock(p.purchase!.purchaseDate, p.sale?.saleDate ?? new Date()),
      desiredSalePrice: p.desiredSalePrice != null ? Number(p.desiredSalePrice) : null,
      status: p.status,
    }));

  return (
    <div className="flex flex-col gap-6">
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
