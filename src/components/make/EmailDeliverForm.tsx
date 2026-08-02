"use client";

import { useState } from "react";
import { PRINT_GUIDE, PRINTING_BOX } from "@/lib/printingBox";

type EmailDeliverFormProps = {
  disabled?: boolean;
  busyLabel?: string;
  onSend: (email: string) => Promise<{ ok: boolean; message: string }>;
};

/** 사진에 저장과 병행 · 증빙·백업 · 폰에서 파일 못 찾을 때 */
export default function EmailDeliverForm({
  disabled,
  busyLabel = "보내는 중…",
  onSend,
}: EmailDeliverFormProps) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (disabled || busy) return;
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const r = await onSend(email.trim());
      if (r.ok) setMsg(r.message);
      else setErr(r.message);
    } catch {
      setErr("발송 중 오류가 났어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-3 space-y-2">
      <p className="text-xs font-semibold text-ink-800">이메일로 받기</p>
      <p className="text-[11px] leading-relaxed text-ink-500">
        사진에 저장이 안 될 때 · 메일함에서 열어 {PRINTING_BOX.name}에 올리세요. (
        {PRINT_GUIDE.label} · 제공 개시 기록)
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={email}
          disabled={disabled || busy}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-ink-200 px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || busy || !email.trim()}
          className="shrink-0 rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? busyLabel : "메일로 보내기"}
        </button>
      </div>
      {msg && (
        <p className="text-xs text-accent-deep" role="status">
          {msg}
        </p>
      )}
      {err && (
        <p className="text-xs text-red-700" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}
