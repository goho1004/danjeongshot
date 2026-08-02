import type { ChangeEvent, RefObject } from "react";
import InlineError from "@/components/make/InlineError";
import RegenPanel from "@/components/make/steps/RegenPanel";
import type { BusyKind } from "@/lib/make/types";
import type { SubjectLookId } from "@/lib/purposes";

type PostPayFetchStepProps = {
  busyKind: BusyKind;
  loadingLines: readonly string[];
  loadingIdx: number;
  download: () => void;
  downloading: boolean;
  selectedUrl: string | null;
  redoUsed: number;
  asvUsed: number;
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

export default function PostPayFetchStep({
  busyKind,
  loadingLines,
  loadingIdx,
  download,
  downloading,
  selectedUrl,
  redoUsed,
  asvUsed,
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
}: PostPayFetchStepProps) {
  return (
    <div className="rounded-2xl border border-accent/30 bg-accent-soft/40 p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-accent-deep">6. 사진 받기</p>
        <p className="mt-1 text-xs text-ink-500">
          「이 컷 받기」를 누르면 클린 PNG를 준비하고 저장까지 이어가요. 막히면 다음 단계에서 「파일로 저장」을 눌러 주세요.
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-400">
          받지 않으셔도 자동 환불되지는 않아요. 마음에 드는 컷을 받아 두시고, 아쉬우면 아래 다시
          만들기를 이용해 주세요.
        </p>
      </div>

      {(busyKind === "redo" || busyKind === "asv") && (
        <div
          className="rounded-xl border border-accent/20 bg-white/95 px-4 py-3 text-center"
          aria-live="polite"
        >
          <p className="text-[11px] font-semibold tracking-wide text-accent-deep">
            {busyKind === "redo" ? "다시 만드는 중" : "한 번 더 정성을 들이는 중"}
          </p>
          <p
            key={`paid-${busyKind}-${loadingIdx}`}
            className="animate-rise mt-1.5 text-sm font-medium text-ink-800"
          >
            {loadingLines[loadingIdx % loadingLines.length]}
          </p>
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={download}
          disabled={!selectedUrl || !!busyKind || downloading}
          className="w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {downloading ? "파일 준비 중…" : "이 컷 받기 · PNG"}
        </button>
        <InlineError at="download" errorAt={errorAt} message={error} />
      </div>

      <RegenPanel
        busyKind={busyKind}
        redoUsed={redoUsed}
        asvUsed={asvUsed}
        regenSelfie={regenSelfie}
        setRegenSelfie={setRegenSelfie}
        regenInputRef={regenInputRef}
        onRegenFile={onRegenFile}
        runPaidRegen={runPaidRegen}
        error={error}
        errorAt={errorAt}
        subjectLook={subjectLook}
        extraPresetIds={extraPresetIds}
        toggleExtraPreset={toggleExtraPreset}
        extraCustom={extraCustom}
        setExtraCustom={setExtraCustom}
      />
    </div>
  );
}
