/** Fonte única dos cálculos financeiros do NavaHub — usado por compras, vendas,
 * dashboard, financeiro e relatórios para garantir que o número nunca diverge. */

export function sumAmounts(amounts: (number | string)[]): number {
  return amounts.reduce((total: number, value) => total + Number(value), 0);
}

/** valor pago + soma dos custos adicionais da compra */
export function calcTotalInvested(paidAmount: number, additionalCosts: number): number {
  return paidAmount + additionalCosts;
}

/** valor de venda - valor de compra (sem descontar custos) */
export function calcGrossProfit(saleAmount: number, paidAmount: number): number {
  return saleAmount - paidAmount;
}

/** valor de venda - custo total do produto - custos da venda */
export function calcNetProfit(
  saleAmount: number,
  totalInvested: number,
  saleCosts: number
): number {
  return saleAmount - totalInvested - saleCosts;
}

/** lucro líquido / custo total investido * 100 */
export function calcMarginPercent(netProfit: number, totalInvested: number): number {
  if (totalInvested === 0) return 0;
  return (netProfit / totalInvested) * 100;
}

export function calcDaysInStock(purchaseDate: Date, until: Date = new Date()): number {
  const ms = until.getTime() - purchaseDate.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}
