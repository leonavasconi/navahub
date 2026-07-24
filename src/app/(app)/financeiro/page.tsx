import { requireUser } from "@/lib/auth";
import { getPeriodRange, PERIOD_OPTIONS, type Period } from "@/lib/financial";
import { getFinancialSummary, getCashFlowTransactions } from "@/lib/financial-data";
import { PeriodSelector } from "@/components/financial/period-selector";
import { SummaryCards } from "@/components/financial/summary-cards";
import { NewTransactionDialog } from "@/components/financial/new-transaction-dialog";
import { CashFlowTable, type CashFlowRow } from "@/components/financial/cash-flow-table";

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function FinanceiroPage({
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

  const [summary, transactions] = await Promise.all([
    getFinancialSummary(user.id, range),
    getCashFlowTransactions(user.id, range),
  ]);

  const rows: CashFlowRow[] = transactions.map((t) => ({
    id: t.id,
    type: t.type,
    category: t.category,
    amount: Number(t.amount),
    description: t.description,
    transactionDate: t.transactionDate.toISOString(),
    isAuto: t.isAuto,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">Resumo financeiro e fluxo de caixa.</p>
        </div>
        <NewTransactionDialog />
      </div>

      <PeriodSelector period={period} from={params.from ?? toISODate(range.from)} to={params.to ?? toISODate(range.to)} />

      <SummaryCards summary={summary} />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Fluxo de caixa</h2>
        <CashFlowTable transactions={rows} />
      </div>
    </div>
  );
}
