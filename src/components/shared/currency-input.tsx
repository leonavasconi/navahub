import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const CurrencyInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  function CurrencyInput({ className, ...props }, ref) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
          R$
        </span>
        <Input
          ref={ref}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0,00"
          className={cn("pl-9", className)}
          {...props}
        />
      </div>
    );
  }
);
