import { z } from "zod";
import { COST_CATEGORIES, PAYMENT_METHODS, PRODUCT_CONDITIONS, emptyToUndefined } from "./shared";

export const costItemSchema = z.object({
  category: z.enum(COST_CATEGORIES),
  description: z.string().optional(),
  amount: z.coerce.number().positive("Informe um valor maior que zero."),
});

export const purchaseFormSchema = z.object({
  // produto
  name: z.string().min(1, "Informe o nome do produto."),
  categoryId: z.string().uuid("Selecione uma categoria."),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  color: z.string().optional(),
  condition: z.enum(PRODUCT_CONDITIONS),
  description: z.string().optional(),
  productNotes: z.string().optional(),
  desiredSalePrice: z.preprocess(
    emptyToUndefined,
    z.coerce.number().nonnegative("O preço desejado não pode ser negativo.").optional()
  ),

  // compra
  purchaseDate: z.string().min(1, "Informe a data da compra."),
  paidAmount: z.coerce.number().positive("Informe um valor maior que zero."),
  paymentMethod: z.enum(PAYMENT_METHODS),
  purchaseNotes: z.string().optional(),
  costItems: z.array(costItemSchema).default([]),

  // vendedor
  sellerFullName: z.string().min(1, "Informe o nome do vendedor."),
  sellerPhone: z.string().optional(),
  sellerCity: z.string().optional(),
  sellerState: z.string().optional(),
  sellerCpf: z.string().optional(),
  sellerNotes: z.string().optional(),
});

export type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;
