"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * 받기 시트 — 두 국면.
 *  choose  : 받을 수 있는 것들을 **사람 말**로 한 장에 놓고 고르게 한다
 *  preview : 고른 것이 무엇인지 그림으로 보여 주고 「저장」
 *
 * 고르기 화면은 장수 `delivery` 의 선택 카드(제목 + 설명 + 고른 것만 상세 펼침 + 하단 CTA 1개)를
 * 그대로 따랐다. `body` 가 있는 항목은 그 자리에서 펼치고(이메일처럼 입력이 필요한 것),
 * 없으면 preview 국면으로 넘어간다.
 */

export type DownloadChoice = {
  id: string;
  /** 사람 말 제목 — 기능 이름이 아니라 「무엇을 받는지」 */
  title: string;
  desc: string;
  /** 무료 · ₩1,000 · 포함 */
  badge?: string;
  thumbUrl?: string | null;
  recommended?: boolean;
  disabled?: boolean;
  /** 있으면 이 자리에서 펼친다 (preview 로 넘어가지 않음) */
  body?: ReactNode;
  /** 이 선택지를 그만 보기 (인화 규격 순환) */
  skip?: { label: string; onSkip: () => void };
};

type DownloadPreviewModalProps = {
  open: boolean;
  title: string;
  hint?: string;
  previewUrl: string | null;
  preparing?: boolean;
  preparingLabel?: string;
  saving?: boolean;
  error?: string | null;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  /** 기본 preview — 기존 호출부 동작 그대로 */
  phase?: "choose" | "preview";
  choices?: DownloadChoice[];
  chooseTitle?: string;
  chooseHint?: string;
  /** 펼쳐 둘 항목 id (body 가 있는 선택지) */
  expandedId?: string | null;
  onChoose?: (id: string) => void;
  /** preview → choose 로 돌아가기. 없으면 버튼을 안 그린다 */
  onBack?: () => void;
};

export default function DownloadPreviewModal({
  open,
  title,
  hint,
  previewUrl,
  preparing = false,
  preparingLabel = "미리보기 준비 중…",
  saving = false,
  error = null,
  confirmLabel = "저장",
  confirmDisabled = false,
  onConfirm,
  onClose,
  phase = "preview",
  choices,
  chooseTitle = "무엇을 받으시겠어요?",
  chooseHint = "고르면 미리 보여 드리고 저장합니다.",
  expandedId = null,
  onChoose,
  onBack,
}: DownloadPreviewModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, saving, onClose]);

  if (!open) return null;

  const choosing = phase === "choose" && !!choices?.length;
  const canSave = !!previewUrl && !preparing && !saving && !confirmDisabled;
  const headTitle = choosing ? chooseTitle : title;
  const headHint = choosing ? chooseHint : hint;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-ink-950/45"
        disabled={saving}
        onClick={() => {
          if (!saving) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex w-full max-w-md max-h-[92vh] flex-col rounded-t-2xl border border-accent/25 bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-4 py-3">
          <div className="min-w-0">
            <p id={titleId} className="text-sm font-semibold text-accent-deep">
              {headTitle}
            </p>
            {headHint && <p className="mt-0.5 text-[11px] text-ink-500">{headHint}</p>}
          </div>
          <button
            ref={closeRef}
            type="button"
            disabled={saving}
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-ink-500 hover:bg-ink-50 disabled:opacity-50"
          >
            닫기
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3">
          {choosing ? (
            <ul className="space-y-2">
              {choices!.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={c.disabled || saving}
                    aria-expanded={c.body ? expandedId === c.id : undefined}
                    onClick={() => onChoose?.(c.id)}
                    className={`flex w-full items-center gap-3 overflow-hidden rounded-xl border px-3 py-3 text-left disabled:opacity-50 ${
                      c.recommended
                        ? "border-accent/50 bg-accent-soft/40"
                        : "border-ink-200 bg-white"
                    }`}
                  >
                    {c.thumbUrl ? (
                      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-ink-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.thumbUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-ink-900">
                          {c.title}
                        </span>
                        {c.badge && (
                          <span className="shrink-0 rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-600">
                            {c.badge}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-500">
                        {c.desc}
                      </span>
                    </span>
                    <span aria-hidden className="shrink-0 text-ink-300">
                      {c.body ? (expandedId === c.id ? "▴" : "▾") : "›"}
                    </span>
                  </button>
                  {c.body && expandedId === c.id && (
                    <div className="mt-2 rounded-xl border border-ink-100 bg-ink-50/50 px-3 py-3">
                      {c.body}
                    </div>
                  )}
                  {c.skip && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={c.skip.onSkip}
                      className="mt-1 w-full text-center text-[11px] text-ink-400 underline disabled:opacity-50"
                    >
                      {c.skip.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : preparing && !previewUrl ? (
            <div
              className="flex min-h-[180px] max-h-[50vh] items-center justify-center rounded-xl border border-accent/20 bg-accent-soft/30"
              aria-live="polite"
            >
              <p className="text-sm font-medium text-accent-deep">{preparingLabel}</p>
            </div>
          ) : previewUrl ? (
            <div className="overflow-hidden rounded-xl border border-ink-100 bg-ink-50/50 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={`${title} 미리보기`}
                className="mx-auto block h-auto max-h-[min(50vh,420px)] w-full max-w-full rounded-lg object-contain"
              />
            </div>
          ) : (
            <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-ink-100 bg-ink-50/60">
              <p className="text-sm text-ink-500">미리보기를 불러오지 못했어요.</p>
            </div>
          )}

          {!choosing && preparing && previewUrl && (
            <p className="mt-2 text-center text-[11px] text-ink-500" aria-live="polite">
              {preparingLabel}
            </p>
          )}

          {error && (
            <p className="mt-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="space-y-2 border-t border-ink-100 px-4 py-3">
          {choosing ? (
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="w-full rounded-xl border border-ink-200 bg-white py-2.5 text-sm font-medium text-ink-600 disabled:opacity-50"
            >
              닫기
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={!canSave}
                onClick={() => void onConfirm()}
                className="w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "저장 중…" : confirmLabel}
              </button>
              <p className="text-center text-[11px] text-ink-500">
                저장 후 공유 창 → 「이미지 저장」
              </p>
              <button
                type="button"
                disabled={saving}
                onClick={onBack ?? onClose}
                className="w-full rounded-xl border border-ink-200 bg-white py-2.5 text-sm font-medium text-ink-600 disabled:opacity-50"
              >
                {onBack ? "다른 것 받기" : "닫기"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
