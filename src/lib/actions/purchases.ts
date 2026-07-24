"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { purchaseFormSchema } from "@/lib/validations/purchase";
import { attachmentFileSchema } from "@/lib/validations/attachment";
import { ATTACHMENT_KINDS, COST_CATEGORY_LABELS } from "@/lib/validations/shared";
import { calcTotalInvested, sumAmounts } from "@/lib/calculations";
import { uploadAttachmentFile } from "@/lib/attachments";

export type CreatePurchaseState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

export async function createPurchase(
  _prevState: CreatePurchaseState,
  formData: FormData
): Promise<CreatePurchaseState> {
  const user = await requireUser();

  let costItems: unknown = [];
  try {
    costItems = JSON.parse(String(formData.get("costItemsJson") ?? "[]"));
  } catch {
    return { error: "Custos adicionais inválidos." };
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
    return { error: "Confira os campos destacados.", fieldErrors };
  }

  const data = parsed.data;

  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId: user.id },
  });
  if (!category) {
    return {
      error: "Categoria inválida.",
      fieldErrors: { categoryId: "Selecione uma categoria válida." },
    };
  }

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

  const uploadErrors: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const kind = (attachmentKinds[i] ?? "OUTRO") as (typeof ATTACHMENT_KINDS)[number];
    try {
      const { storagePath } = await uploadAttachmentFile({
        userId: user.id,
        scopeId: purchaseId,
        file,
      });
      await prisma.attachment.create({
        data: {
          userId: user.id,
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

  redirect("/compras?success=1");
}
