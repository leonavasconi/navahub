import { z } from "zod";

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE"] as const;
export const TRANSACTION_TYPE_LABELS: Record<(typeof TRANSACTION_TYPES)[number], string> = {
  INCOME: "Entrada",
  EXPENSE: "Saída",
};

export const TRANSACTION_CATEGORIES = [
  "COMPRA",
  "VENDA",
  "TRANSPORTE",
  "MANUTENCAO",
  "TAXAS",
  "EMBALAGEM",
  "ACESSORIOS",
  "OUTROS",
] as const;
export const TRANSACTION_CATEGORY_LABELS: Record<(typeof TRANSACTION_CATEGORIES)[number], string> = {
  COMPRA: "Compra de produto",
  VENDA: "Venda de produto",
  TRANSPORTE: "Transporte",
  MANUTENCAO: "Manutenção",
  TAXAS: "Taxas",
  EMBALAGEM: "Embalagem",
  ACESSORIOS: "Acessórios",
  OUTROS: "Outros",
};

export const transactionFormSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  category: z.enum(TRANSACTION_CATEGORIES),
  amount: z.coerce.number().positive("Informe um valor maior que zero."),
  description: z.string().optional(),
  transactionDate: z.string().min(1, "Informe a data."),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
