/** Smooth scroll for regen / result UX (client-only). */
export function smoothScrollToRegenTarget(phase: "start" | "after") {
  if (typeof window === "undefined") return;

  if (phase === "after") {
    const shots = document.getElementById("djs-result-shots");
    if (shots) {
      shots.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
  }

  const hero = document.getElementById("djs-result-hero");
  if (hero) {
    hero.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function scheduleSmoothScrollAfterRegen() {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    window.setTimeout(() => smoothScrollToRegenTarget("after"), 80);
  });
}
