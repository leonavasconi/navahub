import "server-only";
import { prisma } from "@/lib/prisma";

export async function getFinancialSummary(userId: string, range: { from: Date; to: Date }) {
  const [sales, purchases, stockProducts] = await Promise.all([
    prisma.sale.findMany({
      where: { deletedAt: null, saleDate: { gte: range.from, lte: range.to }, product: { userId } },
      select: { saleAmount: true, netProfit: true, marginPercent: true },
    }),
    prisma.purchase.findMany({
      where: { deletedAt: null, purchaseDate: { gte: range.from, lte: range.to }, product: { userId } },
      select: { totalInvested: true },
    }),
    prisma.product.findMany({
      where: { userId, deletedAt: null, status: { in: ["AVAILABLE", "RESERVED", "MAINTENANCE"] } },
      include: { purchase: true },
    }),
  ]);

  const revenue = sales.reduce((sum, s) => sum + Number(s.saleAmount), 0);
  const profit = sales.reduce((sum, s) => sum + Number(s.netProfit), 0);
  const totalInvested = purchases.reduce((sum, p) => sum + Number(p.totalInvested), 0);
  const stockCapital = stockProducts.reduce(
    (sum, p) => sum + (p.purchase ? Number(p.purchase.totalInvested) : 0),
    0
  );
  const avgMargin = sales.length
    ? sales.reduce((sum, s) => sum + Number(s.marginPercent), 0) / sales.length
    : 0;

  return {
    revenue,
    profit,
    totalInvested,
    stockCapital,
    purchaseCount: purchases.length,
    saleCount: sales.length,
    avgPurchaseTicket: purchases.length ? totalInvested / purchases.length : 0,
    avgSaleTicket: sales.length ? revenue / sales.length : 0,
    avgMargin,
    avgProfitPerSale: sales.length ? profit / sales.length : 0,
  };
}

export async function getCashFlowTransactions(userId: string, range: { from: Date; to: Date }) {
  return prisma.financialTransaction.findMany({
    where: { userId, deletedAt: null, transactionDate: { gte: range.from, lte: range.to } },
    orderBy: { transactionDate: "desc" },
  });
}
