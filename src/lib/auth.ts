import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type Session = { id: string; email: string };

export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) return null;

  return { id: data.claims.sub, email: String(data.claims.email ?? "") };
}

/** Garante que a rota só continua para usuários autenticados. O middleware já protege as
 * rotas do grupo (app), isso aqui é defesa em profundidade para quem chamar direto. */
export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Sessão + perfil (nome, etc.) já filtrado pelo usuário autenticado — use nas páginas
 * que precisam exibir dados do usuário além do id/e-mail. */
export async function requireProfile() {
  const session = await requireUser();
  const profile = await prisma.profile.findUniqueOrThrow({ where: { id: session.id } });
  return profile;
}
