/**
 * 단정 제품 분석 이벤트 장부 (퍼널).
 * genlog(생성 상세)와 분리 · PII ✗ · Upstash 링버퍼.
 */

import {
  hasUpstash,
  kvLpush,
  kvLrange,
  kvLtrim,
} from "@/lib/upstashKv";
import {
  hourKstFromTs,
  uaClassFromHeader,
  weekdayKstFromTs,
  type UaClass,
} from "@/lib/analyticsMeta";

const KEY = "djs:evtlog:v1";
export const PRODUCT_ID = "danjeong" as const;

export type ProductEventName =
  | "checkout"
  | "pay_ok"
  | "pay_fail"
  | "generate"
  | "download"
  | "pause_hit"
  | "cut_already"
  | "inflight_block";

export type ProductEventEntry = {
  ts: string;
  product: typeof PRODUCT_ID;
  event: ProductEventName;
  ok: boolean;
  code?: string;
  purposeId?: string;
  packId?: string;
  amountKrw?: number;
  orderPrefix?: string;
  look?: string;
  season?: string;
  uaClass?: UaClass;
  hourKst?: number;
  weekdayKst?: number;
  ms?: number;
  geminiCalls?: number;
  geminiOk?: number;
  stage?: string;
};

function maxEntries(): number {
  const n = Number(process.env.PRODUCT_EVENT_LOG_MAX ?? "500");
  return Number.isFinite(n) && n > 0 ? Math.min(3000, Math.floor(n)) : 500;
}

function ttlMs(): number {
  const days = Number(process.env.PRODUCT_EVENT_LOG_TTL_DAYS ?? "14");
  const d = Number.isFinite(days) && days > 0 ? days : 14;
  return d * 24 * 60 * 60 * 1000;
}

const mem: ProductEventEntry[] = [];

function parseEntry(raw: string): ProductEventEntry | null {
  try {
    const o = JSON.parse(raw) as ProductEventEntry;
    if (!o || typeof o.ts !== "string" || typeof o.event !== "string") return null;
    return o;
  } catch {
    return null;
  }
}

function withinTtl(e: ProductEventEntry, now = Date.now()): boolean {
  const t = Date.parse(e.ts);
  if (!Number.isFinite(t)) return false;
  return now - t <= ttlMs();
}

export async function appendProductEvent(
  partial: Omit<ProductEventEntry, "ts" | "product" | "hourKst" | "weekdayKst"> & {
    ts?: string;
    ua?: string | null;
  }
): Promise<void> {
  const ts = partial.ts || new Date().toISOString();
  const { ua, ...rest } = partial;
  const entry: ProductEventEntry = {
    ...rest,
    ts,
    product: PRODUCT_ID,
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
  }

  mem.unshift(entry);
  if (mem.length > max) mem.length = max;
}

export async function listProductEvents(limit = 200): Promise<{
  mode: "upstash" | "memory";
  max: number;
  ttlDays: number;
  entries: ProductEventEntry[];
}> {
  const take = Math.min(maxEntries(), Math.max(1, Math.floor(limit)));
  const now = Date.now();
  let entries: ProductEventEntry[] = [];

  if (hasUpstash()) {
    const raw = await kvLrange(KEY, 0, maxEntries() - 1);
    if (raw) {
      entries = raw
        .map(parseEntry)
        .filter((e): e is ProductEventEntry => !!e && withinTtl(e, now));
    }
  }
  if (!entries.length && mem.length) {
    entries = mem.filter((e) => withinTtl(e, now));
  }

  return {
    mode: hasUpstash() ? "upstash" : "memory",
    max: maxEntries(),
    ttlDays: Math.round(ttlMs() / (24 * 60 * 60 * 1000)),
    entries: entries.slice(0, take),
  };
}

export function summarizeProductEvents(entries: ProductEventEntry[]) {
  const byEvent: Record<string, number> = {};
  const byHour: Record<string, number> = {};
  const byPurpose: Record<string, number> = {};
  const byPack: Record<string, number> = {};
  const byCode: Record<string, number> = {};
  for (const e of entries) {
    byEvent[e.event] = (byEvent[e.event] || 0) + 1;
    const h = String(e.hourKst ?? "?");
    byHour[h] = (byHour[h] || 0) + 1;
    if (e.purposeId) byPurpose[e.purposeId] = (byPurpose[e.purposeId] || 0) + 1;
    if (e.packId) byPack[e.packId] = (byPack[e.packId] || 0) + 1;
    if (e.code) byCode[e.code] = (byCode[e.code] || 0) + 1;
  }
  return { byEvent, byHourKst: byHour, byPurpose, byPack, byCode, n: entries.length };
}
