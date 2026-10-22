import { NumberTicker } from "@/components/ui/number-ticker";
import { cn } from "@/lib/utils";

/** Hero number with label; numbers tick up on first paint. */
export function StatTile({
  label,
  value,
  suffix,
  hint,
  tone,
  className,
}: {
  label: string;
  /** Number ticks; a string is shown as-is (e.g. "—"). */
  value: number | string;
  suffix?: string;
  hint?: string;
  tone?: "accent" | "good" | "warn" | "bad";
  className?: string;
}) {
  const toneClass =
    tone === "accent" ? "text-primary" : tone === "good" ? "text-stage-offer-fg" : tone === "warn" ? "text-stage-screening-fg" : tone === "bad" ? "text-destructive" : "";
  return (
    <div className={cn("rounded-card border border-glass-border bg-card px-4 py-3.5 shadow-card", className)}>
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className={cn("mt-1 text-stat tabular", toneClass)}>
        {typeof value === "number" ? <NumberTicker value={value} /> : value}
        {suffix && <span className="ml-0.5 text-base font-semibold text-muted-foreground">{suffix}</span>}
      </p>
      {hint && (
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={hint}>
          {hint}
        </p>
      )}
    </div>
  );
}
