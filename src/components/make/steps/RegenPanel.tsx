import type { ChangeEvent, RefObject } from "react";
import Link from "next/link";
import InlineError from "@/components/make/InlineError";
import ExtraPromptFields from "@/components/make/ExtraPromptFields";
import type { BusyKind } from "@/lib/make/types";
import type { SubjectLookId } from "@/lib/purposes";

type RegenPanelProps = {
  busyKind: BusyKind;
  redoUsed: number;
  asvUsed: number;
  /** 다운로드(받기) 완료 후면 재생성 잠금 */
  downloaded?: boolean;
  regenSelfie: string | null;
  setRegenSelfie: (v: string | null) => void;
  regenInputRef: RefObject<HTMLInputElement | null>;
  onRegenFile: (e: ChangeEvent<HTMLInputElement>) => void;
  runPaidRegen: (stage: "redo" | "asv") => void;
  error: string | null;
  errorAt: string | null;
  subjectLook: SubjectLookId;
  extraPresetIds: string[];
  toggleExtraPreset: (id: string) => void;
  extraCustom: string;
  setExtraCustom: (v: string) => void;
};

export default function RegenPanel({
  busyKind,
  redoUsed,
  asvUsed,
  downloaded = false,
  regenSelfie,
  setRegenSelfie,
  regenInputRef,
  onRegenFile,
  runPaidRegen,
  error,
  errorAt,
  subjectLook,
  extraPresetIds,
  toggleExtraPreset,
  extraCustom,
  setExtraCustom,
}: RegenPanelProps) {
  if (downloaded) {
    return (
      <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs leading-relaxed text-ink-600">
        이미 사진을 받으셨어요. 다시 만들기·한 번 더는{" "}
        <strong className="font-semibold text-ink-800">받기 전</strong>에만 쓸 수 있어요.
      </p>
    );
  }

  return (
    <>
      {(redoUsed < 1 || (redoUsed >= 1 && asvUsed < 1)) && (
        <div className="rounded-xl border border-ink-100 bg-white/90 p-3">
          <p className="text-xs font-semibold text-ink-700">다시 뽑을 때 · 원본 셀카</p>
          <p className="mt-0.5 text-[11px] text-ink-500">
            기본은 처음 올린 사진입니다. 더 밝은 정면 셀카로 바꾸면 결과가 나아지는 경우가 많아요.{" "}
            <a href="#shoot-tips-full" className="underline">
              팁 보기
            </a>
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => regenInputRef.current?.click()}
              disabled={!!busyKind}
              className="rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-800 disabled:opacity-50"
            >
              다른 사진 올리기
            </button>
            {regenSelfie ? (
              <button
                type="button"
                onClick={() => setRegenSelfie(null)}
                disabled={!!busyKind}
                className="text-[11px] text-ink-500 underline disabled:opacity-50"
              >
                처음 사진으로
              </button>
            ) : (
              <span className="text-[11px] text-ink-400">처음 사진 사용 중</span>
            )}
          </div>
          <InlineError at="regenFile" errorAt={errorAt} message={error} />
          {regenSelfie && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={regenSelfie}
              alt="재생성용 셀카"
              className="mt-3 max-h-28 rounded-lg object-contain"
            />
          )}
          <input
            ref={regenInputRef as RefObject<HTMLInputElement>}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onRegenFile}
          />
        </div>
      )}

      {redoUsed < 1 && (
        <div>
          <button
            type="button"
            onClick={() => runPaidRegen("redo")}
            disabled={!!busyKind}
            className="w-full rounded-xl border border-ink-200 bg-white py-3 text-sm font-semibold text-ink-800 disabled:opacity-50"
          >
            {busyKind === "redo"
              ? "다시 만드는 중…"
              : regenSelfie
                ? "새 사진으로 · 다시 만들어 볼게요"
                : "마음에 안 들어요 · 다시 만들어 볼게요"}
          </button>
          <InlineError at="redo" errorAt={errorAt} message={error} />
          <ExtraPromptFields
            compact
            subjectLook={subjectLook}
            extraPresetIds={extraPresetIds}
            toggleExtraPreset={toggleExtraPreset}
            extraCustom={extraCustom}
            setExtraCustom={setExtraCustom}
          />
        </div>
      )}

      {redoUsed >= 1 && asvUsed < 1 && (
        <div>
          <button
            type="button"
            onClick={() => runPaidRegen("asv")}
            disabled={!!busyKind}
            className="w-full rounded-xl border border-dashed border-accent/40 bg-white py-3 text-sm font-semibold text-accent-deep disabled:opacity-50"
          >
            {busyKind === "asv"
              ? "한 번 더 만드는 중…"
              : regenSelfie
                ? "새 사진으로 · 한 번 더 봐 주세요"
                : "그래도 아쉬워요 · 한 번 더 봐 주세요"}
          </button>
          <InlineError at="asv" errorAt={errorAt} message={error} />
          <ExtraPromptFields
            compact
            subjectLook={subjectLook}
            extraPresetIds={extraPresetIds}
            toggleExtraPreset={toggleExtraPreset}
            extraCustom={extraCustom}
            setExtraCustom={setExtraCustom}
          />
        </div>
      )}

      {redoUsed >= 1 && asvUsed >= 1 && (
        <p className="rounded-lg bg-white/80 px-3 py-2 text-xs leading-relaxed text-ink-600">
          다시 만들기와 추가 서비스를 모두 쓰셨어요. 남은 컷 중 가장 나은 장을 받아 가 주세요.
          다운로드한 뒤에는 환불이 어렵습니다.{" "}
          <Link href="/help" className="underline" prefetch={false}>
            도움이 필요하면
          </Link>
        </p>
      )}
    </>
  );
}
