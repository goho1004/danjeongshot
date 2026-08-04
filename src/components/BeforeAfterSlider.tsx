"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt?: string;
  afterAlt?: string;
  className?: string;
  aspectClass?: string;
  initial?: number;
  /** 자동 왕복. 터치·드래그·키 입력 시 유저 조작으로 전환 */
  autoPlay?: boolean;
};

/** Landing / gallery Before–After. Auto CSS sweep until user takes over. */
export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt = "전 · 셀카",
  afterAlt = "후 · 단정",
  className = "",
  aspectClass = "aspect-[3/4]",
  initial = 48,
  autoPlay = true,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(initial);
  const [userControl, setUserControl] = useState(false);
  const [inView, setInView] = useState(false);
  const [frameW, setFrameW] = useState(0);
  const dragging = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplit(Math.max(5, Math.min(95, pct)));
  }, []);

  const takeControl = useCallback(() => {
    setUserControl(true);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const syncW = () => setFrameW(el.clientWidth);
    syncW();

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(syncW)
        : null;
    ro?.observe(el);

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return () => ro?.disconnect();
    }
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "120px 0px", threshold: 0.02 }
    );
    io.observe(el);
    return () => {
      ro?.disconnect();
      io.disconnect();
    };
  }, []);

  const sweeping = autoPlay && !userControl && inView;

  const hint = userControl
    ? "← 드래그해서 비교 →"
    : autoPlay
      ? "자동 비교 · 터치하면 직접"
      : "← 드래그해서 비교 →";

  return (
    <div className={className}>
      <div
        ref={rootRef}
        role="slider"
        tabIndex={0}
        aria-valuemin={5}
        aria-valuemax={95}
        aria-valuenow={Math.round(split)}
        aria-label="전후 비교 슬라이더"
        className={`relative ${aspectClass} w-full cursor-ew-resize select-none overflow-hidden rounded-2xl bg-ink-100 shadow-lift ring-1 ring-ink-100 touch-none`}
        onPointerDown={(e) => {
          takeControl();
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
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            takeControl();
            setSplit((s) =>
              e.key === "ArrowLeft" ? Math.max(5, s - 4) : Math.min(95, s + 4)
            );
          }
        }}
      >
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

        <div
          className={`pointer-events-none absolute inset-y-0 left-0 z-[2] overflow-hidden ${
            sweeping ? "ba-sweep" : ""
          }`}
          style={sweeping ? undefined : { width: `${split}%` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={beforeSrc}
            alt={beforeAlt}
            className="pointer-events-none absolute inset-y-0 left-0 h-full max-w-none object-cover"
            style={{ width: frameW > 0 ? frameW : "100vw" }}
            draggable={false}
          />
        </div>
        <span
          className="pointer-events-none absolute bottom-3 left-3 z-[2] rounded-md bg-black/55 px-2 py-1 text-[10px] font-semibold tracking-wide text-white"
          style={{ opacity: sweeping || split > 12 ? 1 : 0 }}
        >
          BEFORE
        </span>

        <div
          className={`pointer-events-none absolute inset-y-0 z-[3] w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.12)] ${
            sweeping ? "ba-sweep-handle" : ""
          }`}
          style={sweeping ? undefined : { left: `${split}%` }}
        />
        <div
          className={`pointer-events-none absolute top-1/2 z-[4] flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ink-950 bg-white shadow-soft ${
            sweeping ? "ba-sweep-handle" : ""
          }`}
          style={sweeping ? undefined : { left: `${split}%` }}
          aria-hidden
        >
          <span className="text-[10px] font-bold text-ink-700">⇔</span>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] font-medium text-ink-400">{hint}</p>
    </div>
  );
}
