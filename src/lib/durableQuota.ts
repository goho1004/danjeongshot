/**
 * 어뷰징 카운터 — 인메모리 + (옵션) Upstash Redis REST.
 * 인스턴스 리셋·시크릿 우회를 줄이려면 UPSTASH_* 설정.
 */

type Entry = { count: number; resetAt: number };

const mem = new Map<string, Entry>();

async function redisIncr(
  key: string,
  windowSec: number
): Promise<{ count: number; ttl: number } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  try {
    const incr = await fetch(`${url}/incr/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!incr.ok) return null;
    const j = (await incr.json()) as { result?: number };
    const count = Number(j.result ?? 0);
    if (count === 1) {
      await fetch(`${url}/expire/${encodeURIComponent(key)}/${windowSec}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    const ttlRes = await fetch(`${url}/ttl/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const ttlJ = (await ttlRes.json()) as { result?: number };
    const ttl = Math.max(1, Number(ttlJ.result ?? windowSec));
    return { count, ttl };
  } catch {
    return null;
  }
}

export async function durableIncr(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: true; count: number } | { ok: false; retryAfterSec: number; count: number }> {
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const remote = await redisIncr(key, windowSec);
  if (remote) {
    if (remote.count > limit) {
      return { ok: false, retryAfterSec: remote.ttl, count: remote.count };
    }
    return { ok: true, count: remote.count };
  }

  const now = Date.now();
  const cur = mem.get(key);
  if (!cur || now >= cur.resetAt) {
    mem.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, count: 1 };
  }
  if (cur.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)),
      count: cur.count,
    };
  }
  cur.count += 1;
  return { ok: true, count: cur.count };
}

export function durableQuotaMode(): "upstash" | "memory" {
  return process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? "upstash"
    : "memory";
}
