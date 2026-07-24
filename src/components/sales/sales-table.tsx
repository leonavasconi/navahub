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
import { formatCurrency, formatDate, formatDaysInStock, formatPercent } from "@/lib/format";

export type SaleRow = {
  id: string;
  productId: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  purchaseDate: string;
  saleDate: string;
  buyerName: string;
  buyerCity: string;
  totalInvested: number;
  saleAmount: number;
  netProfit: number;
  marginPercent: number;
  daysInStock: number;
};

const PAGE_SIZE = 10;
const ALL = "__all__";

export function SalesTable({
  sales,
  categories,
}: {
  sales: SaleRow[];
  categories: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState(ALL);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minProfit, setMinProfit] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sales.filter((s) => {
      if (q) {
        const matches =
          s.productName.toLowerCase().includes(q) ||
          s.buyerName.toLowerCase().includes(q) ||
          s.buyerCity.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (categoryId !== ALL && s.categoryId !== categoryId) return false;
      if (dateFrom && s.saleDate.slice(0, 10) < dateFrom) return false;
      if (dateTo && s.saleDate.slice(0, 10) > dateTo) return false;
      if (minProfit && s.netProfit < Number(minProfit)) return false;
      return true;
    });
  }, [sales, query, categoryId, dateFrom, dateTo, minProfit]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totals = useMemo(
    () => ({
      saleAmount: filtered.reduce((acc, s) => acc + s.saleAmount, 0),
      netProfit: filtered.reduce((acc, s) => acc + s.netProfit, 0),
    }),
    [filtered]
  );

  const hasActiveFilters = categoryId !== ALL || dateFrom || dateTo || minProfit || query;

  function clearFilters() {
    setQuery("");
    setCategoryId(ALL);
    setDateFrom("");
    setDateTo("");
    setMinProfit("");
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Produto, comprador ou cidade..."
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

        <div className="flex items-center gap-1">
          <Input
            type="date"
            className="w-[150px]"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="date"
            className="w-[150px]"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <Input
          type="number"
          placeholder="Lucro mínimo"
          className="w-[140px]"
          value={minProfit}
          onChange={(e) => {
            setMinProfit(e.target.value);
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
            {sales.length === 0
              ? "Nenhuma venda registrada ainda."
              : "Nenhuma venda encontrada para esses filtros."}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 rounded-lg bg-muted/60 px-4 py-3 text-sm">
            <span>
              <span className="text-muted-foreground">Total vendido: </span>
              <span className="font-semibold">{formatCurrency(totals.saleAmount)}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Lucro total: </span>
              <span className="font-semibold text-primary">{formatCurrency(totals.netProfit)}</span>
            </span>
          </div>

          <div className="hidden overflow-x-auto rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Venda</TableHead>
                  <TableHead className="text-right">Custo total</TableHead>
                  <TableHead className="text-right">Valor vendido</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead className="text-right">Dias em estoque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <Link href={`/estoque/${s.productId}`} className="hover:underline">
                        {s.productName}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{s.categoryName}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.buyerName}</TableCell>
                    <TableCell className="text-muted-foreground">{s.buyerCity || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(s.saleDate)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(s.totalInvested)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(s.saleAmount)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${s.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
                    >
                      {formatCurrency(s.netProfit)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatPercent(s.marginPercent)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDaysInStock(s.daysInStock)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {pageItems.map((s) => (
              <Link
                key={s.id}
                href={`/estoque/${s.productId}`}
                className="rounded-xl border p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{s.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      {s.buyerName}
                      {s.buyerCity ? ` · ${s.buyerCity}` : ""}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">{formatDate(s.saleDate)}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Valor vendido</p>
                    <p className="font-medium">{formatCurrency(s.saleAmount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Lucro</p>
                    <p className="font-medium text-primary">{formatCurrency(s.netProfit)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Margem</p>
                    <p>{formatPercent(s.marginPercent)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dias em estoque</p>
                    <p>{formatDaysInStock(s.daysInStock)}</p>
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
