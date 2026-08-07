"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { TriageResult } from "@/lib/csTriage";
import {
  QUALITY_AS_SOP,
  buildGeminiSidePrompt,
  isQualityAsIntent,
} from "@/lib/csQualityAs";
import {
  CS_STAGE1_LOCKED,
  qualityAsSecondPool,
  selectMentPool,
  type MentItem,
} from "@/lib/csMentPool";

type TriageResponse = {
  ok: boolean;
  triage?: TriageResult;
  notify?: { ok: boolean; skipped?: boolean; reason?: string; error?: string };
  order?: { id: string; paid: boolean; downloaded: boolean } | null;
};

export default function OpsCsPage() {
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState("");
  const [token, setToken] = useState("");
  const [asNote, setAsNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TriageResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [secondId, setSecondId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [forceStatus, setForceStatus] = useState<string | null>(null);

  const triage = data?.triage;
  const qualityAs = triage && isQualityAsIntent(triage.intent);

  const pool = useMemo(
    () => (triage ? selectMentPool(triage.intent) : []),
    [triage]
  );
  const secondPool = useMemo(() => qualityAsSecondPool(), []);

  useEffect(() => {
    if (!pool.length) {
      setSelectedId(null);
      return;
    }
    setSelectedId(pool.find((m) => m.preferred)?.id ?? pool[0].id);
  }, [pool]);

  useEffect(() => {
    if (!qualityAs) {
      setSecondId(null);
      return;
    }
    setSecondId(secondPool.find((m) => m.preferred)?.id ?? secondPool[0]?.id ?? null);
  }, [qualityAs, secondPool]);

  const selected: MentItem | undefined = pool.find((m) => m.id === selectedId);
  const selectedSecond: MentItem | undefined = secondPool.find((m) => m.id === secondId);

  const replyBody = useMemo(() => {
    if (!selected) return triage?.reply ?? "";
    const ord =
      orderId.trim() && selected.lane === "quality_as_1st"
        ? `\n(주문번호: ${orderId.trim()})`
        : "";
    return selected.body + ord;
  }, [selected, triage, orderId]);

  const geminiPrompt = buildGeminiSidePrompt({ note: asNote.trim() || undefined });

  const runTriage = useCallback(async () => {
    setLoading(true);
    setCopied(null);
    setForceStatus(null);
    try {
      const res = await fetch("/api/cs/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          orderId: orderId.trim() || undefined,
          notify: true,
        }),
      });
      const json = (await res.json()) as TriageResponse;
      setData(json);
    } catch (e) {
      setData({ ok: false });
      setForceStatus(e instanceof Error ? e.message : "요청 실패");
    } finally {
      setLoading(false);
    }
  }, [message, orderId]);

  const copyText = useCallback(async (text: string, key: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(key);
  }, []);

  const forceNotify = useCallback(async () => {
    setForceStatus(null);
    const text =
      data?.triage
        ? `수동보고 ${data.triage.intent}: ${data.triage.agentNote}`
        : `수동보고: ${message.slice(0, 200)}`;
    const res = await fetch("/api/cs/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "x-ops-token": token } : {}),
      },
      body: JSON.stringify({ text }),
    });
    const json = await res.json();
    setForceStatus(
      json.ok
        ? json.result?.skipped
          ? `건너뜀: ${json.result.reason}`
          : "업무 TG 전송"
        : `실패: ${json.error || json.result?.error || res.status}`
    );
  }, [data, message, token]);

  const badge = useMemo(() => {
    if (!triage) return null;
    if (qualityAs) return "CS 1단계 · 톤맞춤 1·2차 → 카톡 사진 → 생성 → 단정 마무리";
    return triage.notifyWatchdog
      ? "환불·중요 → 업무 TG 보고 대상"
      : "멘트풀 선별 · TG ✗";
  }, [triage, qualityAs]);

  return (
    <div className="min-h-screen bg-paper px-5 py-10 text-ink-900">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-1">
          <p className="text-xs text-ink-400">
            <Link href="/" className="underline">
              홈
            </Link>
            {" · "}
            <Link href="/help" className="underline">
              도움말
            </Link>
          </p>
          <h1 className="font-display text-2xl text-ink-950">운영 CS 콘솔</h1>
          <p className="text-sm text-ink-600">
            triage → <strong>멘트풀 선별</strong> → 카톡. {CS_STAGE1_LOCKED.label}(
            {CS_STAGE1_LOCKED.since}).
          </p>
        </header>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">고객 문의</span>
          <textarea
            className="w-full rounded-lg border border-ink-200 bg-white p-3 text-sm"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="고객이 보낸 문장 그대로"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">주문번호 (선택)</span>
          <input
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="ord_…"
          />
        </label>

        <button
          type="button"
          onClick={runTriage}
          disabled={loading || !message.trim()}
          className="rounded-lg bg-ink-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {loading ? "분류 중…" : "분류 · 멘트풀 열기"}
        </button>

        {badge && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              qualityAs
                ? "bg-accent-soft/50 text-accent-deep"
                : triage?.notifyWatchdog
                  ? "bg-amber-50 text-amber-900"
                  : "bg-studio/10 text-studio-deep"
            }`}
          >
            {badge}
            {triage ? ` · intent=${triage.intent}` : null}
            {!qualityAs && data?.notify
              ? data.notify.skipped
                ? ` · TG 건너뜀(${data.notify.reason})`
                : data.notify.ok
                  ? " · TG 전송"
                  : ` · TG 실패(${data.notify.error})`
              : null}
          </p>
        )}

        {pool.length > 0 ? (
          <section className="space-y-3 rounded-xl border border-ink-100 bg-white p-4">
            <h2 className="text-sm font-semibold">멘트풀 선별</h2>
            <ul className="space-y-2">
              {pool.map((m) => (
                <li key={m.id}>
                  <label className="flex cursor-pointer gap-2 rounded-lg border border-ink-100 p-2 text-sm hover:bg-ink-50 has-[:checked]:border-accent has-[:checked]:bg-accent-soft/30">
                    <input
                      type="radio"
                      name="ment"
                      className="mt-1"
                      checked={selectedId === m.id}
                      onChange={() => setSelectedId(m.id)}
                    />
                    <span>
                      <span className="font-medium text-ink-900">
                        {m.label}
                        {m.preferred ? " · 추천" : ""}
                        {" · "}
                        <span className="font-normal text-ink-400">{m.tone}</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-accent-deep">언제: {m.when}</span>
                      <span className="mt-1 block whitespace-pre-wrap text-xs text-ink-600">
                        {m.body.slice(0, 140)}
                        {m.body.length > 140 ? "…" : ""}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="rounded-lg bg-ink-50 p-3 text-sm whitespace-pre-wrap text-ink-800">
              {replyBody}
            </div>
            <button
              type="button"
              onClick={() => copyText(replyBody, "reply")}
              disabled={!replyBody}
              className="rounded-lg border border-ink-300 px-4 py-2 text-sm disabled:opacity-40"
            >
              {copied === "reply" ? "복사됨" : "선별 멘트 복사 → 카톡"}
            </button>
          </section>
        ) : null}

        {qualityAs ? (
          <section className="space-y-3 rounded-xl border border-accent/30 bg-white p-4">
            <h2 className="text-sm font-semibold text-accent-deep">CS 대응 1단계 (잠금)</h2>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-700">
              {QUALITY_AS_SOP.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Gemini 메모</span>
              <input
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
                value={asNote}
                onChange={(e) => setAsNote(e.target.value)}
                placeholder="예: 이력서용 · 플러스팩"
              />
            </label>
            <div className="rounded-lg bg-ink-50 p-3 text-xs text-ink-600 whitespace-pre-wrap">
              {geminiPrompt}
            </div>
            <button
              type="button"
              onClick={() => copyText(geminiPrompt, "gemini")}
              className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm"
            >
              {copied === "gemini" ? "복사됨" : "Gemini 프롬프트 복사"}
            </button>

            <h3 className="pt-2 text-sm font-semibold">2차 멘트 선별</h3>
            <ul className="space-y-2">
              {secondPool.map((m) => (
                <li key={m.id}>
                  <label className="flex cursor-pointer gap-2 rounded-lg border border-ink-100 p-2 text-sm hover:bg-ink-50 has-[:checked]:border-accent has-[:checked]:bg-accent-soft/30">
                    <input
                      type="radio"
                      name="ment2"
                      className="mt-1"
                      checked={secondId === m.id}
                      onChange={() => setSecondId(m.id)}
                    />
                    <span>
                      <span className="font-medium">{m.label}</span>
                      <span className="mt-0.5 block text-xs text-accent-deep">언제: {m.when}</span>
                      <span className="mt-1 block text-xs text-ink-600 whitespace-pre-wrap">
                        {m.body}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => selectedSecond && copyText(selectedSecond.body, "delivery")}
              disabled={!selectedSecond}
              className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              {copied === "delivery" ? "복사됨" : "2차 멘트 복사 → 카톡"}
            </button>
          </section>
        ) : null}

        <section className="space-y-2 border-t border-ink-100 pt-4">
          <h2 className="text-sm font-semibold text-ink-700">수동 업무 TG 보고 (예외)</h2>
          <label className="block space-y-1 text-xs text-ink-500">
            OPS_CS_TOKEN (프로덕션)
            <input
              type="password"
              className="w-full rounded border border-ink-200 px-2 py-1.5 text-sm"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
          </label>
          <button
            type="button"
            onClick={forceNotify}
            className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 text-sm text-amber-950"
          >
            업무 TG로 강제 보고
          </button>
          {forceStatus && <p className="text-xs text-ink-600">{forceStatus}</p>}
        </section>
      </div>
    </div>
  );
}
