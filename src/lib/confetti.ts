/** Celebration burst for the rare good moments (offer accepted). Skips under reduced motion. */
export async function fireConfetti() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const { default: confetti } = await import("canvas-confetti");
  const colors = ["#0A84FF", "#64D2FF", "#BF5AF2", "#FF375F", "#30D158", "#FFD60A"];
  confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, colors, scalar: 1.05 });
  setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.8 }, colors }), 180);
  setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.8 }, colors }), 300);
}
