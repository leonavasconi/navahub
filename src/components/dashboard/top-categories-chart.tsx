"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function CategoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { name: string; count: number } }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const { name, count } = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-popover-foreground">{name}</p>
      <p className="text-muted-foreground">
        {count} {count === 1 ? "produto" : "produtos"}
      </p>
    </div>
  );
}

export function TopCategoriesChart({ data }: { data: { name: string; count: number }[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Produtos mais negociados</CardTitle>
          <CardDescription>Por categoria</CardDescription>
        </CardHeader>
        <CardContent className="flex h-56 items-center justify-center text-sm text-muted-foreground">
          Sem produtos cadastrados ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos mais negociados</CardTitle>
        <CardDescription>Por categoria</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis
              type="number"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              width={90}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <Tooltip content={<CategoryTooltip />} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="count" name="Produtos" fill="var(--primary)" radius={[0, 4, 4, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
