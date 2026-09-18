import type { ChangeEvent, RefObject } from "react";
import ShootTips from "@/components/ShootTips";
import SelfieCapture from "@/components/make/SelfieCapture";
import InlineError from "@/components/make/InlineError";
import ExtraPromptFields from "@/components/make/ExtraPromptFields";
import {
  PURPOSES,
  SUBJECT_LOOKS,
  SUBJECT_SEASONS,
  type PackId,
  type PurposeId,
  type SubjectLookId,
  type SubjectSeasonId,
} from "@/lib/purposes";

type PurposeUploadStepProps = {
  purposeId: PurposeId;
  setPurposeId: (id: PurposeId) => void;
  setPackId: (id: PackId) => void;
  subjectLook: SubjectLookId;
  setSubjectLook: (id: SubjectLookId) => void;
  subjectSeason: SubjectSeasonId;
  setSubjectSeason: (id: SubjectSeasonId) => void;
  extraPresetIds: string[];
  toggleExtraPreset: (id: string) => void;
  extraCustom: string;
  setExtraCustom: (v: string) => void;
  selfie: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onFile: (e: ChangeEvent<HTMLInputElement>) => void;
  processFile: (file: File) => void;
  onClearSelfie: () => void;
  error: string | null;
  errorAt: string | null;
};

/** 용도 · 분위기 · 셀카. 팩·결제는 MakeStudio에서. */
export default function PurposeUploadStep({
  purposeId,
  setPurposeId,
  setPackId,
  subjectLook,
  setSubjectLook,
  subjectSeason,
  setSubjectSeason,
  extraPresetIds,
  toggleExtraPreset,
  extraCustom,
  setExtraCustom,
  selfie,
  inputRef,
  onFile,
  processFile,
  onClearSelfie,
  error,
  errorAt,
}: PurposeUploadStepProps) {
  return (
    <>
      <div>
        <h2 className="text-sm font-semibold text-ink-700">용도를 골라 주세요</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {PURPOSES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPurposeId(p.id);
                setPackId(p.id === "sheet" ? "plus" : "basic");
              }}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                purposeId === p.id
                  ? "border-accent bg-accent-soft/60 font-semibold"
                  : "border-ink-100 bg-white/80"
              }`}
            >
              {p.title}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-ink-700">셀카를 올려 주세요</h2>
        <p className="mt-1 text-xs text-ink-500">
          원일 촬영 가이드(정면·원·어깨·밝기)를 단정 톤으로 맞춰 두었어요.
        </p>
        <div className="mt-3">
          <ShootTips compact />
        </div>
        <div className="mt-3 rounded-2xl border border-dashed border-ink-300 bg-white/70 p-5 text-center">
          <SelfieCapture
            selfie={selfie}
            inputRef={inputRef}
            onFile={onFile}
            onCapture={processFile}
            onClear={onClearSelfie}
          />
          {!selfie && (
            <p className="mt-3 text-sm text-ink-500">
              탭해서 카메라로 찍거나, 끌어다 놓기
            </p>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[11px] text-ink-300">
            JPG·PNG·HEIC · 20MB 이하 · 전면 카메라 권장
          </p>
          {selfie && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="shrink-0 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-700"
            >
              다시 올리기
            </button>
          )}
        </div>
        <InlineError at="upload" errorAt={errorAt} message={error} />
      </div>

      <details className="rounded-xl border border-ink-100 bg-white/70 px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-ink-700">
          더 맞추기{" "}
          <span className="ml-1 text-[11px] font-normal text-ink-400">
            (선택 · 기본값 그대로도 좋아요)
          </span>
        </summary>
        <div className="mt-3">
          <p className="text-xs text-ink-400">
            잘 맞춰 주시면 옷·분위기가 어긋나지 않아요. 잘 모르겠으면 「사진 그대로」로 두세요.
          </p>
          <p className="mt-3 text-xs font-medium text-ink-600">모습</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {SUBJECT_LOOKS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSubjectLook(opt.id as SubjectLookId)}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  subjectLook === opt.id
                    ? "border-accent bg-accent-soft/60"
                    : "border-ink-100 bg-white/80"
                }`}
              >
                <span className="block text-sm font-semibold text-ink-900">{opt.label}</span>
                <span className="mt-0.5 block text-[11px] text-ink-400">{opt.hint}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs font-medium text-ink-600">나이(연령)</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {SUBJECT_SEASONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSubjectSeason(opt.id as SubjectSeasonId)}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  subjectSeason === opt.id
                    ? "border-accent bg-accent-soft/60"
                    : "border-ink-100 bg-white/80"
                }`}
              >
                <span className="block text-sm font-semibold text-ink-900">{opt.label}</span>
                <span className="mt-0.5 block text-[11px] text-ink-400">{opt.hint}</span>
              </button>
            ))}
          </div>

          <div className="mt-5">
            <ExtraPromptFields
              subjectLook={subjectLook}
              extraPresetIds={extraPresetIds}
              toggleExtraPreset={toggleExtraPreset}
              extraCustom={extraCustom}
              setExtraCustom={setExtraCustom}
            />
          </div>
        </div>
      </details>
    </>
  );
}
