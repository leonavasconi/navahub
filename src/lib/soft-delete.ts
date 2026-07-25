/** Prisma não filtra `deletedAt` em relações 1:1 buscadas via include/select — um registro
 * soft-deleted (ex.: uma venda excluída) continua vindo junto pela FK. Use isso sempre que
 * ler `product.sale` / `product.purchase` para saber se o vínculo está realmente ativo. */
export function activeOnly<T extends { deletedAt: Date | null }>(
  record: T | null | undefined
): T | null {
  return record && !record.deletedAt ? record : null;
}
