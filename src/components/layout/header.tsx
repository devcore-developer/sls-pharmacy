"use client";

import { usePathname } from "next/navigation";
import { Menu, LogOut, Search } from "lucide-react";
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
    <header className={cn("flex h-16 items-center gap-4 border-b bg-card px-4 sm:px-6", className)}>
      <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={onMenuClick} aria-label="Open navigation menu">
        <Menu className="h-5 w-5" />
      </Button>

      <h2 className="text-base font-semibold text-foreground truncate hidden sm:block">
        {pageTitle}
      </h2>

      <div className="hidden md:flex items-center flex-1 max-w-xs ml-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <div className="h-9 w-full rounded-md border border-input bg-muted/50 pl-9 pr-3 flex items-center cursor-default">
            <span className="text-sm text-muted-foreground">Search medicines, batches...</span>
          </div>
        </div>
      </div>

      <div className="flex-1 md:hidden" />

      <div className="flex items-center gap-3 shrink-0">
        <SyncStatusIndicator />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 focus-visible:ring-2 focus-visible:ring-ring" aria-label="User menu">
              <Avatar className="h-9 w-9">
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
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}