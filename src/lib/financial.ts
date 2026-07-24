export const PERIOD_OPTIONS = [
  "this_month",
  "last_month",
  "last_3_months",
  "last_6_months",
  "this_year",
  "custom",
] as const;
export type Period = (typeof PERIOD_OPTIONS)[number];

export const PERIOD_LABELS: Record<Period, string> = {
  this_month: "Este mês",
  last_month: "Mês passado",
  last_3_months: "Últimos 3 meses",
  last_6_months: "Últimos 6 meses",
  this_year: "Este ano",
  custom: "Período personalizado",
};

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getPeriodRange(
  period: Period,
  customFrom?: string,
  customTo?: string
): { from: Date; to: Date } {
  const now = new Date();

  switch (period) {
    case "this_month":
      return { from: startOfMonth(now), to: endOfDay(now) };
    case "last_month": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from, to: endOfDay(to) };
    }
    case "last_3_months":
      return { from: startOfMonth(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: endOfDay(now) };
    case "last_6_months":
      return { from: startOfMonth(new Date(now.getFullYear(), now.getMonth() - 5, 1)), to: endOfDay(now) };
    case "this_year":
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) };
    case "custom": {
      const from = customFrom ? new Date(`${customFrom}T00:00:00`) : startOfMonth(now);
      const to = customTo ? endOfDay(new Date(`${customTo}T00:00:00`)) : endOfDay(now);
      return { from, to };
    }
  }
}
