import {
  LayoutDashboard,
  Pill,
  Package,
  Box,
  FolderTree,
  Truck,
  FileText,
  Download,
  BarChart3,
  Settings,
  Users,
  Shield,
  ScrollText,
} from "lucide-react";
import type { NavItem } from "@/types";

interface SecureNavItem extends NavItem {
  permission?: string;
}

export const navItems: SecureNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { label: "Medicines", href: "/medicines", icon: Pill, permission: "medicine.view" },
  { label: "Inventory", href: "/inventory", icon: Package, permission: "inventory.view" },
  { label: "Stock Movements", href: "/inventory/movements", icon: FileText, permission: "inventory.movements.view" },
  { label: "Receive Stock", href: "/inventory/receiving", icon: Download, permission: "inventory.receive" },
  { label: "Cartons", href: "/inventory/cartons", icon: Box, permission: "carton.view" },
  { label: "Categories", href: "/categories", icon: FolderTree, permission: "medicine.view" },
  { label: "Convoys", href: "/convoys", icon: Truck, permission: "convoy.view" },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "reports.view" },
  { label: "Settings", href: "/settings", icon: Settings, permission: "settings.view" },
  { label: "Users", href: "/settings/users", icon: Users, permission: "users.view" },
  { label: "Roles", href: "/settings/roles", icon: Shield, permission: "roles.view" },
  { label: "Audit Log", href: "/settings/audit", icon: ScrollText, permission: "users.view" },
];

export function getVisibleNavItems(permissions: string[]): SecureNavItem[] {
  return navItems.filter((item) => {
    if (!item.permission) return true;
    return permissions.includes(item.permission);
  });
}

export function getPageTitle(pathname: string): string {
  const match = navItems.find(
    (item) =>
      item.href === pathname ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href))
  );
  return match?.label ?? "SLS Pharmacy";
}