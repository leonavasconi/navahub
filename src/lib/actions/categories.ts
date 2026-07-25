"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/categories";

export type CreateCategoryResult =
  | { success: true; category: { id: string; name: string } }
  | { success: false; error: string };

export async function createCategory(name: string): Promise<CreateCategoryResult> {
  const user = await requireUser();
  const trimmed = name.trim();

  if (!trimmed) {
    return { success: false, error: "Informe um nome para a categoria." };
  }

  const slug = slugify(trimmed);

  const category = await prisma.category.upsert({
    where: { userId_slug: { userId: user.id, slug } },
    update: {},
    create: { userId: user.id, name: trimmed, slug },
  });

  revalidatePath("/compras/novo");
  revalidatePath("/configuracoes");

  return { success: true, category };
}

export async function listCategories() {
  const user = await requireUser();
  return prisma.category.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
}

export async function updateCategory(id: string, name: string): Promise<CreateCategoryResult> {
  const user = await requireUser();
  const trimmed = name.trim();

  if (!trimmed) {
    return { success: false, error: "Informe um nome para a categoria." };
  }

  const existing = await prisma.category.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return { success: false, error: "Categoria não encontrada." };
  }

  const slug = slugify(trimmed);
  const conflict = await prisma.category.findFirst({
    where: { userId: user.id, slug, NOT: { id } },
  });
  if (conflict) {
    return { success: false, error: "Já existe uma categoria com esse nome." };
  }

  const category = await prisma.category.update({
    where: { id },
    data: { name: trimmed, slug },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/compras/novo");

  return { success: true, category };
}

export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireUser();

  const category = await prisma.category.findFirst({
    where: { id, userId: user.id },
    include: { _count: { select: { products: true } } },
  });

  if (!category) {
    return { success: false, error: "Categoria não encontrada." };
  }

  if (category._count.products > 0) {
    return {
      success: false,
      error: `Essa categoria tem ${category._count.products} produto(s) e não pode ser excluída.`,
    };
  }

  await prisma.category.delete({ where: { id } });

  revalidatePath("/configuracoes");
  revalidatePath("/compras/novo");

  return { success: true };
}
