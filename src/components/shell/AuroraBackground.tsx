/**
 * Slow aurora mesh behind the dark theme. Pure CSS: three blurred blobs that
 * drift on a 28s loop. Always mounted; invisible in light mode so theme
 * switches never remount anything (no hydration or flash issues).
 */
export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-0 transition-opacity duration-700 dark:opacity-100">
      <div className="absolute -top-1/4 -left-1/4 h-[80vmax] w-[80vmax] rounded-full bg-[radial-gradient(closest-side,var(--aurora-1),transparent)] opacity-40 blur-3xl animate-aurora motion-reduce:[animation:none]" />
      <div className="absolute top-1/3 -right-1/4 h-[70vmax] w-[70vmax] rounded-full bg-[radial-gradient(closest-side,var(--aurora-2),transparent)] opacity-30 blur-3xl animate-aurora [animation-delay:-9s] [animation-direction:alternate-reverse] motion-reduce:[animation:none]" />
      <div className="absolute -bottom-1/3 left-1/4 h-[70vmax] w-[70vmax] rounded-full bg-[radial-gradient(closest-side,var(--aurora-3),transparent)] opacity-25 blur-3xl animate-aurora [animation-delay:-18s] motion-reduce:[animation:none]" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.35%22/></svg>')] opacity-[0.07] mix-blend-overlay" />
    </div>
  );
}
