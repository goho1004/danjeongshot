/**
 * 단정 generate 호출 장부 — 링버퍼(최신 N건 · 오래된 것 삭제).
 * Upstash 있으면 인스턴스 공유, 없으면 프로세스 메모리.
 * 셀피·프롬프트·키 ✗ · 과금·제품개선 추적용 메타만.
 */

import {
  hasUpstash,
  kvLpush,
  kvLrange,
  kvLtrim,
  upstashHealth,
} from "@/lib/upstashKv";
import {
  hourKstFromTs,
  uaClassFromHeader,
  weekdayKstFromTs,
  type UaClass,
} from "@/lib/analyticsMeta";

const KEY = "djs:genlog:v1";
const PROBE_KEY = "djs:genlog:probe:v1";
export const GENLOG_PRODUCT = "danjeong" as const;

export type GenerateLogEntry = {
  ts: string;
  product: typeof GENLOG_PRODUCT;
  stage: "preview" | "redo" | "asv";
  /** 실제 Gemini interactions 발사 수 (mock=0) */
  geminiCalls: number;
  /** 이미지 성공으로 끝난 콜 수 (부분 실패 추적용) */
  geminiOk: number;
  mock: boolean;
  ok: boolean;
  code?: string;
  purposeId?: string;
  look?: string;
  season?: string;
  packId?: string;
  paid?: boolean;
  /** orderId 앞 8자만 */
  orderPrefix?: string;
  ms?: number;
  model?: string;
  hourKst?: number;
  weekdayKst?: number;
  uaClass?: UaClass;
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
    if (!o.product) o.product = GENLOG_PRODUCT;
    if (o.hourKst == null) o.hourKst = hourKstFromTs(o.ts);
    if (o.weekdayKst == null) o.weekdayKst = weekdayKstFromTs(o.ts);
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
  partial: Omit<GenerateLogEntry, "ts" | "product" | "hourKst" | "weekdayKst"> & {
    ts?: string;
    ua?: string | null;
  }
): Promise<void> {
  const ts = partial.ts || new Date().toISOString();
  const { ua, ...rest } = partial;
  const entry: GenerateLogEntry = {
    ...rest,
    ts,
    product: GENLOG_PRODUCT,
    model: partial.model || "gemini-3.1-flash-lite-image",
    hourKst: hourKstFromTs(ts),
    weekdayKst: weekdayKstFromTs(ts),
    uaClass: rest.uaClass ?? uaClassFromHeader(ua),
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
  avgGeminiPerHttp: number;
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
  return {
    http,
    geminiCalls,
    geminiOk,
    mockHttp,
    avgGeminiPerHttp: http ? Math.round((geminiCalls / http) * 100) / 100 : 0,
  };
}

/** 제품개선용 요약 — 시간대·용도·코드·배수 */
export function summarizeGenerateLogs(entries: GenerateLogEntry[]) {
  const byHour: Record<string, number> = {};
  const byWeekday: Record<string, number> = {};
  const byPurpose: Record<string, number> = {};
  const byLook: Record<string, number> = {};
  const bySeason: Record<string, number> = {};
  const byCode: Record<string, number> = {};
  const byStage: Record<string, number> = {};
  const byUa: Record<string, number> = {};
  const byDay: Record<string, { http: number; gemini: number }> = {};
  let okN = 0;
  for (const e of entries) {
    const h = String(e.hourKst ?? hourKstFromTs(e.ts));
    byHour[h] = (byHour[h] || 0) + 1;
    const w = String(e.weekdayKst ?? weekdayKstFromTs(e.ts));
    byWeekday[w] = (byWeekday[w] || 0) + 1;
    if (e.purposeId) byPurpose[e.purposeId] = (byPurpose[e.purposeId] || 0) + 1;
    if (e.look) byLook[e.look] = (byLook[e.look] || 0) + 1;
    if (e.season) bySeason[e.season] = (bySeason[e.season] || 0) + 1;
    if (e.code) byCode[e.code] = (byCode[e.code] || 0) + 1;
    byStage[e.stage] = (byStage[e.stage] || 0) + 1;
    if (e.uaClass) byUa[e.uaClass] = (byUa[e.uaClass] || 0) + 1;
    const day = e.ts.slice(0, 10);
    if (!byDay[day]) byDay[day] = { http: 0, gemini: 0 };
    byDay[day].http += 1;
    byDay[day].gemini += e.geminiCalls;
    if (e.ok) okN += 1;
  }
  return {
    n: entries.length,
    okRate: entries.length ? Math.round((okN / entries.length) * 1000) / 10 : 0,
    byHourKst: byHour,
    byWeekdayKst: byWeekday,
    byPurpose,
    byLook,
    bySeason,
    byCode,
    byStage,
    byUaClass: byUa,
    byDay,
    sums: sumGeminiCalls(entries),
  };
}

export function shortOrderPrefix(orderId: string | undefined): string | undefined {
  if (!orderId) return undefined;
  return orderId.slice(0, 8);
}
