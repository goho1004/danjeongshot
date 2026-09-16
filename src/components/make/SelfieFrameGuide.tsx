"use client";

/**
 * 원일 워커 셀카 가이드(원형·정면·어깨·밝기) → 단정 톤으로 이식.
 * 현장 앱 UI 복제 ✗ · 스튜디오(ink/studio) 언어만.
 */
export default function SelfieFrameGuide({
  selfieUrl,
}: {
  selfieUrl: string | null;
}) {
  return (
    <div className="relative mx-auto aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-2xl bg-ink-950/90">
      {selfieUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={selfieUrl}
          alt="업로드 미리보기"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-ink-800 to-ink-950" />
      )}
      {/* 얼굴 타원 가이드 — 원일 face-guide 계약 */}
      <div
        className="pointer-events-none absolute left-1/2 top-[18%] h-[46%] w-[62%] -translate-x-1/2 rounded-[50%] border-2 border-studio-soft/90 shadow-[0_0_0_9999px_rgba(10,14,20,0.45)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/90 via-ink-950/40 to-transparent px-3 pb-3 pt-10 text-center">
        <p className="text-[13px] font-semibold text-white">
          {selfieUrl ? "구도 확인 · 원 안에 얼굴" : "얼굴을 원 안에 맞춰 주세요"}
        </p>
        <p className="mt-0.5 text-[11px] text-white/65">
          정면 · 어깨까지 · 밝게
        </p>
      </div>
    </div>
  );
}
