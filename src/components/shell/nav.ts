import {
  Briefcase,
  Building2,
  CalendarCheck,
  Compass,
  FileText,
  HelpCircle,
  Link2,
  Map,
  Settings,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { title: string; href: string; icon: LucideIcon };

export const NAV: readonly NavItem[] = [
  { title: "Today", href: "/today", icon: CalendarCheck },
  { title: "Pipeline", href: "/pipeline", icon: Briefcase },
  { title: "Companies", href: "/companies", icon: Building2 },
  { title: "Contacts", href: "/contacts", icon: Users },
  { title: "Questions", href: "/questions", icon: HelpCircle },
  { title: "Documents", href: "/documents", icon: FileText },
  { title: "Offers", href: "/offers", icon: Trophy },
  { title: "Journey", href: "/journey", icon: Map },
  { title: "Clip a job", href: "/clip", icon: Link2 },
  { title: "Settings", href: "/settings", icon: Settings },
];

export const BRAND = { icon: Compass, title: "Job Journey", subtitle: "search command centre" };

/** The five slots of the mobile tab bar; everything else lives behind "More". */
export const PRIMARY_TABS: readonly NavItem[] = NAV.filter((n) => ["/today", "/pipeline", "/companies", "/contacts"].includes(n.href));
