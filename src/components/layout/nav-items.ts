import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Wallet,
  FileBarChart,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Compras", href: "/compras", icon: ShoppingCart },
  { title: "Estoque", href: "/estoque", icon: Package },
  { title: "Vendas", href: "/vendas", icon: Receipt },
  { title: "Financeiro", href: "/financeiro", icon: Wallet },
  { title: "Relatórios", href: "/relatorios", icon: FileBarChart },
  { title: "Configurações", href: "/configuracoes", icon: Settings },
];
