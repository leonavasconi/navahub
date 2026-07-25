const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Datas de negócio (compra/venda/lançamento) são colunas @db.Date no Postgres — sem hora,
// sempre o dia "puro". Formatar em UTC evita que o fuso do servidor jogue a data um dia
// pra trás (ex.: meia-noite UTC vira 21h do dia anterior em horários negativos como -03:00).
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Aceita number, string ou qualquer valor decimal-like (ex.: Prisma.Decimal) que
 * seja coercível via Number() — cobre os campos Decimal vindos direto do Prisma. */
export function formatCurrency(value: number | string | { toString(): string }): string {
  const numeric = typeof value === "number" ? value : Number(value);
  return currencyFormatter.format(Number.isFinite(numeric) ? numeric : 0);
}

export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return dateFormatter.format(date);
}

export function formatDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return dateTimeFormatter.format(date);
}

export function formatPercent(value: number, fractionDigits = 2): string {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatDaysInStock(days: number): string {
  return days === 1 ? "1 dia" : `${days} dias`;
}
