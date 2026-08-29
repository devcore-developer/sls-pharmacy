"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { RequirePermission } from "@/components/shared/require-permission";
import { Users, Shield, ScrollText, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const settingCards = [
  {
    href: "/settings/users",
    label: "User Management",
    description: "Create, edit, and deactivate user accounts.",
    icon: Users,
    permissions: ["users.view"] as const,
  },
  {
    href: "/settings/roles",
    label: "Roles & Permissions",
    description: "View system roles and manage permission assignments.",
    icon: Shield,
    permissions: ["roles.view"] as const,
  },
  {
    href: "/settings/audit",
    label: "Audit Log",
    description: "View immutable history of system actions.",
    icon: ScrollText,
    permissions: ["users.view"] as const,
  },
];

export default function SettingsPage() {
  const { hasAnyPermission } = useAuth();

  const visibleCards = settingCards.filter((c) =>
    hasAnyPermission([...c.permissions])
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure system preferences, user management, and application settings."
      />

      {visibleCards.length === 0 ? (
        <RequirePermission permissions={["settings.view"]}>
          <p className="text-sm text-muted-foreground">No settings available for your role.</p>
        </RequirePermission>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={card.href}>
                <Card className="h-full hover:border-primary/40 transition-colors cursor-pointer group">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {card.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {card.description}
                      </p>
                      <div className="flex items-center gap-1 mt-3 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Open <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}