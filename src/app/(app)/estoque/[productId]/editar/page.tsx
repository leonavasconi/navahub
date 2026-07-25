import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PurchaseForm, type PurchaseFormInitialValues } from "@/components/purchases/purchase-form";

export default async function EditarCompraPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const user = await requireUser();
  const { productId } = await params;

  const [product, categories] = await Promise.all([
    prisma.product.findFirst({
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
      },
    }),
    prisma.category.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!product || !product.purchase) notFound();

  const { purchase } = product;
  const costItems = purchase.financialTransactions
    .filter((t) => t.category !== "COMPRA")
    .map((t) => ({
      category: t.category as PurchaseFormInitialValues["costItems"][number]["category"],
      description: t.description ?? "",
      amount: String(t.amount),
    }));

  const initialValues: PurchaseFormInitialValues = {
    name: product.name,
    categoryId: product.categoryId,
    categoryName: product.category.name,
    brand: product.brand ?? "",
    model: product.model ?? "",
    serialNumber: product.serialNumber ?? "",
    color: product.color ?? "",
    condition: product.condition,
    purchaseDate: purchase.purchaseDate.toISOString().slice(0, 10),
    paidAmount: String(purchase.paidAmount),
    paymentMethod: purchase.paymentMethod,
    costItems,
    sellerFullName: purchase.seller?.fullName ?? "",
    sellerPhone: purchase.seller?.phone ?? "",
    sellerCity: purchase.seller?.city ?? "",
    sellerState: purchase.seller?.state ?? "",
    sellerCpf: purchase.seller?.cpf ?? "",
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/estoque/${product.id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {product.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Editar compra</h1>
        <p className="text-muted-foreground">Atualize os dados do produto, da compra e do vendedor.</p>
      </div>

      <div className="max-w-3xl">
        <PurchaseForm
          categories={categories}
          mode="edit"
          productId={product.id}
          initialValues={initialValues}
          existingAttachments={purchase.attachments}
        />
      </div>
    </div>
  );
}
