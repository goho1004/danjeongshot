/** Smooth scroll for regen / result UX (client-only). */
export function smoothScrollToRegenTarget(phase: "start" | "after") {
  if (typeof window === "undefined") return;

  // 생성·컷 화면(Preview) 우선 — 받기 패널(hero)보다 위
  const shots = document.getElementById("djs-result-shots");
  if (shots) {
    shots.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (phase === "start") {
    const hero = document.getElementById("djs-result-hero");
    if (hero) {
      hero.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function scheduleSmoothScrollAfterRegen() {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    window.setTimeout(() => smoothScrollToRegenTarget("after"), 80);
  });
}
