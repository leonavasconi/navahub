import Image from "next/image";
import Link from "next/link";
import { Package, TrendingUp, Wallet } from "lucide-react";
import { SignupForm } from "./signup-form";

const FEATURES = [
  { icon: Package, label: "Estoque", description: "Saiba o que ainda está com você" },
  { icon: TrendingUp, label: "Vendas", description: "Lucro e margem calculados na hora" },
  { icon: Wallet, label: "Financeiro", description: "Fluxo de caixa sempre em dia" },
];

export default function CadastroPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-chart-2 to-chart-3 p-12 text-primary-foreground lg:flex">
        <div>
          <span className="text-2xl font-semibold tracking-tight">NavaHub</span>
        </div>

        <div className="flex flex-col gap-8">
          <h1 className="max-w-md text-3xl leading-tight font-semibold">
            Cada conta com seu próprio estoque, vendas e financeiro.
          </h1>
          <div className="flex flex-col gap-4">
            {FEATURES.map(({ icon: Icon, label, description }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-primary-foreground/80">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-primary-foreground/70">
          © {new Date().getFullYear()} NavaHub
        </p>
      </div>

      <div className="flex items-center justify-center bg-background p-6">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex flex-col items-center gap-6 text-center">
            <Image src="/branding/logo.png" alt="NavaHub" width={200} height={55} priority />
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold text-foreground">Criar conta</h2>
              <p className="text-sm text-muted-foreground">
                Seus dados ficam separados de qualquer outra conta no NavaHub.
              </p>
            </div>
          </div>

          <SignupForm />

          <p className="text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
