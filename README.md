# NavaHub

Painel de gestão de compras, vendas e estoque de eletrônicos seminovos (consoles, iPhones, notebooks, acessórios e outros dispositivos).

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4 + [shadcn/ui](https://ui.shadcn.com)
- [Prisma](https://www.prisma.io) + PostgreSQL ([Supabase](https://supabase.com))
- [Supabase Auth](https://supabase.com/docs/guides/auth) (sessão via cookies) + [Supabase Storage](https://supabase.com/docs/guides/storage) (anexos)
- Deploy: [Vercel](https://vercel.com), hospedado no GitHub

## Modelo de segurança

O Prisma conecta diretamente no Postgres do Supabase (não passa pelo PostgREST), então as políticas de Row Level Security **não** são o mecanismo principal de proteção nesse caminho — elas ficam habilitadas como defesa em profundidade. A autorização real acontece no backend: toda consulta roda em Server Components / Server Actions / Route Handlers, sempre filtrada pelo usuário autenticado (`lib/auth.ts`). Nunca faça consultas ao banco diretamente do client.

Uploads de anexos passam sempre por um Route Handler no servidor, que valida tipo (PDF/JPG/PNG/WEBP) e tamanho (10MB) antes de gravar no bucket privado `attachments`; o download usa signed URLs de curta duração geradas sob demanda (`/api/attachments/[id]/download`), nunca URLs públicas.

## Rodando localmente

1. `npm install` (já roda `prisma generate` automaticamente via `postinstall`)
2. Copie `.env.example` para `.env` e preencha com as credenciais do seu projeto Supabase (Project Settings > API e > Database > Connection string).
3. `npx prisma migrate dev` — cria as tabelas no banco (usa `DIRECT_URL`).
4. `npx tsx scripts/create-admin.ts` — cria seu usuário de acesso (pede nome/e-mail/senha no terminal, nada disso passa pelo chat).
5. `npx prisma db seed` — cria as categorias padrão para o usuário criado no passo anterior.
6. `npm run dev` e acesse [http://localhost:3000](http://localhost:3000).

## Deploy (GitHub + Vercel)

1. Crie um repositório no GitHub e envie este projeto (`.env` nunca é versionado — confira o `.gitignore`).
2. Na Vercel, importe o repositório (New Project → Import).
3. Em Environment Variables, adicione todas as chaves do `.env.example` com os valores reais do seu projeto Supabase.
4. `npm run build` já roda `prisma migrate deploy` antes do `next build`, então qualquer migration nova sobe automaticamente a cada deploy.
5. Depois do primeiro deploy, rode `npx tsx scripts/create-admin.ts` e `npx prisma db seed` localmente (apontando pro `.env` de produção) para criar seu usuário — não existe cadastro público.

## Notas técnicas

- **`@radix-ui/react-slot` fixo em `1.2.5`** (sem `^`) — a `1.3.x` quebra o build de produção do Turbopack (Next 16.2) com `TypeError: createContext is not a function` em rotas dentro do grupo `(app)`. Não faça upgrade desse pacote sem testar `next build` (não só `next dev`, que não reproduz o problema).
- Componentes do shadcn adicionados via `npx shadcn add` vêm com `import { X } from "radix-ui"` (pacote unificado). Troque para o pacote individual (`@radix-ui/react-x`) ao adicionar componentes novos, pelo mesmo motivo acima.

## Estrutura

```
prisma/            schema, migrations e seed
scripts/           scripts utilitários (ex.: criação do usuário admin)
src/app/           rotas (App Router)
src/components/    componentes de UI (ui/ = shadcn, demais = específicos do domínio)
src/lib/           acesso a dados, auth, cálculos, validações e server actions
```
