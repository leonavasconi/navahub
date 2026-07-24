import { AlertTriangle, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export function AlertsPanel({
  staleCount,
  stockValue,
  monthlyProfit,
}: {
  staleCount: number;
  stockValue: number;
  monthlyProfit: number;
}) {
  const items = [
    staleCount > 0
      ? {
          icon: AlertTriangle,
          tone: "text-amber-600 dark:text-amber-400",
          text: `${staleCount} ${staleCount === 1 ? "produto está" : "produtos estão"} há mais de 30 dias no estoque.`,
        }
      : null,
    {
      icon: Wallet,
      tone: "text-chart-series-blue",
      text: `${formatCurrency(stockValue)} estão atualmente investidos em estoque.`,
    },
    {
      icon: TrendingUp,
      tone: "text-primary",
      text: `Seu lucro neste mês é de ${formatCurrency(monthlyProfit)}.`,
    },
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2.5 text-sm">
            <item.icon className={`mt-0.5 size-4 shrink-0 ${item.tone}`} />
            <p>{item.text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
