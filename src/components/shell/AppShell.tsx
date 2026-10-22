"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, motion } from "motion/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { AuroraBackground } from "./AuroraBackground";
import { BottomTabBar } from "./BottomTabBar";
import { BRAND, NAV, PRIMARY_TABS } from "./nav";
import { ThemeToggle } from "./ThemeToggle";

// Server-gated shell: (app)/layout.tsx already called requireUser(), and
// middleware.ts redirects anonymous requests, so this component only renders
// chrome. SidebarBody mounts twice (desktop aside + "More" sheet), so each
// copy gets its own LayoutGroup and the active pill never flies between them.

type ShellUser = { email: string; name: string | null };

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => setMoreOpen(false), [pathname]);

  const primaryActive = PRIMARY_TABS.some((t) => pathname === t.href || pathname.startsWith(t.href + "/"));

  return (
    <div className="min-h-dvh lg:flex">
      <AuroraBackground />

      <aside className="glass sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r lg:flex">
        <SidebarBody user={user} pathname={pathname} group="aside" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 flex h-13 items-center gap-2.5 border-b px-4 lg:hidden">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BRAND.icon className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold">{BRAND.title}</span>
        </header>

        <main className="min-w-0 flex-1 p-4 pb-28 sm:p-6 lg:p-10 lg:pb-10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      <BottomTabBar onMore={() => setMoreOpen(true)} moreActive={moreOpen || !primaryActive} />

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-sheet p-0 pb-[env(safe-area-inset-bottom)]">
          <SheetTitle className="sr-only">{BRAND.title} navigation</SheetTitle>
          <SidebarBody user={user} pathname={pathname} group="sheet" onNavigate={() => setMoreOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SidebarBody({
  user,
  pathname,
  group,
  onNavigate,
}: {
  user: ShellUser;
  pathname: string;
  group: string;
  onNavigate?: () => void;
}) {
  const BrandIcon = BRAND.icon;
  return (
    <>
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card">
          <BrandIcon className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-[15px] font-semibold leading-tight">{BRAND.title}</p>
          <p className="text-[11px] leading-tight text-muted-foreground">{BRAND.subtitle}</p>
        </div>
      </div>

      <LayoutGroup id={`nav-${group}`}>
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors",
                  active ? "text-primary-foreground" : "text-foreground-secondary hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId={`nav-${group}-pill`}
                    transition={springs.snappy}
                    className="absolute inset-0 rounded-xl bg-primary shadow-[0_6px_16px_-6px_var(--accent-500)]"
                  />
                )}
                <Icon className="relative z-10 h-4 w-4 shrink-0" />
                <span className="relative z-10">{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </LayoutGroup>

      <div className="space-y-2 border-t border-glass-border px-3 py-4">
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="min-w-0 truncate text-xs text-muted-foreground" title={user.email}>
            {user.name ?? user.email}
          </p>
          <ThemeToggle id={`theme-${group}`} />
        </div>
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="ghost" size="sm" className="w-full justify-start gap-2">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </form>
      </div>
    </>
  );
}
