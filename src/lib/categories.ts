export const DEFAULT_CATEGORIES = [
  "PlayStation",
  "Xbox",
  "Nintendo",
  "iPhone",
  "Smartphone",
  "MacBook",
  "Notebook",
  "Tablet",
  "Acessórios",
  "Outros",
];

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
