import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // O CLI (migrate/seed/studio) precisa da conexão direta (porta 5432): migrations usam
  // advisory locks que não funcionam de forma confiável atrás do pooler em modo transaction.
  // O app em runtime (src/lib/prisma.ts) usa DATABASE_URL (pooled, porta 6543) separadamente.
  datasource: {
    url: env("DIRECT_URL"),
  },
});
