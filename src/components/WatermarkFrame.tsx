"use client";

/** UI 힌트 + CSS 패턴. 실제 방어는 서버 번인 워터마크 + 클린본 미전송. */
export default function WatermarkFrame({
  src,
  locked,
}: {
  src: string;
  locked: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={locked ? "미리보기" : "결과"}
        className={`aspect-[3/4] w-full object-cover select-none ${locked ? "pointer-events-none" : ""}`}
        draggable={false}
        onContextMenu={locked ? (e) => e.preventDefault() : undefined}
      />
      {locked && (
        <>
          {/* CSS 반복 워터마크 — 서버 번인 보조 */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-24deg, transparent, transparent 48px, rgba(15,74,63,0.35) 48px, rgba(15,74,63,0.35) 49px)",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 flex flex-wrap content-start gap-8 overflow-hidden p-4 opacity-[0.12]"
            aria-hidden
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className="rotate-[-18deg] text-[10px] font-semibold tracking-wide text-accent-deep"
              >
                단정 PREVIEW
              </span>
            ))}
          </div>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink-950/25 to-transparent px-3 py-2.5">
            <p className="text-center text-[10px] font-medium text-white/80">
              미리보기 · 클린 저장은 결제 후 다운로드
            </p>
          </div>
        </>
      )}
    </div>
  );
}
