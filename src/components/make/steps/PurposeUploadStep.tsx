import type { ChangeEvent, RefObject } from "react";
import ShootTips from "@/components/ShootTips";
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
  error: string | null;
  errorAt: string | null;
};

/** 1~3만. 팩·결제·첫컷 버튼은 MakeStudio에서 결제창 다음에 둠. */
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
  error,
  errorAt,
}: PurposeUploadStepProps) {
  return (
    <>
      <div>
        <h2 className="text-sm font-semibold text-ink-700">1. 용도</h2>
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
        <h2 className="text-sm font-semibold text-ink-700">2. 사진 속 분은요</h2>
        <p className="mt-1 text-xs text-ink-400">
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

      <div>
        <h2 className="text-sm font-semibold text-ink-700">3. 셀카 업로드</h2>
        <div
          className="mt-3 cursor-pointer rounded-2xl border border-dashed border-ink-300 bg-white/70 p-8 text-center"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) processFile(f);
          }}
        >
          {selfie ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selfie} alt="업로드" className="mx-auto max-h-56 rounded-lg object-contain" />
          ) : (
            <div>
              <p className="text-sm text-ink-500">클릭하거나 끌어다 놓기</p>
              <p className="mt-1 text-xs text-ink-300">정면 · 밝은 곳 · 얼굴 크게</p>
            </div>
          )}
          <input
            ref={inputRef as RefObject<HTMLInputElement>}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
        </div>
        <InlineError at="upload" errorAt={errorAt} message={error} />
        <div className="mt-3">
          <ShootTips compact />
        </div>
      </div>
    </>
  );
}
