"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { createCategory } from "@/lib/actions/categories";

type Category = { id: string; name: string };

export function CategoryCombobox({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string | undefined;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(categories);
  const [isPending, startTransition] = useTransition();

  const selected = items.find((c) => c.id === value);
  const trimmedQuery = query.trim();

  const filtered = useMemo(() => {
    if (!trimmedQuery) return items;
    return items.filter((c) => c.name.toLowerCase().includes(trimmedQuery.toLowerCase()));
  }, [items, trimmedQuery]);

  const exactMatch = items.some((c) => c.name.toLowerCase() === trimmedQuery.toLowerCase());

  function handleCreate() {
    if (!trimmedQuery) return;
    startTransition(async () => {
      const result = await createCategory(trimmedQuery);
      if (result.success) {
        setItems((prev) =>
          [...prev, result.category].sort((a, b) => a.name.localeCompare(b.name))
        );
        onChange(result.category.id);
        setOpen(false);
        setQuery("");
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? selected.name : "Selecione uma categoria"}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar categoria..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {filtered.length === 0 && !trimmedQuery && (
              <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
            )}
            <CommandGroup>
              {filtered.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.id}
                  onSelect={() => {
                    onChange(category.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === category.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {category.name}
                </CommandItem>
              ))}
              {trimmedQuery && !exactMatch && (
                <CommandItem value="__create__" onSelect={handleCreate} disabled={isPending}>
                  <Plus className="mr-2 size-4" />
                  Criar categoria &quot;{trimmedQuery}&quot;
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
