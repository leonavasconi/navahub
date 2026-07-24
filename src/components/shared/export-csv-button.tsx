"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function ExportCsvButton({
  filename,
  columns,
  rows,
}: {
  filename: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string | number>[];
}) {
  function handleExport() {
    const header = columns.map((c) => csvEscape(c.label)).join(",");
    const body = rows
      .map((row) => columns.map((c) => csvEscape(String(row[c.key] ?? ""))).join(","))
      .join("\n");
    // BOM no início garante acentuação correta ao abrir no Excel.
    const csv = `﻿${header}\n${body}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
      <Download />
      Exportar CSV
    </Button>
  );
}
