"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { purchaseFormSchema, type PurchaseFormValues } from "@/lib/validations/purchase";
import { attachmentFileSchema } from "@/lib/validations/attachment";
import { ATTACHMENT_KINDS, COST_CATEGORY_LABELS } from "@/lib/validations/shared";
import {
  calcTotalInvested,
  sumAmounts,
  calcGrossProfit,
  calcNetProfit,
  calcMarginPercent,
} from "@/lib/calculations";
import { uploadAttachmentFile } from "@/lib/attachments";
import { activeOnly } from "@/lib/soft-delete";

export type CreatePurchaseState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

type ParsedPurchaseForm =
  | { success: false; state: CreatePurchaseState }
  | {
      success: true;
      data: PurchaseFormValues;
      files: File[];
      attachmentKinds: string[];
    };

async function parsePurchaseForm(userId: string, formData: FormData): Promise<ParsedPurchaseForm> {
  let costItems: unknown = [];
  try {
    costItems = JSON.parse(String(formData.get("costItemsJson") ?? "[]"));
  } catch {
    return { success: false, state: { error: "Custos adicionais inválidos." } };
  }

  const raw = {
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    brand: formData.get("brand") || undefined,
    model: formData.get("model") || undefined,
    serialNumber: formData.get("serialNumber") || undefined,
    color: formData.get("color") || undefined,
    condition: formData.get("condition"),
    description: formData.get("description") || undefined,
    productNotes: formData.get("productNotes") || undefined,
    desiredSalePrice: formData.get("desiredSalePrice") ?? "",
    purchaseDate: formData.get("purchaseDate"),
    paidAmount: formData.get("paidAmount"),
    paymentMethod: formData.get("paymentMethod"),
    purchaseNotes: formData.get("purchaseNotes") || undefined,
    costItems,
    sellerFullName: formData.get("sellerFullName"),
    sellerPhone: formData.get("sellerPhone") || undefined,
    sellerCity: formData.get("sellerCity") || undefined,
    sellerState: formData.get("sellerState") || undefined,
    sellerCpf: formData.get("sellerCpf") || undefined,
    sellerNotes: formData.get("sellerNotes") || undefined,
  };

  const parsed = purchaseFormSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { success: false, state: { error: "Confira os campos destacados.", fieldErrors } };
  }

  const data = parsed.data;

  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId },
  });
  if (!category) {
    return {
      success: false,
      state: {
        error: "Categoria inválida.",
        fieldErrors: { categoryId: "Selecione uma categoria válida." },
      },
    };
  }

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

async function uploadPurchaseAttachments(
  userId: string,
  purchaseId: string,
  files: File[],
  attachmentKinds: string[]
): Promise<string[]> {
  const uploadErrors: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const kind = (attachmentKinds[i] ?? "OUTRO") as (typeof ATTACHMENT_KINDS)[number];
    try {
      const { storagePath } = await uploadAttachmentFile({ userId, scopeId: purchaseId, file });
      await prisma.attachment.create({
        data: {
          userId,
          purchaseId,
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

export async function createPurchase(
  _prevState: CreatePurchaseState,
  formData: FormData
): Promise<CreatePurchaseState> {
  const user = await requireUser();

  const parsed = await parsePurchaseForm(user.id, formData);
  if (!parsed.success) return parsed.state;
  const { data, files, attachmentKinds } = parsed;

  const additionalCostsTotal = sumAmounts(data.costItems.map((item) => item.amount));
  const totalInvested = calcTotalInvested(data.paidAmount, additionalCostsTotal);
  const purchaseDate = new Date(`${data.purchaseDate}T12:00:00`);

  const { purchaseId } = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        userId: user.id,
        categoryId: data.categoryId,
        name: data.name,
        brand: data.brand,
        model: data.model,
        serialNumber: data.serialNumber,
        color: data.color,
        condition: data.condition,
        description: data.description,
        notes: data.productNotes,
        desiredSalePrice: data.desiredSalePrice,
      },
    });

    const purchase = await tx.purchase.create({
      data: {
        productId: product.id,
        purchaseDate,
        paidAmount: data.paidAmount,
        paymentMethod: data.paymentMethod,
        totalInvested,
        notes: data.purchaseNotes,
      },
    });

    await tx.purchaseSeller.create({
      data: {
        purchaseId: purchase.id,
        fullName: data.sellerFullName,
        phone: data.sellerPhone,
        city: data.sellerCity,
        state: data.sellerState,
        cpf: data.sellerCpf,
        notes: data.sellerNotes,
      },
    });

    await tx.financialTransaction.create({
      data: {
        userId: user.id,
        type: "EXPENSE",
        category: "COMPRA",
        amount: data.paidAmount,
        description: `Compra — ${data.name}`,
        transactionDate: purchaseDate,
        purchaseId: purchase.id,
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
          description: item.description || `${COST_CATEGORY_LABELS[item.category]} — ${data.name}`,
          transactionDate: purchaseDate,
          purchaseId: purchase.id,
          isAuto: true,
        },
      });
    }

    return { productId: product.id, purchaseId: purchase.id };
  });

  const uploadErrors = await uploadPurchaseAttachments(user.id, purchaseId, files, attachmentKinds);

  revalidatePath("/compras");
  revalidatePath("/estoque");
  revalidatePath("/dashboard");

  if (uploadErrors.length > 0) {
    redirect(
      `/compras?warning=${encodeURIComponent(
        `Compra salva, mas falha ao enviar: ${uploadErrors.join(", ")}`
      )}`
    );
  }

  redirect(`/compras?success=${encodeURIComponent("Compra registrada com sucesso.")}`);
}

