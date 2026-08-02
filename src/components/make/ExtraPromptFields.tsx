import {
  EXTRA_PROMPT_MAX,
  visibleExtraPresets,
  type SubjectLookId,
} from "@/lib/purposes";

type ExtraPromptFieldsProps = {
  subjectLook: SubjectLookId;
  extraPresetIds: string[];
  toggleExtraPreset: (id: string) => void;
  extraCustom: string;
  setExtraCustom: (v: string) => void;
  /** compact = 다시 만들기 패널용 */
  compact?: boolean;
};

export default function ExtraPromptFields({
  subjectLook,
  extraPresetIds,
  toggleExtraPreset,
  extraCustom,
  setExtraCustom,
  compact = false,
}: ExtraPromptFieldsProps) {
  const presets = visibleExtraPresets(subjectLook);

  return (
    <div className={compact ? "mt-3" : ""}>
      {!compact && (
        <>
          <p className="text-xs font-medium text-ink-600">추가 요청 (선택)</p>
          <p className="mt-1 text-[11px] text-ink-400">
            의상은 하나만 고르세요. 얼굴·성별·나이는 바꾸지 않아요.
          </p>
        </>
      )}
      {compact && (
        <p className="text-[11px] font-medium text-ink-600">
          다시 만들 때 · 추가 요청{" "}
          <span className="font-normal text-ink-400">(의상 1개)</span>
        </p>
      )}
      <div className={`flex flex-wrap gap-2 ${compact ? "mt-1.5" : "mt-2"}`}>
        {presets.map((p) => {
          const on = extraPresetIds.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggleExtraPreset(p.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                on
                  ? "bg-accent text-white"
                  : "border border-ink-100 bg-white text-ink-600 hover:border-accent/40"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <label className="mt-2 block">
        <span className="sr-only">추가 요청 직접 입력</span>
        <textarea
          value={extraCustom}
          onChange={(e) => setExtraCustom(e.target.value.slice(0, EXTRA_PROMPT_MAX))}
          rows={2}
          maxLength={EXTRA_PROMPT_MAX}
          placeholder="예: 귀걸이는 작게, 배경은 더 하얗게…"
          className="w-full resize-none rounded-xl border border-ink-100 bg-white/90 px-3 py-2.5 text-sm text-ink-800 placeholder:text-ink-300 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
        />
        <span className="mt-1 block text-right text-[10px] text-ink-300">
          {extraCustom.length}/{EXTRA_PROMPT_MAX}
        </span>
      </label>
    </div>
  );
}
