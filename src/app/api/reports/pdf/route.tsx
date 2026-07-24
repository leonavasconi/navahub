import { NextResponse } from "next/server";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { requireUser } from "@/lib/auth";
import { getPeriodRange, PERIOD_OPTIONS, type Period } from "@/lib/financial";
import { getFinancialSummary } from "@/lib/financial-data";
import {
  getTopProfitProducts,
  getTopMarginProducts,
  getStaleStockProducts,
  getStockCapital,
} from "@/lib/reports";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#292524" },
  title: { fontSize: 18, marginBottom: 2, color: "#c2410c" },
  subtitle: { fontSize: 9, color: "#78716c", marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginTop: 18, marginBottom: 6 },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 8 },
  summaryItem: { flexDirection: "column", minWidth: 90 },
  summaryLabel: { color: "#78716c", fontSize: 7.5 },
  summaryValue: { fontSize: 11, fontWeight: 700, marginTop: 2 },
  table: { borderTop: "1px solid #d6d3d1" },
  tableHeaderRow: { flexDirection: "row", borderBottom: "1px solid #292524", paddingVertical: 4 },
  tableRow: { flexDirection: "row", borderBottom: "1px solid #e7e5e4", paddingVertical: 4 },
  cell: { flex: 2 },
  cellSmall: { flex: 1 },
  cellRight: { flex: 1, textAlign: "right" },
  headerText: { fontWeight: 700, fontSize: 8 },
  emptyText: { color: "#78716c", paddingVertical: 8 },
});

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

type ProductRow = {
  productName: string;
  categoryName: string;
  saleDate: string;
  saleAmount: number;
  netProfit: number;
  marginPercent: number;
};

function ProductsTable({ rows }: { rows: ProductRow[] }) {
  if (rows.length === 0) {
    return <Text style={styles.emptyText}>Nenhuma venda nesse período.</Text>;
  }
  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.cell, styles.headerText]}>Produto</Text>
        <Text style={[styles.cellSmall, styles.headerText]}>Categoria</Text>
        <Text style={[styles.cellSmall, styles.headerText]}>Data</Text>
        <Text style={[styles.cellRight, styles.headerText]}>Venda</Text>
        <Text style={[styles.cellRight, styles.headerText]}>Lucro</Text>
        <Text style={[styles.cellRight, styles.headerText]}>Margem</Text>
      </View>
      {rows.map((p, i) => (
        <View key={i} style={styles.tableRow}>
          <Text style={styles.cell}>{p.productName}</Text>
          <Text style={styles.cellSmall}>{p.categoryName}</Text>
          <Text style={styles.cellSmall}>{formatDate(p.saleDate)}</Text>
          <Text style={styles.cellRight}>{formatCurrency(p.saleAmount)}</Text>
          <Text style={styles.cellRight}>{formatCurrency(p.netProfit)}</Text>
          <Text style={styles.cellRight}>{formatPercent(p.marginPercent)}</Text>
        </View>
      ))}
    </View>
  );
}

export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const periodParam = url.searchParams.get("period");
  const period: Period = PERIOD_OPTIONS.includes(periodParam as Period)
    ? (periodParam as Period)
    : "this_month";
  const range = getPeriodRange(
    period,
    url.searchParams.get("from") ?? undefined,
    url.searchParams.get("to") ?? undefined
  );

  const [summary, topProfit, topMargin, staleStock, stockCapital] = await Promise.all([
    getFinancialSummary(user.id, range),
    getTopProfitProducts(user.id, range),
    getTopMarginProducts(user.id, range),
    getStaleStockProducts(user.id),
    getStockCapital(user.id),
  ]);

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>NavaHub — Relatório</Text>
        <Text style={styles.subtitle}>
          {formatDate(range.from)} a {formatDate(range.to)}
        </Text>

        <View style={styles.summaryRow}>
          <SummaryItem label="Faturamento" value={formatCurrency(summary.revenue)} />
          <SummaryItem label="Lucro" value={formatCurrency(summary.profit)} />
          <SummaryItem label="Compras" value={String(summary.purchaseCount)} />
          <SummaryItem label="Vendas" value={String(summary.saleCount)} />
          <SummaryItem label="Margem média" value={formatPercent(summary.avgMargin)} />
          <SummaryItem label="Capital em estoque" value={formatCurrency(stockCapital)} />
        </View>

        <Text style={styles.sectionTitle}>Produtos mais lucrativos</Text>
        <ProductsTable rows={topProfit} />

        <Text style={styles.sectionTitle}>Produtos com maior margem</Text>
        <ProductsTable rows={topMargin} />

        <Text style={styles.sectionTitle}>Produtos há mais tempo em estoque</Text>
        {staleStock.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum produto em estoque no momento.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.cell, styles.headerText]}>Produto</Text>
              <Text style={[styles.cellSmall, styles.headerText]}>Categoria</Text>
              <Text style={[styles.cellSmall, styles.headerText]}>Data da compra</Text>
              <Text style={[styles.cellRight, styles.headerText]}>Custo total</Text>
              <Text style={[styles.cellRight, styles.headerText]}>Dias em estoque</Text>
            </View>
            {staleStock.map((p, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.cell}>{p.productName}</Text>
                <Text style={styles.cellSmall}>{p.categoryName}</Text>
                <Text style={styles.cellSmall}>{formatDate(p.purchaseDate)}</Text>
                <Text style={styles.cellRight}>{formatCurrency(p.totalInvested)}</Text>
                <Text style={styles.cellRight}>{p.daysInStock}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Blob([new Uint8Array(buffer)], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="navahub-relatorio.pdf"',
    },
  });
}
