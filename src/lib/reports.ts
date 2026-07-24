import "server-only";
import { prisma } from "@/lib/prisma";
import { calcDaysInStock } from "@/lib/calculations";

const REPORT_LIMIT = 10;

export async function getTopProfitProducts(userId: string, range: { from: Date; to: Date }) {
  const sales = await prisma.sale.findMany({
    where: { deletedAt: null, saleDate: { gte: range.from, lte: range.to }, product: { userId } },
    orderBy: { netProfit: "desc" },
    take: REPORT_LIMIT,
    include: { product: { include: { category: true } } },
  });

  return sales.map((s) => ({
    productName: s.product.name,
    categoryName: s.product.category.name,
    saleDate: s.saleDate.toISOString(),
    saleAmount: Number(s.saleAmount),
    netProfit: Number(s.netProfit),
    marginPercent: Number(s.marginPercent),
  }));
}

export async function getTopMarginProducts(userId: string, range: { from: Date; to: Date }) {
  const sales = await prisma.sale.findMany({
    where: { deletedAt: null, saleDate: { gte: range.from, lte: range.to }, product: { userId } },
    orderBy: { marginPercent: "desc" },
    take: REPORT_LIMIT,
    include: { product: { include: { category: true } } },
  });

  return sales.map((s) => ({
    productName: s.product.name,
    categoryName: s.product.category.name,
    saleDate: s.saleDate.toISOString(),
    saleAmount: Number(s.saleAmount),
    netProfit: Number(s.netProfit),
    marginPercent: Number(s.marginPercent),
  }));
}

export async function getStaleStockProducts(userId: string) {
  const products = await prisma.product.findMany({
    where: { userId, deletedAt: null, status: { in: ["AVAILABLE", "RESERVED", "MAINTENANCE"] } },
    include: { category: true, purchase: true },
  });

  return products
    .filter((p) => p.purchase)
    .map((p) => ({
      productName: p.name,
      categoryName: p.category.name,
      purchaseDate: p.purchase!.purchaseDate.toISOString(),
      totalInvested: Number(p.purchase!.totalInvested),
      daysInStock: calcDaysInStock(p.purchase!.purchaseDate),
    }))
    .sort((a, b) => b.daysInStock - a.daysInStock)
    .slice(0, REPORT_LIMIT);
}

export async function getStockCapital(userId: string) {
  const products = await prisma.product.findMany({
    where: { userId, deletedAt: null, status: { in: ["AVAILABLE", "RESERVED", "MAINTENANCE"] } },
    include: { purchase: true },
  });
  return products.reduce((sum, p) => sum + (p.purchase ? Number(p.purchase.totalInvested) : 0), 0);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthLabel(date: Date): string {
  const label = date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
  return label.replace(".", "").replace(/^./, (c) => c.toUpperCase());
}

export async function getMonthlyFinancials(userId: string, monthsBack = 12) {
  const now = new Date();
  const rangeStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1));

  const sales = await prisma.sale.findMany({
    where: { deletedAt: null, saleDate: { gte: rangeStart }, product: { userId } },
    select: { saleDate: true, saleAmount: true, netProfit: true },
  });

  const months = Array.from({ length: monthsBack }, (_, i) =>
    startOfMonth(new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - i), 1))
  );

  return months.map((m) => {
    const nextMonth = new Date(m.getFullYear(), m.getMonth() + 1, 1);
    const monthSales = sales.filter((s) => s.saleDate >= m && s.saleDate < nextMonth);
    return {
      month: monthLabel(m),
      faturamento: monthSales.reduce((sum, s) => sum + Number(s.saleAmount), 0),
      lucro: monthSales.reduce((sum, s) => sum + Number(s.netProfit), 0),
    };
  });
}
