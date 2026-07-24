import Link from "next/link";
import { FileDown } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getPeriodRange, PERIOD_OPTIONS, type Period } from "@/lib/financial";
import { getFinancialSummary } from "@/lib/financial-data";
import {
  getTopProfitProducts,
  getTopMarginProducts,
  getStaleStockProducts,
  getStockCapital,
  getMonthlyFinancials,
} from "@/lib/reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PeriodSelector } from "@/components/financial/period-selector";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { formatCurrency, formatDate, formatDaysInStock, formatPercent } from "@/lib/format";

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const period: Period = PERIOD_OPTIONS.includes(params.period as Period)
    ? (params.period as Period)
    : "this_month";
  const range = getPeriodRange(period, params.from, params.to);

  const [summary, topProfit, topMargin, staleStock, stockCapital, monthly] = await Promise.all([
    getFinancialSummary(user.id, range),
    getTopProfitProducts(user.id, range),
    getTopMarginProducts(user.id, range),
    getStaleStockProducts(user.id),
    getStockCapital(user.id),
    getMonthlyFinancials(user.id, 12),
  ]);

  const pdfHref = `/api/reports/pdf?period=${period}${
    period === "custom" ? `&from=${toISODate(range.from)}&to=${toISODate(range.to)}` : ""
  }`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">Consultas por período e exportação.</p>
        </div>
        <Button asChild variant="outline">
          <Link href={pdfHref} target="_blank">
            <FileDown />
            Exportar PDF do período
          </Link>
        </Button>
      </div>

      <PeriodSelector
        period={period}
        from={params.from ?? toISODate(range.from)}
        to={params.to ?? toISODate(range.to)}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <SummaryStat label="Faturamento" value={formatCurrency(summary.revenue)} highlight />
        <SummaryStat label="Lucro" value={formatCurrency(summary.profit)} highlight />
        <SummaryStat label="Compras" value={String(summary.purchaseCount)} />
        <SummaryStat label="Vendas" value={String(summary.saleCount)} />
        <SummaryStat label="Capital parado em estoque" value={formatCurrency(stockCapital)} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Produtos mais lucrativos</CardTitle>
          <ExportCsvButton
            filename="produtos-mais-lucrativos.csv"
            columns={[
              { key: "productName", label: "Produto" },
              { key: "categoryName", label: "Categoria" },
              { key: "saleDate", label: "Data da venda" },
              { key: "saleAmount", label: "Valor da venda" },
              { key: "netProfit", label: "Lucro" },
              { key: "marginPercent", label: "Margem %" },
            ]}
            rows={topProfit.map((p) => ({
              productName: p.productName,
              categoryName: p.categoryName,
              saleDate: formatDate(p.saleDate),
              saleAmount: p.saleAmount.toFixed(2),
              netProfit: p.netProfit.toFixed(2),
              marginPercent: p.marginPercent.toFixed(2),
            }))}
          />
        </CardHeader>
        <CardContent>
          <ProductTable rows={topProfit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Produtos com maior margem</CardTitle>
          <ExportCsvButton
            filename="produtos-maior-margem.csv"
            columns={[
              { key: "productName", label: "Produto" },
              { key: "categoryName", label: "Categoria" },
              { key: "saleDate", label: "Data da venda" },
              { key: "saleAmount", label: "Valor da venda" },
              { key: "netProfit", label: "Lucro" },
              { key: "marginPercent", label: "Margem %" },
            ]}
            rows={topMargin.map((p) => ({
              productName: p.productName,
              categoryName: p.categoryName,
              saleDate: formatDate(p.saleDate),
              saleAmount: p.saleAmount.toFixed(2),
              netProfit: p.netProfit.toFixed(2),
              marginPercent: p.marginPercent.toFixed(2),
            }))}
          />
        </CardHeader>
        <CardContent>
          <ProductTable rows={topMargin} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Produtos há mais tempo no estoque</CardTitle>
          <ExportCsvButton
            filename="produtos-parados-estoque.csv"
            columns={[
              { key: "productName", label: "Produto" },
              { key: "categoryName", label: "Categoria" },
              { key: "purchaseDate", label: "Data da compra" },
              { key: "totalInvested", label: "Custo total" },
              { key: "daysInStock", label: "Dias em estoque" },
            ]}
            rows={staleStock.map((p) => ({
              productName: p.productName,
              categoryName: p.categoryName,
              purchaseDate: formatDate(p.purchaseDate),
              totalInvested: p.totalInvested.toFixed(2),
              daysInStock: p.daysInStock,
            }))}
          />
        </CardHeader>
        <CardContent>
          {staleStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum produto em estoque no momento.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {staleStock.map((p, i) => (
                <div key={i} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                  <div>
                    <p className="font-medium">{p.productName}</p>
                    <p className="text-muted-foreground">{p.categoryName} · desde {formatDate(p.purchaseDate)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{formatCurrency(p.totalInvested)}</span>
                    <Badge variant={p.daysInStock > 30 ? "destructive" : "outline"}>
                      {formatDaysInStock(p.daysInStock)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Faturamento e lucro mensal</CardTitle>
          <ExportCsvButton
            filename="faturamento-lucro-mensal.csv"
            columns={[
              { key: "month", label: "Mês" },
              { key: "faturamento", label: "Faturamento" },
              { key: "lucro", label: "Lucro" },
            ]}
            rows={monthly.map((m) => ({
              month: m.month,
              faturamento: m.faturamento.toFixed(2),
              lucro: m.lucro.toFixed(2),
            }))}
          />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-sm sm:grid-cols-4 lg:grid-cols-6">
            {monthly.map((m) => (
              <div key={m.month} className="rounded-lg border p-2.5">
                <p className="text-muted-foreground">{m.month}</p>
                <p className="font-medium">{formatCurrency(m.faturamento)}</p>
                <p className="text-primary">{formatCurrency(m.lucro)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card>
      <CardContent className="px-4 py-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-lg font-semibold ${highlight ? "text-primary" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function ProductTable({
  rows,
}: {
  rows: {
    productName: string;
    categoryName: string;
    saleDate: string;
    saleAmount: number;
    netProfit: number;
    marginPercent: number;
  }[];
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma venda nesse período.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((p, i) => (
        <div key={i} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
          <div>
            <p className="font-medium">{p.productName}</p>
            <p className="text-muted-foreground">
              {p.categoryName} · {formatDate(p.saleDate)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">{formatCurrency(p.saleAmount)}</span>
            <span className="font-medium text-primary">{formatCurrency(p.netProfit)}</span>
            <Badge variant="outline">{formatPercent(p.marginPercent)}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
