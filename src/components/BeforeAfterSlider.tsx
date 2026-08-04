"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt?: string;
  afterAlt?: string;
  className?: string;
  aspectClass?: string;
  initial?: number;
};

/** Landing / gallery Before–After drag slider (Phase-0 hero evidence). */
export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt = "전 · 셀카",
  afterAlt = "후 · 단정",
  className = "",
  aspectClass = "aspect-[3/4]",
  initial = 48,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(initial);
  const dragging = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplit(Math.max(5, Math.min(95, pct)));
  }, []);

  return (
    <div className={className}>
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-valuemin={5}
        aria-valuemax={95}
        aria-valuenow={Math.round(split)}
        aria-label="전후 비교 슬라이더"
        className={`relative ${aspectClass} w-full cursor-ew-resize select-none overflow-hidden rounded-2xl bg-ink-100 shadow-lift ring-1 ring-ink-100 touch-none`}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          setFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          setFromClientX(e.clientX);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setSplit((s) => Math.max(5, s - 4));
          if (e.key === "ArrowRight") setSplit((s) => Math.min(95, s + 4));
        }}
      >
        {/* After — full frame */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterSrc}
          alt={afterAlt}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
        <span className="pointer-events-none absolute bottom-3 right-3 z-[1] rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold tracking-wide text-studio">
          AFTER · 단정
        </span>

        {/* Before — clipped from the left */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={beforeSrc}
          alt={beforeAlt}
          className="pointer-events-none absolute inset-0 z-[2] h-full w-full object-cover"
          style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
          draggable={false}
        />
        <span
          className="pointer-events-none absolute bottom-3 left-3 z-[2] rounded-md bg-black/55 px-2 py-1 text-[10px] font-semibold tracking-wide text-white"
          style={{ opacity: split > 12 ? 1 : 0 }}
        >
          BEFORE
        </span>

        <div
          className="pointer-events-none absolute inset-y-0 z-[3] w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.12)]"
          style={{ left: `${split}%`, transform: "translateX(-50%)" }}
        />
        <div
          className="pointer-events-none absolute z-[4] flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ink-950 bg-white shadow-soft"
          style={{ left: `${split}%`, top: "50%" }}
          aria-hidden
        >
          <span className="text-[10px] font-bold text-ink-700">⇔</span>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] font-medium text-ink-400">
        ← 드래그해서 비교 →
      </p>
    </div>
  );
}
