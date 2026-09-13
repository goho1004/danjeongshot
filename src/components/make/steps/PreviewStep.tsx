import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import WatermarkFrame from "@/components/WatermarkFrame";
import type { Shot } from "@/lib/make/types";
import { EASTER_UPSELL } from "@/lib/easterEgg";
import { smoothScrollToRegenTarget } from "@/lib/smoothScroll";

type PreviewStepProps = {
  shots: Shot[];
  selectedShotId: string | null;
  setSelectedShotId: (id: string) => void;
  setPreviewVault: (vault: string | null) => void;
  mock: boolean;
  /** 업로드 셀카 data URL — B/A 전 */
  selfie: string | null;
};

export default function PreviewStep({
  shots,
  selectedShotId,
  setSelectedShotId,
  setPreviewVault,
  mock,
  selfie,
}: PreviewStepProps) {
  const hasEaster = shots.some((s) => s.easter);
  const selected =
    shots.find((s) => s.id === selectedShotId) ?? shots[0] ?? null;
  /** 비교용: 클린이 있으면 클린, 없으면 미리보기 URL */
  const afterSrc = selected
    ? selected.imageUrlClean || selected.imageUrl
    : null;
  const canCompare = Boolean(selfie && afterSrc);
  const multi = shots.length > 1;

  return (
    <div id="djs-result-shots" className="scroll-mt-4">
      <h2 className="text-sm font-semibold text-ink-700">5. 컷 고르기</h2>
      <p className="mt-1 text-xs text-ink-500">
        {multi
          ? `${shots.length}장을 만들었습니다. 받을 컷을 고른 뒤 아래에서 「사진에 저장」하세요`
          : "만든 컷입니다. 아래에서 「사진에 저장」하세요"}
        {mock ? " · MOCK" : ""}
      </p>
      {hasEaster && (
        <p className="mt-2 text-[10px] text-ink-400">{EASTER_UPSELL}</p>
      )}

      {canCompare && selfie && afterSrc && (
        <div className="mx-auto mt-5 max-w-md">
          <p className="mb-2 text-center text-[11px] font-semibold tracking-wide text-studio">
            전 · 후 비교 · 드래그
          </p>
          <BeforeAfterSlider
            key={`${selected?.id || "shot"}-ba`}
            beforeSrc={selfie}
            afterSrc={afterSrc}
            beforeAlt="업로드한 셀카"
            afterAlt={selected?.label ? `${selected.label} · 단정` : "단정 결과"}
            aspectClass="aspect-[3/4]"
            autoPlay={false}
          />
        </div>
      )}

      <div
        className={`mt-4 grid gap-3 ${
          multi ? "sm:grid-cols-2 lg:grid-cols-3" : "mx-auto max-w-sm"
        }`}
      >
        {shots.map((shot) => {
          const active = selectedShotId === shot.id;
          return (
            <button
              key={shot.id}
              type="button"
              onClick={() => {
                setSelectedShotId(shot.id);
                if (shot.vault) setPreviewVault(shot.vault);
              }}
              className={`relative text-left ${
                active ? "rounded-xl ring-2 ring-accent/40" : ""
              }`}
            >
              {active && (
                <span className="absolute right-2 top-2 z-10 rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  선택
                </span>
              )}
              {shot.easter && (
                <span className="absolute left-2 top-2 z-10 rounded bg-ink-800/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  희소
                </span>
              )}
              <WatermarkFrame src={shot.imageUrl} locked={false} />
              <p className="mt-1.5 px-1 text-xs font-medium text-ink-700">
                {shot.label}
                {shot.easter ? " · 제출 비권장" : ""}
              </p>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          const hero = document.getElementById("djs-result-hero");
          if (hero) hero.scrollIntoView({ behavior: "smooth", block: "start" });
          else smoothScrollToRegenTarget("start");
        }}
        className="mt-4 w-full rounded-xl bg-ink-950 py-3 text-sm font-semibold text-white sm:mx-auto sm:block sm:w-auto sm:px-8"
      >
        다음: 저장 ↓
      </button>
    </div>
  );
}
