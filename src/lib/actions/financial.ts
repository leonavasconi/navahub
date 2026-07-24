"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionFormSchema } from "@/lib/validations/financial";

export type CreateTransactionState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

export async function createTransaction(
  _prevState: CreateTransactionState,
  formData: FormData
): Promise<CreateTransactionState> {
  const user = await requireUser();

  const parsed = transactionFormSchema.safeParse({
    type: formData.get("type"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    description: formData.get("description") || undefined,
    transactionDate: formData.get("transactionDate"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Confira os campos destacados.", fieldErrors };
  }

  const data = parsed.data;

  await prisma.financialTransaction.create({
    data: {
      userId: user.id,
      type: data.type,
      category: data.category,
      amount: data.amount,
      description: data.description,
      transactionDate: new Date(`${data.transactionDate}T12:00:00`),
      isAuto: false,
    },
  });

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");

  return { error: null };
}

export async function deleteTransaction(id: string) {
  const user = await requireUser();

  const transaction = await prisma.financialTransaction.findFirst({
    where: { id, userId: user.id, isAuto: false },
  });

  if (!transaction) {
    throw new Error("Lançamento não encontrado ou não pode ser removido diretamente.");
  }

  await prisma.financialTransaction.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}
