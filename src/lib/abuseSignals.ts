/**
 * 결제 전 미리보기 이상신호 3단
 * - 주의 100/일: 로그만 (막지 않음)
 * - 경계 200/일: 챌린지(또는 Turnstile) 필수
 * - 비상 ~1000/일 또는 10분 80장+: 일시 중단
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "crypto";
import { durableIncr, durableQuotaMode } from "@/lib/durableQuota";

const DAY_MS = 24 * 60 * 60 * 1000;
const BURST_MS = 10 * 60 * 1000;

export const ABUSE = {
  alertDay: Number(process.env.PREVIEW_ALERT_DAY ?? "100"),
  challengeDay: Number(process.env.PREVIEW_CHALLENGE_DAY ?? "200"),
  emergencyDay: Number(process.env.PREVIEW_EMERGENCY_DAY ?? "1000"),
  burstLimit: Number(process.env.PREVIEW_BURST_LIMIT ?? "80"),
  burstWindowMs: Number(process.env.PREVIEW_BURST_WINDOW_MS ?? String(BURST_MS)),
} as const;

export type AbuseLevel = "ok" | "alert" | "challenge" | "emergency";

function dayKey(d = new Date()): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function secret(): string {
  return (
    process.env.PREVIEW_QUOTA_SECRET?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    "danjeongshot-dev-preview-quota"
  );
}

function challengeKey(): Buffer {
  return createHash("sha256").update(`chal:${secret()}`).digest();
}

/** 상한 없이 카운트만 (이상신호용) */
export async function softIncr(key: string, windowMs: number): Promise<number> {
  const r = await durableIncr(key, 10_000_000, windowMs);
  return r.count;
}

export function classifyAbuse(dayCount: number, burstCount: number): AbuseLevel {
  if (
    process.env.PREVIEW_EMERGENCY === "1" ||
    process.env.PREVIEW_EMERGENCY === "true"
  ) {
    return "emergency";
  }
  if (dayCount >= ABUSE.emergencyDay || burstCount >= ABUSE.burstLimit) {
    return "emergency";
  }
  if (dayCount >= ABUSE.challengeDay) return "challenge";
  if (dayCount >= ABUSE.alertDay) return "alert";
  return "ok";
}

/** 미리보기 1회마다 호출 — 카운트 + 레벨 */
export async function recordPreviewSignal(): Promise<{
  dayCount: number;
  burstCount: number;
  level: AbuseLevel;
}> {
  const day = dayKey();
  const dayCount = await softIncr(`pq:sig:day:${day}`, DAY_MS);
  const burstCount = await softIncr(`pq:sig:burst`, ABUSE.burstWindowMs);
  const level = classifyAbuse(dayCount, burstCount);

  if (level === "alert" || level === "challenge" || level === "emergency") {
    const log =
      level === "emergency" ? console.error : console.warn;
    log(`[abuse:${level}]`, {
      dayCount,
      burstCount,
      durable: durableQuotaMode(),
    });
    void pingAbuseWebhook({ level, dayCount, burstCount, at: Date.now() });
  }

  return { dayCount, burstCount, level };
}

type ChallengePayload = {
  v: 1;
  n: string;
  exp: number;
};

export function issueChallengeToken(): {
  token: string;
  waitMs: number;
  expiresInSec: number;
} {
  const waitMs = 1600;
  const expiresInSec = 180;
  const body: ChallengePayload = {
    v: 1,
    n: randomBytes(12).toString("hex"),
    exp: Date.now() + expiresInSec * 1000,
  };
  const plain = Buffer.from(JSON.stringify(body), "utf8");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", challengeKey(), iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  const token = Buffer.concat([iv, tag, enc]).toString("base64url");
  return { token, waitMs, expiresInSec };
}

export function verifyChallengeToken(token: string): boolean {
  try {
    if (!token || token.length < 40 || token.length > 2000) return false;
    const buf = Buffer.from(token, "base64url");
    if (buf.length < 29) return false;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", challengeKey(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
    const data = JSON.parse(plain.toString("utf8")) as ChallengePayload;
    if (data.v !== 1 || !data.n || !data.exp) return false;
    if (Date.now() > data.exp) return false;
    return true;
  } catch {
    return false;
  }
}

/** 챌린지 1회용 — 재사용 차단 */
export async function consumeChallengeToken(token: string): Promise<boolean> {
  if (!verifyChallengeToken(token)) return false;
  const h = createHash("sha256").update(token).digest("hex").slice(0, 24);
  const used = await durableIncr(`pq:chal:used:${h}`, 1, 5 * 60 * 1000);
  return used.ok;
}

export async function verifyTurnstile(
  token: string,
  ip: string
): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secretKey) return false;
  if (!token || token.length < 10) return false;
  try {
    const body = new URLSearchParams({
      secret: secretKey,
      response: token,
      remoteip: ip,
    });
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      }
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return !!data.success;
  } catch {
    return false;
  }
}

export function turnstileConfigured(): boolean {
  return !!(
    process.env.TURNSTILE_SECRET_KEY?.trim() &&
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()
  );
}

export async function pingAbuseWebhook(payload: Record<string, unknown>) {
  const url = process.env.ABUSE_WEBHOOK_URL?.trim();
  if (!url) return;
  try {
    const sig = createHmac("sha256", secret())
      .update(JSON.stringify(payload))
      .digest("hex");
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Djs-Abuse-Sig": sig,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn("[abuse:webhook]", e instanceof Error ? e.message : e);
  }
}

export function abuseConfigPublic() {
  return {
    alertDay: ABUSE.alertDay,
    challengeDay: ABUSE.challengeDay,
    emergencyDay: ABUSE.emergencyDay,
    burstLimit: ABUSE.burstLimit,
    turnstile: turnstileConfigured(),
    durableMode: durableQuotaMode(),
  };
}
