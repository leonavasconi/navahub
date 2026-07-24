"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductStatusBadge } from "@/components/shared/status-badge";
import { PRODUCT_STATUS_LABELS, PRODUCT_STATUSES } from "@/lib/validations/shared";
import { formatCurrency, formatDate, formatDaysInStock } from "@/lib/format";

export type StockRow = {
  id: string;
  name: string;
  model: string | null;
  serialNumber: string | null;
  categoryId: string;
  categoryName: string;
  purchaseDate: string;
  totalInvested: number;
  daysInStock: number;
  desiredSalePrice: number | null;
  status: (typeof PRODUCT_STATUSES)[number];
};

const PAGE_SIZE = 10;
const ALL = "__all__";

export function StockTable({
  products,
  categories,
}: {
  products: StockRow[];
  categories: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minDays, setMinDays] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (q) {
        const matches =
          p.name.toLowerCase().includes(q) ||
          (p.model ?? "").toLowerCase().includes(q) ||
          (p.serialNumber ?? "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (categoryId !== ALL && p.categoryId !== categoryId) return false;
      if (status !== ALL && p.status !== status) return false;
      if (minPrice && p.totalInvested < Number(minPrice)) return false;
      if (maxPrice && p.totalInvested > Number(maxPrice)) return false;
      if (minDays && p.daysInStock < Number(minDays)) return false;
      return true;
    });
  }, [products, query, categoryId, status, minPrice, maxPrice, minDays]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasActiveFilters =
    categoryId !== ALL || status !== ALL || minPrice || maxPrice || minDays || query;

  function clearFilters() {
    setQuery("");
    setCategoryId(ALL);
    setStatus(ALL);
    setMinPrice("");
    setMaxPrice("");
    setMinDays("");
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nome, modelo ou série..."
            className="pl-9"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <Select
          value={categoryId}
          onValueChange={(v) => {
            setCategoryId(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos status</SelectItem>
            {PRODUCT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {PRODUCT_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Input
            type="number"
            placeholder="Custo mín."
            className="w-[110px]"
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value);
              setPage(1);
            }}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            placeholder="Custo máx."
            className="w-[110px]"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <Input
          type="number"
          placeholder="Dias em estoque (mín.)"
          className="w-[170px]"
          value={minDays}
          onChange={(e) => {
            setMinDays(e.target.value);
            setPage(1);
          }}
        />

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X />
            Limpar filtros
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <p className="text-sm">
            {products.length === 0
              ? "Nenhum produto em estoque ainda."
              : "Nenhum produto encontrado para esses filtros."}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Compra</TableHead>
                  <TableHead className="text-right">Custo total</TableHead>
                  <TableHead className="text-right">Preço desejado</TableHead>
                  <TableHead className="text-right">Dias em estoque</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link href={`/estoque/${p.id}`} className="hover:underline">
                        {p.name}
                      </Link>
                      {p.model && (
                        <span className="block text-xs text-muted-foreground">{p.model}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.categoryName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(p.purchaseDate)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(p.totalInvested)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {p.desiredSalePrice != null ? formatCurrency(p.desiredSalePrice) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDaysInStock(p.daysInStock)}
                    </TableCell>
                    <TableCell>
                      <ProductStatusBadge status={p.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {pageItems.map((p) => (
              <Link
                key={p.id}
                href={`/estoque/${p.id}`}
                className="rounded-xl border p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.categoryName}</p>
                  </div>
                  <ProductStatusBadge status={p.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Compra</p>
                    <p>{formatDate(p.purchaseDate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dias em estoque</p>
                    <p>{formatDaysInStock(p.daysInStock)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Custo total</p>
                    <p className="font-medium">{formatCurrency(p.totalInvested)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Preço desejado</p>
                    <p>{p.desiredSalePrice != null ? formatCurrency(p.desiredSalePrice) : "—"}</p>
                  </div>
                </div>
              </Link>
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
