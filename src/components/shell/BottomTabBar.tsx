"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, motion } from "motion/react";
import { Ellipsis } from "lucide-react";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { PRIMARY_TABS } from "./nav";

/** iOS-style tab bar for phones. Frosted, safe-area aware, with a sliding active pill. */
export function BottomTabBar({ onMore, moreActive }: { onMore: () => void; moreActive: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="glass fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <LayoutGroup id="tabbar">
        <ul className="grid grid-cols-5">
          {PRIMARY_TABS.map((t) => {
            const Icon = t.icon;
            const active = !moreActive && (pathname === t.href || pathname.startsWith(t.href + "/"));
            return (
              <li key={t.href}>
                <Link href={t.href} aria-current={active ? "page" : undefined} className="relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium">
                  {active && <motion.span layoutId="tab-pill" transition={springs.snappy} className="absolute top-1 h-7 w-12 rounded-full bg-accent-50 dark:bg-primary/20" />}
                  <Icon className={cn("relative z-10 h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("relative z-10", active ? "text-primary" : "text-muted-foreground")}>{t.title}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={onMore} aria-label="More" className="relative flex w-full flex-col items-center gap-0.5 py-2 text-[10px] font-medium">
              {moreActive && <motion.span layoutId="tab-pill" transition={springs.snappy} className="absolute top-1 h-7 w-12 rounded-full bg-accent-50 dark:bg-primary/20" />}
              <Ellipsis className={cn("relative z-10 h-5 w-5", moreActive ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("relative z-10", moreActive ? "text-primary" : "text-muted-foreground")}>More</span>
            </button>
          </li>
        </ul>
      </LayoutGroup>
    </nav>
  );
}
