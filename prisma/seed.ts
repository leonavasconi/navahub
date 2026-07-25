import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAULT_CATEGORIES, slugify } from "../src/lib/categories";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const profiles = await prisma.profile.findMany({ select: { id: true, email: true } });

  if (profiles.length === 0) {
    console.log(
      "Nenhum usuário encontrado. Rode `npx tsx scripts/create-admin.ts` antes de semear as categorias."
    );
    return;
  }

  for (const profile of profiles) {
    for (const name of DEFAULT_CATEGORIES) {
      await prisma.category.upsert({
        where: { userId_slug: { userId: profile.id, slug: slugify(name) } },
        update: {},
        create: { userId: profile.id, name, slug: slugify(name) },
      });
    }
    console.log(`Categorias padrão garantidas para ${profile.email}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
