"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PERIOD_LABELS, PERIOD_OPTIONS, type Period } from "@/lib/financial";

export function PeriodSelector({
  period,
  from,
  to,
}: {
  period: Period;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(patch: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={period} onValueChange={(v) => updateParams({ period: v })}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((p) => (
            <SelectItem key={p} value={p}>
              {PERIOD_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {period === "custom" && (
        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={from}
            onChange={(e) => updateParams({ period: "custom", from: e.target.value })}
            className="w-[150px]"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => updateParams({ period: "custom", to: e.target.value })}
            className="w-[150px]"
          />
        </div>
      )}
    </div>
  );
}
