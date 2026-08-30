import InlineError from "@/components/make/InlineError";
import type { BusyKind } from "@/lib/make/types";

type FirstCutButtonProps = {
  paid: boolean;
  selfie: boolean;
  busyKind: BusyKind;
  generate: () => void;
  error: string | null;
  errorAt: string | null;
  loadingLines: readonly string[];
  loadingIdx: number;
};

/** /result — 결제 후 생성 시작 */
export default function FirstCutButton({
  paid,
  selfie,
  busyKind,
  generate,
  error,
  errorAt,
  loadingLines,
  loadingIdx,
}: FirstCutButtonProps) {
  const canClick = paid && selfie && !busyKind;

  return (
    <div>
      <button
        type="button"
        disabled={!canClick}
        onClick={generate}
        className="w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        {busyKind === "preview" ? "생성 중…" : "컷 만들기"}
      </button>
      <InlineError at="generate" errorAt={errorAt} message={error} />
      {paid && !selfie && (
        <p className="mt-2 text-center text-[11px] text-ink-400">셀카를 먼저 올려 주세요.</p>
      )}
      {busyKind === "preview" && (
        <p
          key={`first-${loadingIdx}`}
          className="animate-rise mt-3 text-center text-sm font-medium text-accent-deep"
          aria-live="polite"
        >
          {loadingLines[loadingIdx % loadingLines.length]}
        </p>
      )}
    </div>
  );
}
