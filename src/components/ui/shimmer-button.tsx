import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Primary button with a slow light sweep; for the one CTA on a page. */
export function ShimmerButton({ className, children, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button className={cn("relative overflow-hidden", className)} {...props}>
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-shimmer motion-reduce:hidden" />
      <span className="relative z-10 inline-flex items-center gap-1.5">{children}</span>
    </Button>
  );
}
