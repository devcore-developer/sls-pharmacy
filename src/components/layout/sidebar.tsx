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

  const items = getVisibleNavItems(session?.permissions ?? []);

  // Separate main items from settings sub-items
  const settingsHrefs = ["/settings/users", "/settings/roles", "/settings/audit"];
  const mainItems = items.filter((i) => !settingsHrefs.includes(i.href));
  const settingsItems = items.filter((i) => settingsHrefs.includes(i.href));

  return (
    <aside className={cn("flex h-full flex-col border-r bg-card", className)}>
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shrink-0">
          SLS
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-foreground leading-tight truncate">SLS Pharmacy</span>
          <span className="text-[11px] text-muted-foreground leading-tight">Charity Management</span>
        </div>
      </div>

      <Separator />

      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin" aria-label="Main navigation">
        <ul className="space-y-1" role="list">
          {mainItems.map((item) => {
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
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <IconComponent className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-primary" : "text-muted-foreground/70")} strokeWidth={isActive ? 2 : 1.5} />
                  {item.label}
                </Link>
              </li>
            );
          })}

          {settingsItems.length > 0 && (
            <>
              <li className="pt-4 pb-1">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Administration
                </p>
              </li>
              {settingsItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const IconComponent = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <IconComponent className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-primary" : "text-muted-foreground/70")} strokeWidth={isActive ? 2 : 1.5} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </>
          )}
        </ul>
      </nav>

      <Separator />

      <div className="px-5 py-4">
        <p className="text-[11px] text-muted-foreground">Phase 10 — Users & Permissions</p>
      </div>
    </aside>
  );
}