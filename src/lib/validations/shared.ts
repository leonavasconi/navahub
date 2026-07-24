export const PRODUCT_CONDITIONS = ["NOVO", "SEMINOVO", "USADO", "COM_DEFEITO"] as const;
export const PRODUCT_CONDITION_LABELS: Record<(typeof PRODUCT_CONDITIONS)[number], string> = {
  NOVO: "Novo",
  SEMINOVO: "Seminovo",
  USADO: "Usado",
  COM_DEFEITO: "Com defeito",
};

export const PAYMENT_METHODS = ["PIX", "DINHEIRO", "TRANSFERENCIA", "CARTAO", "OUTROS"] as const;
export const PAYMENT_METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  PIX: "PIX",
  DINHEIRO: "Dinheiro",
  TRANSFERENCIA: "Transferência",
  CARTAO: "Cartão",
  OUTROS: "Outros",
};

export const COST_CATEGORIES = [
  "TRANSPORTE",
  "MANUTENCAO",
  "TAXAS",
  "EMBALAGEM",
  "ACESSORIOS",
  "OUTROS",
] as const;
export const COST_CATEGORY_LABELS: Record<(typeof COST_CATEGORIES)[number], string> = {
  TRANSPORTE: "Transporte",
  MANUTENCAO: "Manutenção",
  TAXAS: "Taxas",
  EMBALAGEM: "Embalagem",
  ACESSORIOS: "Acessórios",
  OUTROS: "Outros",
};

export const PRODUCT_STATUSES = ["AVAILABLE", "RESERVED", "SOLD", "MAINTENANCE"] as const;
export const PRODUCT_STATUS_LABELS: Record<(typeof PRODUCT_STATUSES)[number], string> = {
  AVAILABLE: "Disponível",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  MAINTENANCE: "Em manutenção",
};

export const ATTACHMENT_KINDS = [
  "COMPROVANTE_PIX",
  "COMPROVANTE_TRANSFERENCIA",
  "NOTA",
  "RECIBO",
  "FOTO_PRODUTO",
  "CONVERSA",
  "OUTRO",
] as const;
export const ATTACHMENT_KIND_LABELS: Record<(typeof ATTACHMENT_KINDS)[number], string> = {
  COMPROVANTE_PIX: "Comprovante PIX",
  COMPROVANTE_TRANSFERENCIA: "Comprovante de transferência",
  NOTA: "Nota",
  RECIBO: "Recibo",
  FOTO_PRODUTO: "Foto do produto",
  CONVERSA: "Conversa",
  OUTRO: "Outro",
};

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function emptyToUndefined(value: unknown) {
  return value === "" ? undefined : value;
}
