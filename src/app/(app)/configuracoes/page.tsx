import { requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CategoriesManager } from "@/components/settings/categories-manager";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function ConfiguracoesPage() {
  const profile = await requireProfile();
  const categories = await prisma.category.findMany({
    where: { userId: profile.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Seu perfil e as categorias de produtos.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seu perfil</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="size-12">
            <AvatarFallback className="bg-primary/10 text-base text-primary">
              {initials(profile.fullName) || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{profile.fullName}</p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categorias</CardTitle>
          <CardDescription>
            Usadas para organizar os produtos em Compras e Estoque.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoriesManager categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
