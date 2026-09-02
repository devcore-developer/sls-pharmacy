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
  group: "Pharmacy" | "Operations" | "Administration";
}

export const navItems: SecureNavItem[] = [
  { group: "Pharmacy", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { group: "Pharmacy", label: "Medicines", href: "/medicines", icon: Pill, permission: "medicine.view" },
  { group: "Pharmacy", label: "Inventory", href: "/inventory", icon: Package, permission: "inventory.view" },
  { group: "Pharmacy", label: "Stock Movements", href: "/inventory/movements", icon: FileText, permission: "inventory.movements.view" },
  { group: "Pharmacy", label: "Categories", href: "/categories", icon: FolderTree, permission: "medicine.view" },
  
  { group: "Operations", label: "Receive Stock", href: "/inventory/receiving", icon: Download, permission: "inventory.receive" },
  { group: "Operations", label: "Cartons", href: "/inventory/cartons", icon: Box, permission: "carton.view" },
  { group: "Operations", label: "Convoys", href: "/convoys", icon: Truck, permission: "convoy.view" },
  { group: "Operations", label: "Reports", href: "/reports", icon: BarChart3, permission: "reports.view" },
  
  { group: "Administration", label: "Settings", href: "/settings", icon: Settings, permission: "settings.view" },
  { group: "Administration", label: "Users", href: "/settings/users", icon: Users, permission: "users.view" },
  { group: "Administration", label: "Roles", href: "/settings/roles", icon: Shield, permission: "roles.view" },
  { group: "Administration", label: "Audit Log", href: "/settings/audit", icon: ScrollText, permission: "users.view" },
];

export function getVisibleNavItems(permissions: string[], isAdmin = false): SecureNavItem[] {
  if (isAdmin) return navItems;
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