export async function updatePurchase(
  productId: string,
  _prevState: CreatePurchaseState,
  formData: FormData
): Promise<CreatePurchaseState> {
  const user = await requireUser();

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id, deletedAt: null },
    include: { purchase: true, sale: true },
  });
  if (!product || !product.purchase) {
    return { error: "Produto não encontrado." };
  }

  const parsed = await parsePurchaseForm(user.id, formData);
  if (!parsed.success) return parsed.state;
  const { data, files, attachmentKinds } = parsed;

  const additionalCostsTotal = sumAmounts(data.costItems.map((item) => item.amount));
  const totalInvested = calcTotalInvested(data.paidAmount, additionalCostsTotal);
  const purchaseDate = new Date(`${data.purchaseDate}T12:00:00`);
  const purchaseId = product.purchase.id;

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        categoryId: data.categoryId,
        name: data.name,
        brand: data.brand,
        model: data.model,
        serialNumber: data.serialNumber,
        color: data.color,
        condition: data.condition,
        description: data.description,
        notes: data.productNotes,
        desiredSalePrice: data.desiredSalePrice,
      },
    });

    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        purchaseDate,
        paidAmount: data.paidAmount,
        paymentMethod: data.paymentMethod,
        totalInvested,
        notes: data.purchaseNotes,
      },
    });

    await tx.purchaseSeller.update({
      where: { purchaseId },
      data: {
        fullName: data.sellerFullName,
        phone: data.sellerPhone,
        city: data.sellerCity,
        state: data.sellerState,
        cpf: data.sellerCpf,
        notes: data.sellerNotes,
      },
    });

    // Reconcilia os lançamentos automáticos: apaga os antigos e recria com os valores atuais.
    await tx.financialTransaction.updateMany({
      where: { purchaseId, isAuto: true, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    await tx.financialTransaction.create({
      data: {
        userId: user.id,
        type: "EXPENSE",
        category: "COMPRA",
        amount: data.paidAmount,
        description: `Compra — ${data.name}`,
        transactionDate: purchaseDate,
        purchaseId,
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
          description: item.description || `${COST_CATEGORY_LABELS[item.category]} — ${data.name}`,
          transactionDate: purchaseDate,
          purchaseId,
          isAuto: true,
        },
      });
    }

    // O custo total mudou — se o produto já foi vendido, o lucro/margem da venda precisa
    // ser recalculado em cima do novo totalInvested.
    const activeSale = activeOnly(product.sale);
    if (activeSale) {
      const saleCostItems = await tx.financialTransaction.findMany({
        where: { saleId: activeSale.id, category: { not: "VENDA" }, deletedAt: null },
        select: { amount: true },
      });
      const saleCostsTotal = sumAmounts(saleCostItems.map((i) => Number(i.amount)));
      const grossProfit = calcGrossProfit(Number(activeSale.saleAmount), data.paidAmount);
      const netProfit = calcNetProfit(Number(activeSale.saleAmount), totalInvested, saleCostsTotal);
      const marginPercent = calcMarginPercent(netProfit, totalInvested);

      await tx.sale.update({
        where: { id: activeSale.id },
        data: { grossProfit, netProfit, marginPercent },
      });
    }
  });

  const uploadErrors = await uploadPurchaseAttachments(user.id, purchaseId, files, attachmentKinds);

  revalidatePath("/compras");
  revalidatePath("/estoque");
  revalidatePath(`/estoque/${productId}`);
  revalidatePath("/vendas");
  revalidatePath("/dashboard");

  if (uploadErrors.length > 0) {
    redirect(
      `/estoque/${productId}?warning=${encodeURIComponent(
        `Compra atualizada, mas falha ao enviar: ${uploadErrors.join(", ")}`
      )}`
    );
  }

  redirect(`/estoque/${productId}?success=${encodeURIComponent("Compra atualizada com sucesso.")}`);
}

export async function deletePurchase(productId: string): Promise<void> {
  const user = await requireUser();

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id, deletedAt: null },
    include: { purchase: true, sale: true },
  });

  if (!product || !product.purchase) {
    throw new Error("Produto não encontrado.");
  }
  if (activeOnly(product.sale)) {
    throw new Error("Exclua a venda antes de excluir esta compra.");
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.product.update({ where: { id: productId }, data: { deletedAt: now } }),
    prisma.purchase.update({ where: { id: product.purchase.id }, data: { deletedAt: now } }),
    prisma.financialTransaction.updateMany({
      where: { purchaseId: product.purchase.id, deletedAt: null },
      data: { deletedAt: now },
    }),
  ]);

  revalidatePath("/compras");
  revalidatePath("/estoque");
  revalidatePath("/dashboard");
}
