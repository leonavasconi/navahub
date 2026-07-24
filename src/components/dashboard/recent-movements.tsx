import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";

export type Movement = {
  id: string;
  type: "compra" | "venda";
  label: string;
  amount: number;
  date: string;
};

export function RecentMovements({ movements }: { movements: Movement[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimas movimentações</CardTitle>
      </CardHeader>
      <CardContent>
        {movements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma movimentação ainda.</p>
        ) : (
          <div className="flex flex-col">
            {movements.map((m, i) => (
              <div
                key={m.id}
                className={`flex items-center gap-3 py-2.5 ${i > 0 ? "border-t" : ""}`}
              >
                {m.type === "compra" ? (
                  <ArrowDownCircle className="size-4 shrink-0 text-chart-series-blue" />
                ) : (
                  <ArrowUpCircle className="size-4 shrink-0 text-primary" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-medium">{m.type === "compra" ? "Compra" : "Venda"}</span>
                    {" — "}
                    {m.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(m.date)}</p>
                </div>
                <span
                  className={`text-sm font-medium ${m.type === "venda" ? "text-primary" : ""}`}
                >
                  {m.type === "compra" ? "-" : "+"}
                  {formatCurrency(m.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
