"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { SegmentedControl } from "./SegmentedControl";

const SEGMENTS = [
  { value: "light", label: <Sun className="h-3.5 w-3.5" />, title: "Light" },
  { value: "dark", label: <Moon className="h-3.5 w-3.5" />, title: "Dark" },
  { value: "system", label: <Monitor className="h-3.5 w-3.5" />, title: "System" },
] as const;

export function ThemeToggle({ id = "theme" }: { id?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const value = (mounted ? (theme ?? "system") : "system") as "light" | "dark" | "system";
  return <SegmentedControl id={id} ariaLabel="Theme" size="sm" segments={SEGMENTS} value={value} onChange={setTheme} />;
}
