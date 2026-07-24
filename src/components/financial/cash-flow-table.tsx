"use client";

import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { deleteTransaction } from "@/lib/actions/financial";
import { TRANSACTION_CATEGORY_LABELS } from "@/lib/validations/financial";
import { formatCurrency, formatDate } from "@/lib/format";

export type CashFlowRow = {
  id: string;
  type: "INCOME" | "EXPENSE";
  category: keyof typeof TRANSACTION_CATEGORY_LABELS;
  amount: number;
  description: string | null;
  transactionDate: string;
  isAuto: boolean;
};

export function CashFlowTable({ transactions }: { transactions: CashFlowRow[] }) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center text-muted-foreground">
        <p className="text-sm">Nenhuma movimentação nesse período.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="text-muted-foreground">{formatDate(t.transactionDate)}</TableCell>
              <TableCell>
                <Badge variant="outline">{TRANSACTION_CATEGORY_LABELS[t.category]}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{t.description || "—"}</TableCell>
              <TableCell
                className={`text-right font-medium ${t.type === "INCOME" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
              >
                {t.type === "INCOME" ? "+" : "-"}
                {formatCurrency(t.amount)}
              </TableCell>
              <TableCell>
                {!t.isAuto && (
                  <ConfirmDeleteDialog
                    trigger={
                      <Button variant="ghost" size="icon-sm">
                        <Trash2 className="size-4" />
                      </Button>
                    }
                    description="Esse lançamento manual será removido do fluxo de caixa."
                    onConfirm={() => deleteTransaction(t.id)}
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
