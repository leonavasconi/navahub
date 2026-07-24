import { z } from "zod";
import { PAYMENT_METHODS } from "./shared";
import { costItemSchema } from "./purchase";

export const saleFormSchema = z.object({
  saleDate: z.string().min(1, "Informe a data da venda."),
  saleAmount: z.coerce.number().positive("Informe um valor maior que zero."),
  paymentMethod: z.enum(PAYMENT_METHODS),
  saleNotes: z.string().optional(),
  costItems: z.array(costItemSchema).default([]),

  buyerFullName: z.string().min(1, "Informe o nome do comprador."),
  buyerPhone: z.string().optional(),
  buyerCity: z.string().optional(),
  buyerState: z.string().optional(),
  buyerNotes: z.string().optional(),
});

export type SaleFormValues = z.infer<typeof saleFormSchema>;
