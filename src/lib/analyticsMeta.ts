/** 분석 로그 공통 메타 — PII ✗ */

export type UaClass = "mobile" | "desktop" | "bot" | "unknown";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function hourKstFromTs(ts: string): number {
  const t = Date.parse(ts);
  if (!Number.isFinite(t)) return -1;
  const d = new Date(t + KST_OFFSET_MS);
  return d.getUTCHours();
}

/** 0=일 … 6=토 (KST 달력) */
export function weekdayKstFromTs(ts: string): number {
  const t = Date.parse(ts);
  if (!Number.isFinite(t)) return -1;
  const d = new Date(t + KST_OFFSET_MS);
  return d.getUTCDay();
}

export function uaClassFromHeader(ua: string | null | undefined): UaClass {
  if (!ua) return "unknown";
  const s = ua.toLowerCase();
  if (/bot|crawl|spider|slurp|facebookexternalhit/i.test(s)) return "bot";
  if (/mobile|android|iphone|ipad|ipod|webos|blackberry|opera mini/i.test(s)) {
    return "mobile";
  }
  if (/mozilla|chrome|safari|firefox|edge|opr\//i.test(s)) return "desktop";
  return "unknown";
}
