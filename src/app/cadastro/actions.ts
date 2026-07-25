"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CATEGORIES, slugify } from "@/lib/categories";

export type SignupState = { error: string | null };

const signupSchema = z.object({
  fullName: z.string().min(1, "Informe seu nome completo."),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export async function signup(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Confira os dados informados." };
  }
  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." };
  }

  const { fullName, email } = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) {
    if (error?.code === "email_exists" || /already.*registered|already.*exists/i.test(error?.message ?? "")) {
      return { error: "Já existe uma conta com esse e-mail." };
    }
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }

  try {
    await prisma.$transaction([
      prisma.profile.create({ data: { id: data.user.id, fullName, email } }),
      prisma.category.createMany({
        data: DEFAULT_CATEGORIES.map((name) => ({
          userId: data.user!.id,
          name,
          slug: slugify(name),
        })),
      }),
    ]);
  } catch {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    redirect(`/login?success=${encodeURIComponent("Conta criada! Faça login para continuar.")}`);
  }

  redirect("/dashboard");
}
