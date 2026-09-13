/**
 * 단정 generate 호출 장부 — 링버퍼(최신 N건 · 오래된 것 삭제).
 * Upstash 있으면 인스턴스 공유, 없으면 프로세스 메모리.
 * 셀피·프롬프트·키 ✗ · 과금 추적용 메타만.
 */

import {
  hasUpstash,
  kvLpush,
  kvLrange,
  kvLtrim,
  upstashHealth,
} from "@/lib/upstashKv";

const KEY = "djs:genlog:v1";
const PROBE_KEY = "djs:genlog:probe:v1";

export type GenerateLogEntry = {
  ts: string;
  stage: "preview" | "redo" | "asv";
  /** 실제 Gemini interactions 발사 수 (mock=0, preview 설계상 3) */
  geminiCalls: number;
  /** 이미지 성공으로 끝난 콜 수 (부분 실패 추적용) */
  geminiOk: number;
  mock: boolean;
  ok: boolean;
  code?: string;
  purposeId?: string;
  /** orderId 앞 8자만 */
  orderPrefix?: string;
  ms?: number;
  model?: string;
};

function maxEntries(): number {
  const n = Number(process.env.GENERATE_LOG_MAX ?? "300");
  return Number.isFinite(n) && n > 0 ? Math.min(2000, Math.floor(n)) : 300;
}

function ttlMs(): number {
  const days = Number(process.env.GENERATE_LOG_TTL_DAYS ?? "14");
  const d = Number.isFinite(days) && days > 0 ? days : 14;
  return d * 24 * 60 * 60 * 1000;
}

const mem: GenerateLogEntry[] = [];

function parseEntry(raw: string): GenerateLogEntry | null {
  try {
    const o = JSON.parse(raw) as GenerateLogEntry;
    if (!o || typeof o.ts !== "string" || typeof o.stage !== "string") return null;
    return o;
  } catch {
    return null;
  }
}

function withinTtl(e: GenerateLogEntry, now = Date.now()): boolean {
  const t = Date.parse(e.ts);
  if (!Number.isFinite(t)) return false;
  return now - t <= ttlMs();
}

export function generateLogStoreMode(): "upstash" | "memory" {
  return hasUpstash() ? "upstash" : "memory";
}

export async function appendGenerateLog(
  partial: Omit<GenerateLogEntry, "ts"> & { ts?: string }
): Promise<void> {
  const entry: GenerateLogEntry = {
    ...partial,
    ts: partial.ts || new Date().toISOString(),
    model: partial.model || "gemini-3.1-flash-lite-image",
  };
  const line = JSON.stringify(entry);
  const max = maxEntries();

  if (hasUpstash()) {
    const pushed = await kvLpush(KEY, line);
    if (pushed) {
      await kvLtrim(KEY, 0, max - 1);
      return;
    }
    console.warn("[genlog] push-fail");
  }

  mem.unshift(entry);
  if (mem.length > max) mem.length = max;
}

export async function listGenerateLogs(limit = 100): Promise<{
  mode: "upstash" | "memory";
  max: number;
  ttlDays: number;
  entries: GenerateLogEntry[];
}> {
  const take = Math.min(maxEntries(), Math.max(1, Math.floor(limit)));
  const now = Date.now();
  let entries: GenerateLogEntry[] = [];

  if (hasUpstash()) {
    const raw = await kvLrange(KEY, 0, maxEntries() - 1);
    if (raw) {
      entries = raw
        .map(parseEntry)
        .filter((e): e is GenerateLogEntry => !!e && withinTtl(e, now));
    }
  }

  if (!entries.length && mem.length) {
    entries = mem.filter((e) => withinTtl(e, now));
  }

  return {
    mode: generateLogStoreMode(),
    max: maxEntries(),
    ttlDays: Math.round(ttlMs() / (24 * 60 * 60 * 1000)),
    entries: entries.slice(0, take),
  };
}

/** maint — LPUSH→LRANGE round-trip (키·프롬프트·값 ✗, 단계+상태만) */
let lastProbeErr: string | null = null;

export function genLogProbeErr(): string | null {
  return lastProbeErr;
}

export async function probeGenLogStore(): Promise<boolean> {
  lastProbeErr = null;
  if (!hasUpstash()) {
    lastProbeErr = "no-creds";
    return false;
  }
  const tag = `probe:${Date.now()}`;
  if (!(await kvLpush(PROBE_KEY, tag))) {
    const h = upstashHealth();
    lastProbeErr = `lpush:${h.lastKind ?? "fail"}`;
    return false;
  }
  const raw = await kvLrange(PROBE_KEY, 0, 0);
  if (!raw?.length || raw[0] !== tag) {
    const h = upstashHealth();
    lastProbeErr = raw ? "mismatch" : `lrange:${h.lastKind ?? "fail"}`;
    return false;
  }
  await kvLtrim(PROBE_KEY, 1, 0);
  return true;
}

/** 과금 역산용 — 기간 내 geminiCalls 합 */
export function sumGeminiCalls(entries: GenerateLogEntry[]): {
  http: number;
  geminiCalls: number;
  geminiOk: number;
  mockHttp: number;
} {
  let http = 0;
  let geminiCalls = 0;
  let geminiOk = 0;
  let mockHttp = 0;
  for (const e of entries) {
    http += 1;
    geminiCalls += e.geminiCalls;
    geminiOk += e.geminiOk;
    if (e.mock) mockHttp += 1;
  }
  return { http, geminiCalls, geminiOk, mockHttp };
}

export function shortOrderPrefix(orderId: string | undefined): string | undefined {
  if (!orderId) return undefined;
  return orderId.slice(0, 8);
}
