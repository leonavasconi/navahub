import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { getFinancialSummary } from "@/lib/financial-data";

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card>
      <CardContent className="px-4 py-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-lg font-semibold ${highlight ? "text-primary" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export function SummaryCards({
  summary,
}: {
  summary: Awaited<ReturnType<typeof getFinancialSummary>>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Stat label="Faturamento" value={formatCurrency(summary.revenue)} highlight />
      <Stat label="Lucro" value={formatCurrency(summary.profit)} highlight />
      <Stat label="Total investido" value={formatCurrency(summary.totalInvested)} />
      <Stat label="Capital em estoque" value={formatCurrency(summary.stockCapital)} />
      <Stat label="Margem média" value={formatPercent(summary.avgMargin)} />
      <Stat label="Quantidade de compras" value={String(summary.purchaseCount)} />
      <Stat label="Quantidade de vendas" value={String(summary.saleCount)} />
      <Stat label="Ticket médio de compra" value={formatCurrency(summary.avgPurchaseTicket)} />
      <Stat label="Ticket médio de venda" value={formatCurrency(summary.avgSaleTicket)} />
      <Stat label="Lucro médio por produto" value={formatCurrency(summary.avgProfitPerSale)} />
    </div>
  );
}
