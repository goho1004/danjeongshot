"use client";

import { useEffect, useId, useRef } from "react";

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

  const canSave = !!previewUrl && !preparing && !saving && !confirmDisabled;

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
              {title}
            </p>
            {hint && <p className="mt-0.5 text-[11px] text-ink-500">{hint}</p>}
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
          {preparing && !previewUrl ? (
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

          {preparing && previewUrl && (
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
            onClick={onClose}
            className="w-full rounded-xl border border-ink-200 bg-white py-2.5 text-sm font-medium text-ink-600 disabled:opacity-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
