"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/currency-input";
import {
  AttachmentUploader,
  type AttachmentDraft,
} from "@/components/shared/attachment-uploader";
import {
  COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/validations/shared";
import { createSale, type CreateSaleState } from "@/lib/actions/sales";
import { sumAmounts, calcGrossProfit, calcNetProfit, calcMarginPercent } from "@/lib/calculations";
import { formatCurrency, formatPercent } from "@/lib/format";

type CostItemDraft = {
  id: string;
  category: (typeof COST_CATEGORIES)[number];
  description: string;
  amount: string;
};

const initialState: CreateSaleState = { error: null };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function SaleForm({
  productId,
  paidAmount,
  totalInvested,
}: {
  productId: string;
  paidAmount: number;
  totalInvested: number;
}) {
  const router = useRouter();
  const action = createSale.bind(null, productId);
  const [state, dispatch, isPending] = useActionState(action, initialState);

  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("PIX");
  const [saleDate, setSaleDate] = useState(todayISO());
  const [saleAmount, setSaleAmount] = useState("");
  const [costItems, setCostItems] = useState<CostItemDraft[]>([]);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);

  const saleCostsTotal = useMemo(
    () => sumAmounts(costItems.map((item) => Number(item.amount) || 0)),
    [costItems]
  );
  const grossProfit = useMemo(
    () => calcGrossProfit(Number(saleAmount) || 0, paidAmount),
    [saleAmount, paidAmount]
  );
  const netProfit = useMemo(
    () => calcNetProfit(Number(saleAmount) || 0, totalInvested, saleCostsTotal),
    [saleAmount, totalInvested, saleCostsTotal]
  );
  const marginPercent = useMemo(
    () => calcMarginPercent(netProfit, totalInvested),
    [netProfit, totalInvested]
  );

  const errors = state.fieldErrors ?? {};

  function addCostItem() {
    setCostItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), category: "TAXAS", description: "", amount: "" },
    ]);
  }

  function updateCostItem(id: string, patch: Partial<CostItemDraft>) {
    setCostItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeCostItem(id: string) {
    setCostItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    formData.set("paymentMethod", paymentMethod);
    formData.set(
      "costItemsJson",
      JSON.stringify(
        costItems
          .filter((item) => item.amount)
          .map((item) => ({
            category: item.category,
            description: item.description,
            amount: item.amount,
          }))
      )
    );

    for (const draft of attachments) {
      formData.append("attachmentFiles", draft.file);
    }
    formData.set("attachmentKindsJson", JSON.stringify(attachments.map((d) => d.kind)));

    startTransition(() => {
      dispatch(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Venda</CardTitle>
          <CardDescription>Valor e custos relacionados a essa venda.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="saleDate">Data da venda</Label>
              <Input
                id="saleDate"
                name="saleDate"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="saleAmount">Valor da venda</Label>
              <CurrencyInput
                id="saleAmount"
                name="saleAmount"
                value={saleAmount}
                onChange={(e) => setSaleAmount(e.target.value)}
                required
              />
              {errors.saleAmount && <p className="text-sm text-destructive">{errors.saleAmount}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Forma de pagamento</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label>Custos relacionados à venda</Label>
              <Button type="button" variant="outline" size="sm" onClick={addCostItem}>
                <Plus />
                Adicionar custo
              </Button>
            </div>

            {costItems.length > 0 && (
              <div className="flex flex-col gap-2">
                {costItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 items-center gap-2">
                    <Select
                      value={item.category}
                      onValueChange={(v) => updateCostItem(item.id, { category: v as typeof item.category })}
                    >
                      <SelectTrigger className="col-span-4 sm:col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COST_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {COST_CATEGORY_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Descrição (opcional)"
                      value={item.description}
                      onChange={(e) => updateCostItem(item.id, { description: e.target.value })}
                      className="col-span-5 sm:col-span-6"
                    />
                    <CurrencyInput
                      value={item.amount}
                      onChange={(e) => updateCostItem(item.id, { amount: e.target.value })}
                      className="col-span-2"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeCostItem(item.id)}
                      className="col-span-1"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="saleNotes">Observações</Label>
            <Textarea id="saleNotes" name="saleNotes" rows={2} />
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/60 px-4 py-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Lucro bruto</p>
              <p className="font-semibold">{formatCurrency(grossProfit)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lucro líquido</p>
              <p className="font-semibold text-primary">{formatCurrency(netProfit)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Margem</p>
              <p className="font-semibold">{formatPercent(marginPercent)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comprador</CardTitle>
          <CardDescription>Para quem você está vendendo o produto.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="buyerFullName">Nome completo</Label>
            <Input id="buyerFullName" name="buyerFullName" required />
            {errors.buyerFullName && (
              <p className="text-sm text-destructive">{errors.buyerFullName}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="buyerPhone">Telefone</Label>
            <Input id="buyerPhone" name="buyerPhone" placeholder="(11) 91234-5678" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="buyerCity">Cidade</Label>
            <Input id="buyerCity" name="buyerCity" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="buyerState">Estado</Label>
            <Input id="buyerState" name="buyerState" placeholder="SP" maxLength={2} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="buyerNotes">Observações</Label>
            <Textarea id="buyerNotes" name="buyerNotes" rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comprovantes</CardTitle>
          <CardDescription>Anexe comprovante de pagamento, recibo ou outros documentos.</CardDescription>
        </CardHeader>
        <CardContent>
          <AttachmentUploader value={attachments} onChange={setAttachments} />
        </CardContent>
      </Card>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          Registrar venda
        </Button>
      </div>
    </form>
  );
}
