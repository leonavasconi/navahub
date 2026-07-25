"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saleFormSchema, type SaleFormValues } from "@/lib/validations/sale";
import { attachmentFileSchema } from "@/lib/validations/attachment";
import { ATTACHMENT_KINDS, COST_CATEGORY_LABELS } from "@/lib/validations/shared";
import {
  calcGrossProfit,
  calcMarginPercent,
  calcNetProfit,
  sumAmounts,
} from "@/lib/calculations";
import { uploadAttachmentFile } from "@/lib/attachments";
import { activeOnly } from "@/lib/soft-delete";

export type CreateSaleState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

type ParsedSaleForm =
  | { success: false; state: CreateSaleState }
  | { success: true; data: SaleFormValues; files: File[]; attachmentKinds: string[] };

async function parseSaleFormData(formData: FormData): Promise<ParsedSaleForm> {
  let costItems: unknown = [];
  try {
    costItems = JSON.parse(String(formData.get("costItemsJson") ?? "[]"));
  } catch {
    return { success: false, state: { error: "Custos adicionais inválidos." } };
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
    return { success: false, state: { error: "Confira os campos destacados.", fieldErrors } };
  }

  const data = parsed.data;

  const files = formData
    .getAll("attachmentFiles")
    .filter((f): f is File => f instanceof File && f.size > 0);

  let attachmentKinds: string[] = [];
  try {
    attachmentKinds = JSON.parse(String(formData.get("attachmentKindsJson") ?? "[]"));
  } catch {
    return { success: false, state: { error: "Anexos inválidos." } };
  }

  for (const file of files) {
    const check = attachmentFileSchema.safeParse(file);
    if (!check.success) {
      return {
        success: false,
        state: { error: `"${file.name}": ${check.error.issues[0]?.message ?? "arquivo inválido."}` },
      };
    }
  }
  for (const kind of attachmentKinds) {
    if (!ATTACHMENT_KINDS.includes(kind as (typeof ATTACHMENT_KINDS)[number])) {
      return { success: false, state: { error: "Tipo de anexo inválido." } };
    }
  }

  return { success: true, data, files, attachmentKinds };
}

