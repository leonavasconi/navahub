import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Receipt } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProductStatusBadge } from "@/components/shared/status-badge";
import { AttachmentList } from "@/components/shared/attachment-list";
import { QueryToast } from "@/components/shared/query-toast";
import { PurchaseActions } from "@/components/stock/purchase-actions";
import { SaleActions } from "@/components/stock/sale-actions";
import { activeOnly } from "@/lib/soft-delete";
import { calcDaysInStock } from "@/lib/calculations";
import { formatCurrency, formatDate, formatDaysInStock, formatPercent } from "@/lib/format";
import {
  COST_CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  PRODUCT_CONDITION_LABELS,
} from "@/lib/validations/shared";

export default async function ProdutoPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const user = await requireUser();
  const { productId } = await params;

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id, deletedAt: null },
    include: {
      category: true,
      purchase: {
        include: {
          seller: true,
          attachments: true,
          financialTransactions: { where: { deletedAt: null } },
        },
      },
      sale: {
        include: {
          buyer: true,
          attachments: true,
          financialTransactions: { where: { deletedAt: null } },
        },
      },
    },
  });

  if (!product || !product.purchase) notFound();

  const { purchase } = product;
  const sale = activeOnly(product.sale);
  const purchaseCostItems = purchase.financialTransactions.filter((t) => t.category !== "COMPRA");
  const saleCostItems = sale?.financialTransactions.filter((t) => t.category !== "VENDA") ?? [];
  const daysInStock = calcDaysInStock(purchase.purchaseDate, sale?.saleDate ?? new Date());
  const estimatedProfit =
    !sale && product.desiredSalePrice != null
      ? Number(product.desiredSalePrice) - Number(purchase.totalInvested)
      : null;

  const attachments = [...purchase.attachments, ...(sale?.attachments ?? [])];

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <QueryToast />
      </Suspense>
      <div>
        <Link
          href="/estoque"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Estoque
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
            <ProductStatusBadge status={product.status} />
          </div>
          {!sale && (
            <Button asChild>
              <Link href={`/estoque/${product.id}/venda`}>
                <Receipt />
                Registrar venda
              </Link>
            </Button>
          )}
        </div>
        <p className="text-muted-foreground">
          {product.category.name}
          {product.brand ? ` · ${product.brand}` : ""}
          {product.model ? ` · ${product.model}` : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat label="Investimento" value={formatCurrency(purchase.totalInvested)} />
        <SummaryStat
          label={sale ? "Venda" : "Preço desejado"}
          value={
            sale
              ? formatCurrency(sale.saleAmount)
              : product.desiredSalePrice != null
                ? formatCurrency(product.desiredSalePrice)
                : "—"
          }
        />
        <SummaryStat
          label={sale ? "Lucro líquido" : "Lucro estimado"}
          value={
            sale
              ? formatCurrency(sale.netProfit)
              : estimatedProfit != null
                ? formatCurrency(estimatedProfit)
                : "—"
          }
          highlight
        />
        <SummaryStat
          label={sale ? "Dias em estoque (até a venda)" : "Dias em estoque"}
          value={formatDaysInStock(daysInStock)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do produto</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Condição" value={PRODUCT_CONDITION_LABELS[product.condition]} />
            <Field label="Cor" value={product.color ?? "—"} />
            <Field label="Número de série" value={product.serialNumber ?? "—"} />
            <Field label="Categoria" value={product.category.name} />
            {product.description && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Descrição</p>
                <p>{product.description}</p>
              </div>
            )}
            {product.notes && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Observações</p>
                <p>{product.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Compra</CardTitle>
            <PurchaseActions productId={product.id} canDelete={!sale} />
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data" value={formatDate(purchase.purchaseDate)} />
              <Field label="Forma de pagamento" value={PAYMENT_METHOD_LABELS[purchase.paymentMethod]} />
              <Field label="Valor pago" value={formatCurrency(purchase.paidAmount)} />
              <Field label="Custo total" value={formatCurrency(purchase.totalInvested)} />
            </div>

            {purchaseCostItems.length > 0 && (
              <div>
                <p className="mb-1 text-muted-foreground">Custos adicionais</p>
                <div className="flex flex-col gap-1">
                  {purchaseCostItems.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.description || COST_CATEGORY_LABELS[item.category as keyof typeof COST_CATEGORY_LABELS]}</span>
                      <span>{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <div>
              <p className="mb-1 font-medium">Comprado de</p>
              <p>{purchase.seller?.fullName}</p>
              <p className="text-muted-foreground">
                {[purchase.seller?.city, purchase.seller?.state].filter(Boolean).join(" - ")}
                {purchase.seller?.phone ? ` · ${purchase.seller.phone}` : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        {sale ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Venda</CardTitle>
              <SaleActions productId={product.id} />
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Data" value={formatDate(sale.saleDate)} />
                <Field label="Forma de pagamento" value={PAYMENT_METHOD_LABELS[sale.paymentMethod]} />
                <Field label="Valor de venda" value={formatCurrency(sale.saleAmount)} />
                <Field label="Margem" value={formatPercent(Number(sale.marginPercent))} />
              </div>

              {saleCostItems.length > 0 && (
                <div>
                  <p className="mb-1 text-muted-foreground">Custos da venda</p>
                  <div className="flex flex-col gap-1">
                    {saleCostItems.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span>{item.description || COST_CATEGORY_LABELS[item.category as keyof typeof COST_CATEGORY_LABELS]}</span>
                        <span>{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <p className="mb-1 font-medium">Vendido para</p>
                <p>{sale.buyer?.fullName}</p>
                <p className="text-muted-foreground">
                  {[sale.buyer?.city, sale.buyer?.state].filter(Boolean).join(" - ")}
                  {sale.buyer?.phone ? ` · ${sale.buyer.phone}` : ""}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Venda</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Esse produto ainda não foi vendido.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <AttachmentList attachments={attachments} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent className="px-4 py-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-xl font-semibold ${highlight ? "text-primary" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
