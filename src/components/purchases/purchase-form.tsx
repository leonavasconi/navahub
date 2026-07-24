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
import { CategoryCombobox } from "@/components/shared/category-combobox";
import {
  AttachmentUploader,
  type AttachmentDraft,
} from "@/components/shared/attachment-uploader";
import {
  COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PRODUCT_CONDITIONS,
  PRODUCT_CONDITION_LABELS,
} from "@/lib/validations/shared";
import { createPurchase, type CreatePurchaseState } from "@/lib/actions/purchases";
import { sumAmounts, calcTotalInvested } from "@/lib/calculations";
import { formatCurrency } from "@/lib/format";

type Category = { id: string; name: string };

type CostItemDraft = {
  id: string;
  category: (typeof COST_CATEGORIES)[number];
  description: string;
  amount: string;
};

const initialState: CreatePurchaseState = { error: null };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function PurchaseForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [state, dispatch, isPending] = useActionState(createPurchase, initialState);

  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [condition, setCondition] = useState<(typeof PRODUCT_CONDITIONS)[number]>("SEMINOVO");
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_METHODS)[number]>("PIX");
  const [purchaseDate, setPurchaseDate] = useState(todayISO());
  const [paidAmount, setPaidAmount] = useState("");
  const [costItems, setCostItems] = useState<CostItemDraft[]>([]);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);

  const additionalCostsTotal = useMemo(
    () => sumAmounts(costItems.map((item) => Number(item.amount) || 0)),
    [costItems]
  );
  const totalInvested = useMemo(
    () => calcTotalInvested(Number(paidAmount) || 0, additionalCostsTotal),
    [paidAmount, additionalCostsTotal]
  );

  const errors = state.fieldErrors ?? {};

  function addCostItem() {
    setCostItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), category: "OUTROS", description: "", amount: "" },
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

    if (categoryId) formData.set("categoryId", categoryId);
    formData.set("condition", condition);
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
          <CardTitle>Produto</CardTitle>
          <CardDescription>Dados do item que você está comprando.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="name">Nome do produto</Label>
            <Input id="name" name="name" placeholder="PlayStation 5 Slim" required />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Categoria</Label>
            <CategoryCombobox categories={categories} value={categoryId} onChange={setCategoryId} />
            {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Condição</Label>
            <Select value={condition} onValueChange={(v) => setCondition(v as typeof condition)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {PRODUCT_CONDITION_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="brand">Marca</Label>
            <Input id="brand" name="brand" placeholder="Sony" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="model">Modelo</Label>
            <Input id="model" name="model" placeholder="CFI-2014A" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="serialNumber">Número de série</Label>
            <Input id="serialNumber" name="serialNumber" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="color">Cor</Label>
            <Input id="color" name="color" placeholder="Branco" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="desiredSalePrice">Preço desejado de venda</Label>
            <CurrencyInput id="desiredSalePrice" name="desiredSalePrice" />
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="productNotes">Observações</Label>
            <Textarea id="productNotes" name="productNotes" rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compra</CardTitle>
          <CardDescription>Valor pago e custos relacionados à aquisição.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="purchaseDate">Data da compra</Label>
              <Input
                id="purchaseDate"
                name="purchaseDate"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="paidAmount">Valor pago</Label>
              <CurrencyInput
                id="paidAmount"
                name="paidAmount"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                required
              />
              {errors.paidAmount && <p className="text-sm text-destructive">{errors.paidAmount}</p>}
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
              <Label>Custos adicionais</Label>
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
            <Label htmlFor="purchaseNotes">Observações da compra</Label>
            <Textarea id="purchaseNotes" name="purchaseNotes" rows={2} />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3">
            <span className="text-sm font-medium">Valor total investido</span>
            <span className="text-lg font-semibold text-primary">
              {formatCurrency(totalInvested)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendedor</CardTitle>
          <CardDescription>De quem você está comprando o produto.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="sellerFullName">Nome completo</Label>
            <Input id="sellerFullName" name="sellerFullName" required />
            {errors.sellerFullName && (
              <p className="text-sm text-destructive">{errors.sellerFullName}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sellerPhone">Telefone</Label>
            <Input id="sellerPhone" name="sellerPhone" placeholder="(11) 91234-5678" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sellerCpf">CPF (opcional)</Label>
            <Input id="sellerCpf" name="sellerCpf" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sellerCity">Cidade</Label>
            <Input id="sellerCity" name="sellerCity" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sellerState">Estado</Label>
            <Input id="sellerState" name="sellerState" placeholder="SP" maxLength={2} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="sellerNotes">Observações</Label>
            <Textarea id="sellerNotes" name="sellerNotes" rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comprovantes</CardTitle>
          <CardDescription>Anexe comprovantes, notas ou fotos do produto.</CardDescription>
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
        <Button type="button" variant="outline" onClick={() => router.push("/compras")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          Salvar compra
        </Button>
      </div>
    </form>
  );
}
