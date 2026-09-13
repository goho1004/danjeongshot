/**
 * Upstash Redis REST — GET / SET / SET NX / LIST(LPUSH·LTRIM·LRANGE).
 * 없으면 null·false 반환(호출측이 메모리 폴백).
 */

function creds(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

export function hasUpstash(): boolean {
  return !!creds();
}

type CmdOk = { ok: true; result: unknown };
type CmdFail = { ok: false };

async function runCommand(parts: unknown[]): Promise<CmdOk | CmdFail> {
  const c = creds();
  if (!c) return { ok: false };
  try {
    const res = await fetch(c.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parts),
    });
    if (!res.ok) return { ok: false };
    const j = (await res.json()) as
      | { result?: unknown }
      | Array<{ result?: unknown }>;
    if (Array.isArray(j)) {
      return { ok: true, result: j[0]?.result };
    }
    return { ok: true, result: j.result };
  } catch {
    return { ok: false };
  }
}

export async function kvGet(key: string): Promise<string | null> {
  const r = await runCommand(["GET", key]);
  if (!r.ok) return null;
  return typeof r.result === "string" ? r.result : null;
}

export async function kvSet(
  key: string,
  value: string,
  exSec?: number
): Promise<boolean> {
  const parts: unknown[] =
    exSec && exSec > 0
      ? ["SET", key, value, "EX", Math.floor(exSec)]
      : ["SET", key, value];
  const r = await runCommand(parts);
  return r.ok && r.result === "OK";
}

/**
 * true = 키 획득(처음)
 * false = 이미 존재(NX 거부) — Upstash result null
 * null = Upstash 미설정·HTTP/네트워크 오류
 */
export async function kvSetNx(
  key: string,
  value: string,
  exSec?: number
): Promise<boolean | null> {
  if (!creds()) return null;
  const parts: unknown[] =
    exSec && exSec > 0
      ? ["SET", key, value, "NX", "EX", Math.floor(exSec)]
      : ["SET", key, value, "NX"];
  const r = await runCommand(parts);
  if (!r.ok) return null;
  if (r.result === "OK") return true;
  return false;
}

export async function kvLpush(key: string, value: string): Promise<boolean> {
  const r = await runCommand(["LPUSH", key, value]);
  if (!r.ok) return false;
  const n = typeof r.result === "number" ? r.result : Number(r.result);
  return Number.isFinite(n) && n > 0;
}

export async function kvLtrim(
  key: string,
  start: number,
  stop: number
): Promise<boolean> {
  const r = await runCommand([
    "LTRIM",
    key,
    String(start),
    String(stop),
  ]);
  return r.ok && (r.result === "OK" || r.result === null || r.result === undefined);
}

export async function kvLrange(
  key: string,
  start: number,
  stop: number
): Promise<string[] | null> {
  const r = await runCommand([
    "LRANGE",
    key,
    String(start),
    String(stop),
  ]);
  if (!r.ok) return null;
  if (!Array.isArray(r.result)) return null;
  return r.result.map((x) => String(x));
}
