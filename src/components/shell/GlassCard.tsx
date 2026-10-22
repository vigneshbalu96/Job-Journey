import { cn } from "@/lib/utils";

/**
 * Surface for page content. "glass" blurs what is behind it (use on chrome and
 * small cards); "solid" is the cheap variant for long lists and kanban columns.
 */
export function GlassCard({
  variant = "solid",
  className,
  ...props
}: React.ComponentProps<"div"> & { variant?: "glass" | "solid" }) {
  return (
    <div
      className={cn(
        "rounded-card border shadow-card",
        variant === "glass" ? "glass" : "bg-card border-glass-border",
        className,
      )}
      {...props}
    />
  );
}
