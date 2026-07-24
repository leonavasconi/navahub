"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductStatusBadge } from "@/components/shared/status-badge";
import { PRODUCT_STATUSES } from "@/lib/validations/shared";
import { formatCurrency, formatDate } from "@/lib/format";

export type PurchaseRow = {
  id: string;
  productId: string;
  productName: string;
  categoryName: string;
  purchaseDate: string;
  paidAmount: number;
  totalInvested: number;
  sellerName: string;
  status: (typeof PRODUCT_STATUSES)[number];
};

const PAGE_SIZE = 10;

export function PurchasesTable({ purchases }: { purchases: PurchaseRow[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return purchases;
    return purchases.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        p.sellerName.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q)
    );
  }, [purchases, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por produto, vendedor ou categoria..."
          className="pl-9"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <p className="text-sm">
            {purchases.length === 0
              ? "Nenhuma compra cadastrada ainda."
              : "Nenhuma compra encontrada para essa busca."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-x-auto rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Valor pago</TableHead>
                  <TableHead className="text-right">Custo total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.productName}</TableCell>
                    <TableCell className="text-muted-foreground">{p.categoryName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(p.purchaseDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.sellerName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.paidAmount)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(p.totalInvested)}
                    </TableCell>
                    <TableCell>
                      <ProductStatusBadge status={p.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="flex flex-col gap-3 md:hidden">
            {pageItems.map((p) => (
              <div key={p.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.productName}</p>
                    <p className="text-sm text-muted-foreground">{p.categoryName}</p>
                  </div>
                  <ProductStatusBadge status={p.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Data</p>
                    <p>{formatDate(p.purchaseDate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Vendedor</p>
                    <p className="truncate">{p.sellerName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor pago</p>
                    <p>{formatCurrency(p.paidAmount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Custo total</p>
                    <p className="font-medium">{formatCurrency(p.totalInvested)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-md border px-3 py-1 disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-md border px-3 py-1 disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
