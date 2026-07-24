import "server-only";
import { prisma } from "@/lib/prisma";
import { calcDaysInStock } from "@/lib/calculations";

const STOCK_STATUSES = ["AVAILABLE", "RESERVED", "MAINTENANCE"] as const;
const MONTHS_BACK = 6;
const STALE_DAYS_THRESHOLD = 30;

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  const label = date.toLocaleDateString("pt-BR", { month: "short" });
  return label.replace(".", "").replace(/^./, (c) => c.toUpperCase());
}

function lastNMonths(n: number, from: Date): Date[] {
  return Array.from({ length: n }, (_, i) => startOfMonth(new Date(from.getFullYear(), from.getMonth() - (n - 1 - i), 1)));
}

export async function getDashboardData(userId: string) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const nextMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  const rangeStart = lastNMonths(MONTHS_BACK, now)[0];

  const [stockProducts, categoryProducts, purchasesInRange, salesInRange, recentPurchases, recentSales] =
    await Promise.all([
      prisma.product.findMany({
        where: { userId, deletedAt: null, status: { in: [...STOCK_STATUSES] } },
        include: { purchase: true },
      }),
      prisma.product.findMany({
        where: { userId, deletedAt: null },
        include: { category: true },
      }),
      prisma.purchase.findMany({
        where: { deletedAt: null, purchaseDate: { gte: rangeStart }, product: { userId } },
        select: { purchaseDate: true, totalInvested: true },
      }),
      prisma.sale.findMany({
        where: { deletedAt: null, saleDate: { gte: rangeStart }, product: { userId } },
        select: { saleDate: true, saleAmount: true, netProfit: true },
      }),
      prisma.purchase.findMany({
        where: { deletedAt: null, product: { userId } },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          purchaseDate: true,
          totalInvested: true,
          product: { select: { name: true } },
        },
      }),
      prisma.sale.findMany({
        where: { deletedAt: null, product: { userId } },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          saleDate: true,
          saleAmount: true,
          product: { select: { name: true } },
        },
      }),
    ]);

  const stockValue = stockProducts.reduce(
    (sum, p) => sum + (p.purchase ? Number(p.purchase.totalInvested) : 0),
    0
  );
  const staleCount = stockProducts.filter(
    (p) => p.purchase && calcDaysInStock(p.purchase.purchaseDate) > STALE_DAYS_THRESHOLD
  ).length;

  const monthlyRevenue = salesInRange
    .filter((s) => s.saleDate >= monthStart && s.saleDate < nextMonthStart)
    .reduce((sum, s) => sum + Number(s.saleAmount), 0);
  const monthlyProfit = salesInRange
    .filter((s) => s.saleDate >= monthStart && s.saleDate < nextMonthStart)
    .reduce((sum, s) => sum + Number(s.netProfit), 0);
  const soldThisMonth = salesInRange.filter(
    (s) => s.saleDate >= monthStart && s.saleDate < nextMonthStart
  ).length;

  const months = lastNMonths(MONTHS_BACK, now);
  const monthlySeries = months.map((m) => {
    const key = monthKey(m);
    const nextMonth = new Date(m.getFullYear(), m.getMonth() + 1, 1);
    const faturamento = salesInRange
      .filter((s) => s.saleDate >= m && s.saleDate < nextMonth)
      .reduce((sum, s) => sum + Number(s.saleAmount), 0);
    const lucro = salesInRange
      .filter((s) => s.saleDate >= m && s.saleDate < nextMonth)
      .reduce((sum, s) => sum + Number(s.netProfit), 0);
    return { key, month: monthLabel(m), faturamento, lucro };
  });

  const purchasesVsSales = months.map((m) => {
    const nextMonth = new Date(m.getFullYear(), m.getMonth() + 1, 1);
    const compras = purchasesInRange
      .filter((p) => p.purchaseDate >= m && p.purchaseDate < nextMonth)
      .reduce((sum, p) => sum + Number(p.totalInvested), 0);
    const vendas = salesInRange
      .filter((s) => s.saleDate >= m && s.saleDate < nextMonth)
      .reduce((sum, s) => sum + Number(s.saleAmount), 0);
    return { month: monthLabel(m), compras, vendas };
  });

  const categoryCounts = new Map<string, number>();
  for (const p of categoryProducts) {
    categoryCounts.set(p.category.name, (categoryCounts.get(p.category.name) ?? 0) + 1);
  }
  const topCategories = [...categoryCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const recentMovements = [
    ...recentPurchases.map((p) => ({
      id: `purchase-${p.id}`,
      type: "compra" as const,
      label: p.product.name,
      amount: Number(p.totalInvested),
      date: p.purchaseDate,
    })),
    ...recentSales.map((s) => ({
      id: `sale-${s.id}`,
      type: "venda" as const,
      label: s.product.name,
      amount: Number(s.saleAmount),
      date: s.saleDate,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 6)
    .map((m) => ({ ...m, date: m.date.toISOString() }));

  return {
    kpis: {
      monthlyRevenue,
      monthlyProfit,
      stockValue,
      stockCount: stockProducts.length,
      soldThisMonth,
    },
    monthlySeries,
    purchasesVsSales,
    topCategories,
    recentMovements,
    alerts: { staleCount, stockValue, monthlyProfit },
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
