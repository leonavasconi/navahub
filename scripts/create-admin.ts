/**
 * Cria o usuário administrador (único usuário do NavaHub por enquanto).
 * Roda localmente, direto no seu terminal — e-mail/senha nunca passam pelo chat.
 *
 * Uso:
 *   npx tsx scripts/create-admin.ts
 */
import "dotenv/config";
import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const CTRL_C = String.fromCharCode(3);
const BACKSPACE = String.fromCharCode(127);

const rl = readline.createInterface({ input: stdin, output: stdout });

async function prompt(question: string): Promise<string> {
  const answer = await rl.question(question);
  return answer.trim();
}

async function promptHidden(question: string): Promise<string> {
  // stdin.setRawMode só existe quando há um TTY real. Em pipes (ex.: CI, execução não
  // interativa) cai para o prompt simples, sem mascarar.
  if (!stdin.isTTY) {
    return prompt(question);
  }

  return new Promise((resolve) => {
    stdout.write(question);
    let collected = "";

    const onData = (char: Buffer) => {
      const str = char.toString("utf8");

      if (str === "\n" || str === "\r") {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        stdout.write("\n");
        resolve(collected.trim());
      } else if (str === CTRL_C) {
        stdout.write("\n");
        process.exit(1);
      } else if (str === BACKSPACE) {
        collected = collected.slice(0, -1);
      } else {
        collected += str;
      }
    };

    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === "placeholder") {
    console.error(
      "Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env antes de rodar este script."
    );
    process.exit(1);
  }

  // ADMIN_NAME/ADMIN_EMAIL/ADMIN_PASSWORD permitem rodar sem prompt interativo (ex.: scripts, CI).
  const fullName = process.env.ADMIN_NAME ?? (await prompt("Nome completo: "));
  const email = process.env.ADMIN_EMAIL ?? (await prompt("E-mail de acesso: "));
  const password =
    process.env.ADMIN_PASSWORD ?? (await promptHidden("Senha (mín. 8 caracteres): "));
  rl.close();

  if (password.length < 8) {
    console.error("A senha precisa ter pelo menos 8 caracteres.");
    process.exit(1);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    console.error("Erro ao criar usuário no Supabase Auth:", error?.message);
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  await prisma.profile.upsert({
    where: { id: data.user.id },
    update: { fullName, email },
    create: { id: data.user.id, fullName, email },
  });

  await prisma.$disconnect();

  console.log(`\nUsuário criado com sucesso: ${email}`);
  console.log("Rode `npx prisma db seed` para criar as categorias padrão.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
