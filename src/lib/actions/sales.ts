"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saleFormSchema } from "@/lib/validations/sale";
import { attachmentFileSchema } from "@/lib/validations/attachment";
import { ATTACHMENT_KINDS, COST_CATEGORY_LABELS } from "@/lib/validations/shared";
import {
  calcGrossProfit,
  calcMarginPercent,
  calcNetProfit,
  sumAmounts,
} from "@/lib/calculations";
import { uploadAttachmentFile } from "@/lib/attachments";

export type CreateSaleState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

export async function createSale(
  productId: string,
  _prevState: CreateSaleState,
  formData: FormData
): Promise<CreateSaleState> {
  const user = await requireUser();

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id, deletedAt: null },
    include: { purchase: true, sale: true },
  });

  if (!product || !product.purchase) {
    return { error: "Produto não encontrado." };
  }
  if (product.sale) {
    return { error: "Esse produto já foi vendido." };
  }

  let costItems: unknown = [];
  try {
    costItems = JSON.parse(String(formData.get("costItemsJson") ?? "[]"));
  } catch {
    return { error: "Custos adicionais inválidos." };
  }

  const raw = {
    saleDate: formData.get("saleDate"),
    saleAmount: formData.get("saleAmount"),
    paymentMethod: formData.get("paymentMethod"),
    saleNotes: formData.get("saleNotes") || undefined,
    costItems,
    buyerFullName: formData.get("buyerFullName"),
    buyerPhone: formData.get("buyerPhone") || undefined,
    buyerCity: formData.get("buyerCity") || undefined,
    buyerState: formData.get("buyerState") || undefined,
    buyerNotes: formData.get("buyerNotes") || undefined,
  };

  const parsed = saleFormSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Confira os campos destacados.", fieldErrors };
  }

  const data = parsed.data;

  const files = formData
    .getAll("attachmentFiles")
    .filter((f): f is File => f instanceof File && f.size > 0);

  let attachmentKinds: string[] = [];
  try {
    attachmentKinds = JSON.parse(String(formData.get("attachmentKindsJson") ?? "[]"));
  } catch {
    return { error: "Anexos inválidos." };
  }

  for (const file of files) {
    const check = attachmentFileSchema.safeParse(file);
    if (!check.success) {
      return { error: `"${file.name}": ${check.error.issues[0]?.message ?? "arquivo inválido."}` };
    }
  }
  for (const kind of attachmentKinds) {
    if (!ATTACHMENT_KINDS.includes(kind as (typeof ATTACHMENT_KINDS)[number])) {
      return { error: "Tipo de anexo inválido." };
    }
  }

  const saleCostsTotal = sumAmounts(data.costItems.map((item) => item.amount));
  const purchase = product.purchase;
  const grossProfit = calcGrossProfit(data.saleAmount, Number(purchase.paidAmount));
  const netProfit = calcNetProfit(
    data.saleAmount,
    Number(purchase.totalInvested),
    saleCostsTotal
  );
  const marginPercent = calcMarginPercent(netProfit, Number(purchase.totalInvested));
  const saleDate = new Date(`${data.saleDate}T12:00:00`);

  const { saleId } = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        productId: product.id,
        saleDate,
        saleAmount: data.saleAmount,
        paymentMethod: data.paymentMethod,
        grossProfit,
        netProfit,
        marginPercent,
        notes: data.saleNotes,
      },
    });

    await tx.saleBuyer.create({
      data: {
        saleId: sale.id,
        fullName: data.buyerFullName,
        phone: data.buyerPhone,
        city: data.buyerCity,
        state: data.buyerState,
        notes: data.buyerNotes,
      },
    });

    await tx.product.update({
      where: { id: product.id },
      data: { status: "SOLD" },
    });

    await tx.financialTransaction.create({
      data: {
        userId: user.id,
        type: "INCOME",
        category: "VENDA",
        amount: data.saleAmount,
        description: `Venda — ${product.name}`,
        transactionDate: saleDate,
        saleId: sale.id,
        isAuto: true,
      },
    });

    for (const item of data.costItems) {
      await tx.financialTransaction.create({
        data: {
          userId: user.id,
          type: "EXPENSE",
          category: item.category,
          amount: item.amount,
          description: item.description || `${COST_CATEGORY_LABELS[item.category]} — ${product.name}`,
          transactionDate: saleDate,
          saleId: sale.id,
          isAuto: true,
        },
      });
    }

    return { saleId: sale.id };
  });

  const uploadErrors: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const kind = (attachmentKinds[i] ?? "OUTRO") as (typeof ATTACHMENT_KINDS)[number];
    try {
      const { storagePath } = await uploadAttachmentFile({ userId: user.id, scopeId: saleId, file });
      await prisma.attachment.create({
        data: {
          userId: user.id,
          saleId,
          kind,
          fileName: file.name,
          storagePath,
          mimeType: file.type,
          sizeBytes: file.size,
        },
      });
    } catch {
      uploadErrors.push(file.name);
    }
  }

  revalidatePath("/vendas");
  revalidatePath("/estoque");
  revalidatePath(`/estoque/${product.id}`);
  revalidatePath("/compras");
  revalidatePath("/dashboard");

  if (uploadErrors.length > 0) {
    redirect(
      `/estoque/${product.id}?warning=${encodeURIComponent(
        `Venda salva, mas falha ao enviar: ${uploadErrors.join(", ")}`
      )}`
    );
  }

  redirect(`/estoque/${product.id}?success=1`);
}
