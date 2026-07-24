import { DollarSign, Package, PackageCheck, TrendingUp, Wallet } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { formatCurrency } from "@/lib/format";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueProfitChart } from "@/components/dashboard/revenue-profit-chart";
import { PurchasesSalesChart } from "@/components/dashboard/purchases-sales-chart";
import { TopCategoriesChart } from "@/components/dashboard/top-categories-chart";
import { RecentMovements } from "@/components/dashboard/recent-movements";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const data = await getDashboardData(profile.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {profile.fullName.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">Aqui está o resumo do seu negócio.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard
          label="Faturamento do mês"
          value={formatCurrency(data.kpis.monthlyRevenue)}
          icon={DollarSign}
          accent
        />
        <KpiCard
          label="Lucro do mês"
          value={formatCurrency(data.kpis.monthlyProfit)}
          icon={TrendingUp}
          accent
        />
        <KpiCard
          label="Investido em estoque"
          value={formatCurrency(data.kpis.stockValue)}
          icon={Wallet}
        />
        <KpiCard
          label="Produtos em estoque"
          value={String(data.kpis.stockCount)}
          icon={Package}
        />
        <KpiCard
          label="Vendidos no mês"
          value={String(data.kpis.soldThisMonth)}
          icon={PackageCheck}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueProfitChart data={data.monthlySeries} />
        <PurchasesSalesChart data={data.purchasesVsSales} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <TopCategoriesChart data={data.topCategories} />
        <RecentMovements movements={data.recentMovements} />
        <AlertsPanel
          staleCount={data.alerts.staleCount}
          stockValue={data.alerts.stockValue}
          monthlyProfit={data.alerts.monthlyProfit}
        />
      </div>
    </div>
  );
}