async function uploadSaleAttachments(
  userId: string,
  saleId: string,
  files: File[],
  attachmentKinds: string[]
): Promise<string[]> {
  const uploadErrors: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const kind = (attachmentKinds[i] ?? "OUTRO") as (typeof ATTACHMENT_KINDS)[number];
    try {
      const { storagePath } = await uploadAttachmentFile({ userId, scopeId: saleId, file });
      await prisma.attachment.create({
        data: {
          userId,
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
  return uploadErrors;
}

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
  if (activeOnly(product.sale)) {
    return { error: "Esse produto já foi vendido." };
  }

  const parsed = await parseSaleFormData(formData);
  if (!parsed.success) return parsed.state;
  const { data, files, attachmentKinds } = parsed;

  const saleCostsTotal = sumAmounts(data.costItems.map((item) => item.amount));
  const purchase = product.purchase;
  const grossProfit = calcGrossProfit(data.saleAmount, Number(purchase.paidAmount));
  const netProfit = calcNetProfit(data.saleAmount, Number(purchase.totalInvested), saleCostsTotal);
  const marginPercent = calcMarginPercent(netProfit, Number(purchase.totalInvested));
  const saleDate = new Date(`${data.saleDate}T12:00:00`);

  const { saleId } = await prisma.$transaction(async (tx) => {
    // productId é único em sales — se esse produto já teve uma venda excluída (soft-delete),
    // reaproveita a mesma linha em vez de tentar criar outra (que colidiria na constraint).
    const saleData = {
      saleDate,
      saleAmount: data.saleAmount,
      paymentMethod: data.paymentMethod,
      grossProfit,
      netProfit,
      marginPercent,
      notes: data.saleNotes,
      deletedAt: null,
    };
    const sale = await tx.sale.upsert({
      where: { productId: product.id },
      update: saleData,
      create: { productId: product.id, ...saleData },
    });

    await tx.saleBuyer.upsert({
      where: { saleId: sale.id },
      update: {
        fullName: data.buyerFullName,
        phone: data.buyerPhone,
        city: data.buyerCity,
        state: data.buyerState,
        notes: data.buyerNotes,
      },
      create: {
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

  const uploadErrors = await uploadSaleAttachments(user.id, saleId, files, attachmentKinds);

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

  redirect(`/estoque/${product.id}?success=${encodeURIComponent("Venda registrada com sucesso.")}`);
}

export async function updateSale(
  productId: string,
  _prevState: CreateSaleState,
  formData: FormData
): Promise<CreateSaleState> {
  const user = await requireUser();

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id, deletedAt: null },
    include: { purchase: true, sale: true },
  });

  const activeSale = product && activeOnly(product.sale);
  if (!product || !product.purchase || !activeSale) {
    return { error: "Venda não encontrada." };
  }

  const parsed = await parseSaleFormData(formData);
  if (!parsed.success) return parsed.state;
  const { data, files, attachmentKinds } = parsed;

  const saleId = activeSale.id;
  const purchase = product.purchase;
  const saleCostsTotal = sumAmounts(data.costItems.map((item) => item.amount));
  const grossProfit = calcGrossProfit(data.saleAmount, Number(purchase.paidAmount));
  const netProfit = calcNetProfit(data.saleAmount, Number(purchase.totalInvested), saleCostsTotal);
  const marginPercent = calcMarginPercent(netProfit, Number(purchase.totalInvested));
  const saleDate = new Date(`${data.saleDate}T12:00:00`);

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: saleId },
      data: {
        saleDate,
        saleAmount: data.saleAmount,
        paymentMethod: data.paymentMethod,
        grossProfit,
        netProfit,
        marginPercent,
        notes: data.saleNotes,
      },
    });

    await tx.saleBuyer.update({
      where: { saleId },
      data: {
        fullName: data.buyerFullName,
        phone: data.buyerPhone,
        city: data.buyerCity,
        state: data.buyerState,
        notes: data.buyerNotes,
      },
    });

    await tx.financialTransaction.updateMany({
      where: { saleId, isAuto: true, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    await tx.financialTransaction.create({
      data: {
        userId: user.id,
        type: "INCOME",
        category: "VENDA",
        amount: data.saleAmount,
        description: `Venda — ${product.name}`,
        transactionDate: saleDate,
        saleId,
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
          saleId,
          isAuto: true,
        },
      });
    }
  });

  const uploadErrors = await uploadSaleAttachments(user.id, saleId, files, attachmentKinds);

  revalidatePath("/vendas");
  revalidatePath("/estoque");
  revalidatePath(`/estoque/${productId}`);
  revalidatePath("/compras");
  revalidatePath("/dashboard");
  revalidatePath("/financeiro");

  if (uploadErrors.length > 0) {
    redirect(
      `/estoque/${productId}?warning=${encodeURIComponent(
        `Venda atualizada, mas falha ao enviar: ${uploadErrors.join(", ")}`
      )}`
    );
  }

  redirect(`/estoque/${productId}?success=${encodeURIComponent("Venda atualizada com sucesso.")}`);
}

export async function deleteSale(productId: string): Promise<void> {
  const user = await requireUser();

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id, deletedAt: null },
    include: { sale: true },
  });

  const activeSale = activeOnly(product?.sale);
  if (!product || !activeSale) {
    throw new Error("Venda não encontrada.");
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.sale.update({ where: { id: activeSale.id }, data: { deletedAt: now } }),
    prisma.financialTransaction.updateMany({
      where: { saleId: activeSale.id, deletedAt: null },
      data: { deletedAt: now },
    }),
    prisma.product.update({ where: { id: productId }, data: { status: "AVAILABLE" } }),
  ]);

  revalidatePath("/vendas");
  revalidatePath("/estoque");
  revalidatePath(`/estoque/${productId}`);
  revalidatePath("/dashboard");
  revalidatePath("/financeiro");
}
