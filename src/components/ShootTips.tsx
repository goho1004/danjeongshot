"use client";

import { SHOOT_TIPS } from "@/lib/purposes";

export default function ShootTips({
  compact = false,
  id = "shoot-tips",
}: {
  compact?: boolean;
  id?: string;
}) {
  if (compact) {
    return (
      <div id={id} className="rounded-xl border border-ink-100 bg-white/80 p-3 text-xs text-ink-600">
        <p className="font-semibold text-ink-800">잘 나오는 팁</p>
        <ul className="mt-1.5 space-y-0.5 text-ink-500">
          <li>· 밝게 · 정면 · 얼굴 크게 · 필터 OFF</li>
          <li>· 다시 뽑을 땐 더 밝은 다른 셀카가 유리</li>
        </ul>
      </div>
    );
  }

  return (
    <section id={id} className="rounded-2xl border border-ink-100 bg-white/80 p-5">
      <h2 className="text-sm font-semibold text-ink-900">어떻게 찍어야 잘 나오나요?</h2>
      <p className="mt-1 text-xs text-ink-500">
        결과는 모델보다 <strong className="text-ink-700">올리는 셀카</strong>에 더 좌우됩니다.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {SHOOT_TIPS.map((tip) => (
          <li key={tip.title} className="rounded-xl border border-ink-50 bg-paper/60 p-3">
            <p className="text-xs font-semibold text-accent-deep">{tip.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-600">{tip.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
