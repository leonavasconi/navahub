"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { createCategory, deleteCategory, updateCategory } from "@/lib/actions/categories";
import { toast } from "sonner";

type Category = { id: string; name: string };

export function CategoriesManager({ categories }: { categories: Category[] }) {
  const [items, setItems] = useState(categories);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await createCategory(name);
      if (result.success) {
        setItems((prev) => [...prev, result.category].sort((a, b) => a.name.localeCompare(b.name)));
        setNewName("");
      } else {
        toast.error(result.error);
      }
    });
  }

  function startEditing(category: Category) {
    setEditingId(category.id);
    setEditingName(category.name);
  }

  function handleUpdate(id: string) {
    const name = editingName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await updateCategory(id, name);
      if (result.success) {
        setItems((prev) =>
          prev
            .map((c) => (c.id === id ? { id, name: result.category.name } : c))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setEditingId(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  async function handleDelete(id: string) {
    const result = await deleteCategory(id);
    if (result.success) {
      setItems((prev) => prev.filter((c) => c.id !== id));
      return true;
    }
    toast.error(result.error);
    return false;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          placeholder="Nova categoria..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreate();
            }
          }}
        />
        <Button type="button" onClick={handleCreate} disabled={isPending || !newName.trim()}>
          <Plus />
          Adicionar
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        {items.map((category) => (
          <div
            key={category.id}
            className="flex items-center gap-2 rounded-lg border px-3 py-2"
          >
            {editingId === category.id ? (
              <>
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleUpdate(category.id);
                    }
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                  className="h-8"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleUpdate(category.id)}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="animate-spin" /> : <Check className="size-4" />}
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditingId(null)}>
                  <X className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{category.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => startEditing(category)}
                >
                  <Pencil className="size-4" />
                </Button>
                <ConfirmDeleteDialog
                  trigger={
                    <Button type="button" variant="ghost" size="icon-sm">
                      <Trash2 className="size-4" />
                    </Button>
                  }
                  description="Categorias com produtos cadastrados não podem ser excluídas."
                  onConfirm={() => handleDelete(category.id)}
                />
              </>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhuma categoria cadastrada.
          </p>
        )}
      </div>
    </div>
  );
}
