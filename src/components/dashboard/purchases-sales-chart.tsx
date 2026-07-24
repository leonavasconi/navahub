"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartTooltip } from "./chart-tooltip";

export function PurchasesSalesChart({
  data,
}: {
  data: { month: string; compras: number; vendas: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Compras x vendas</CardTitle>
        <CardDescription>Valor investido vs. valor vendido, últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="24%" barGap={2}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
              }
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)" }} />
            <Legend
              wrapperStyle={{ fontSize: 13, color: "var(--muted-foreground)" }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              dataKey="compras"
              name="Compras"
              fill="var(--chart-series-blue)"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
            <Bar
              dataKey="vendas"
              name="Vendas"
              fill="var(--primary)"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
