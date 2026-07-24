import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PurchaseForm } from "@/components/purchases/purchase-form";

export default async function NovaCompraPage() {
  const user = await requireUser();
  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova compra</h1>
        <p className="text-muted-foreground">
          Cadastre o produto, os dados da compra e de quem você comprou.
        </p>
      </div>
      <div className="max-w-3xl">
        <PurchaseForm categories={categories} />
      </div>
    </div>
  );
}
