"use client";

import { usePathname } from "next/navigation";
import { Menu, LogOut, Search, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { SyncStatusIndicator } from "@/components/shared/sync-status-indicator";
import { useAuth } from "@/lib/auth/auth-context";
import { getPageTitle } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMenuClick: () => void;
  className?: string;
}

export function Header({ onMenuClick, className }: HeaderProps) {
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const pageTitle = getPageTitle(pathname);

  const displayName = session?.name ?? "User";
  const roleLabel = session?.roleLabel ?? "";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className={cn("sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/80 backdrop-blur-md px-4 sm:px-6", className)}>
      <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={onMenuClick} aria-label="Open navigation menu">
        <Menu className="h-5 w-5" />
      </Button>

      <h2 className="text-base font-semibold text-foreground truncate hidden sm:block tracking-tight">
        {pageTitle}
      </h2>

      <div className="hidden md:flex items-center flex-1 max-w-xs ml-4">
        <div className="relative w-full group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <div className="h-9 w-full rounded-lg border border-border bg-muted/50 pl-9 pr-12 flex items-center cursor-default transition-colors group-hover:bg-muted group-hover:border-input/80">
            <span className="text-sm text-muted-foreground">Search medicines, batches...</span>
          </div>
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden items-center gap-0.5 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:flex">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </div>
      </div>

      <div className="flex-1 md:hidden" />

      <div className="flex items-center gap-3 shrink-0">
        <SyncStatusIndicator />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" aria-label="User menu">
              <Avatar className="h-9 w-9 border border-border">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                {roleLabel && (
                  <Badge variant="secondary" className="w-fit text-[10px] px-1.5 py-0 mt-1">
                    {roleLabel}
                  </Badge>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}