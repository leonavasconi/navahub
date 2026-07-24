import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SalesTable, type SaleRow } from "@/components/sales/sales-table";
import { calcDaysInStock } from "@/lib/calculations";

export default async function VendasPage() {
  const user = await requireUser();

  const [sales, categories] = await Promise.all([
    prisma.sale.findMany({
      where: { deletedAt: null, product: { userId: user.id } },
      orderBy: { saleDate: "desc" },
      include: {
        buyer: true,
        product: { include: { category: true, purchase: true } },
      },
    }),
    prisma.category.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);

  const rows: SaleRow[] = sales
    .filter((s) => s.product.purchase)
    .map((s) => ({
      id: s.id,
      productId: s.productId,
      productName: s.product.name,
      categoryId: s.product.categoryId,
      categoryName: s.product.category.name,
      purchaseDate: s.product.purchase!.purchaseDate.toISOString(),
      saleDate: s.saleDate.toISOString(),
      buyerName: s.buyer?.fullName ?? "—",
      buyerCity: s.buyer?.city ?? "",
      totalInvested: Number(s.product.purchase!.totalInvested),
      saleAmount: Number(s.saleAmount),
      netProfit: Number(s.netProfit),
      marginPercent: Number(s.marginPercent),
      daysInStock: calcDaysInStock(s.product.purchase!.purchaseDate, s.saleDate),
    }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vendas</h1>
        <p className="text-muted-foreground">Histórico de vendas, compradores e lucro por negociação.</p>
      </div>

      <SalesTable sales={rows} categories={categories} />
    </div>
  );
}
