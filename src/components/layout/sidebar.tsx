"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getVisibleNavItems } from "@/lib/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  onNavigate?: () => void;
  className?: string;
}

export function Sidebar({ onNavigate, className }: SidebarProps) {
  const pathname = usePathname();
  const { session } = useAuth();

  const isAdmin = session?.roleName === "ADMIN";
  const items = getVisibleNavItems(session?.permissions ?? [], isAdmin);

  // Group items by their group property
  const groupedItems = items.reduce((acc, item) => {
    (acc[item.group] = acc[item.group] || []).push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  return (
    <aside className={cn("flex h-full flex-col border-r border-border bg-card", className)}>
      <div className="flex h-16 items-center gap-3 px-5 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shrink-0 shadow-sm">
          SLS
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-foreground leading-tight truncate tracking-tight">SLS Pharmacy</span>
          <span className="text-[11px] text-muted-foreground leading-tight">Charity Management</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin" aria-label="Main navigation">
        <ul className="space-y-1" role="list">
          {Object.entries(groupedItems).map(([groupName, groupItems]) => (
            <li key={groupName} className="mb-4">
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {groupName}
              </p>
              <ul className="space-y-0.5">
                {groupItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  const IconComponent = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:translate-x-0.5"
                        )}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <IconComponent className={cn("h-[18px] w-[18px] shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground/80")} strokeWidth={isActive ? 2 : 1.5} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      <Separator />

      <div className="px-5 py-4">
        <p className="text-[11px] text-muted-foreground/70">Version 1.0.0 · Phase 10</p>
      </div>
    </aside>
  );
}