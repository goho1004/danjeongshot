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
type CmdFail = { ok: false; status?: number; kind?: string };

/** HTTP 상태·실패 종류만 (URL·토큰·값 ✗) — ops 진단용 */
let lastStatus: number | null = null;
let lastKind: string | null = null;

export function upstashHealth(): {
  configured: boolean;
  lastStatus: number | null;
  lastKind: string | null;
} {
  return { configured: !!creds(), lastStatus, lastKind };
}

async function runCommand(parts: unknown[]): Promise<CmdOk | CmdFail> {
  const c = creds();
  if (!c) {
    lastStatus = null;
    lastKind = "no-creds";
    return { ok: false, kind: "no-creds" };
  }
  try {
    const res = await fetch(c.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parts),
    });
    if (!res.ok) {
      lastStatus = res.status;
      lastKind = `http-${res.status}`;
      return { ok: false, status: res.status, kind: lastKind };
    }
    lastStatus = res.status;
    let j: { result?: unknown } | Array<{ result?: unknown }>;
    try {
      j = (await res.json()) as
        | { result?: unknown }
        | Array<{ result?: unknown }>;
    } catch {
      lastKind = "parse";
      return { ok: false, status: res.status, kind: "parse" };
    }
    lastKind = null;
    if (Array.isArray(j)) {
      return { ok: true, result: j[0]?.result };
    }
    return { ok: true, result: (j as { result?: unknown }).result };
  } catch {
    lastStatus = null;
    lastKind = "network";
    return { ok: false, kind: "network" };
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
  if (!r.ok) {
    console.warn(
      `[upstash] lpush-fail status=${r.status ?? "-"} kind=${r.kind ?? "-"}`
    );
    return false;
  }
  const n = typeof r.result === "number" ? r.result : Number(r.result);
  const ok = Number.isFinite(n) && (n as number) > 0;
  if (!ok) {
    console.warn(`[upstash] lpush-fail kind=bad-result typeof=${typeof r.result}`);
  }
  return ok;
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
  if (!r.ok) {
    console.warn(
      `[upstash] lrange-fail status=${r.status ?? "-"} kind=${r.kind ?? "-"}`
    );
    return null;
  }
  if (!Array.isArray(r.result)) {
    console.warn(`[upstash] lrange-fail kind=bad-result typeof=${typeof r.result}`);
    return null;
  }
  return r.result.map((x) => String(x));
}
