/**
 * 결제 전 미리보기 어뷰징 대응
 * - 서명 쿠키(기기·일) + 클라이언트 deviceFp 바인딩
 * - IP / 동일이미지 한도
 * - 이상신호 3단: 100 알림 · 200 챌린지 · 1000/버스트 비상
 *
 * 맛보기 방어의 본체는 **옅은 서버 워터마크 + 클린본 미전송**.
 */

import { createHash, createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { clientIp } from "@/lib/rateLimit";
import { durableIncr, durableQuotaMode } from "@/lib/durableQuota";
import {
  ABUSE,
  abuseConfigPublic,
  consumeChallengeToken,
  recordPreviewSignal,
  turnstileConfigured,
  verifyTurnstile,
  type AbuseLevel,
} from "@/lib/abuseSignals";

export const PREVIEW_COOKIE = "djs_pq";

const PER_DEVICE_DAY = Number(process.env.PREVIEW_PER_DEVICE_DAY ?? "3");
const PER_IP_HOUR = Number(process.env.GENERATE_RATE_LIMIT ?? "5");
const IP_WINDOW_MS = Number(
  process.env.GENERATE_RATE_WINDOW_MS ?? String(60 * 60 * 1000)
);
const SAME_IMAGE_LIMIT = Number(process.env.PREVIEW_SAME_IMAGE_LIMIT ?? "2");
/** 0 = 글로벌 하드캡 없음 (이상신호 3단이 대체) */
const GLOBAL_DAY = Number(process.env.DAILY_GEN_BUDGET ?? "0");
const DAY_MS = 24 * 60 * 60 * 1000;

function secret(): string {
  return (
    process.env.PREVIEW_QUOTA_SECRET?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    "danjeongshot-dev-preview-quota"
  );
}

/** CI·maint gate — IP/동일이미지 한도 생략 (MAINT_SMOKE_SECRET 필요) */
function isMaintSmoke(req: NextRequest): boolean {
  const expected = process.env.MAINT_SMOKE_SECRET?.trim();
  if (!expected) return false;
  return req.headers.get("x-djs-maint-smoke") === expected;
}

function dayKey(d = new Date()): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex").slice(0, 24);
}

function safeEq(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export type PreviewQuotaState = {
  count: number;
  day: string;
  fpHash?: string;
};

export function readDeviceFp(req: NextRequest): string {
  const h = req.headers.get("x-djs-device")?.trim() || "";
  if (!h || h.length < 8 || h.length > 128) return "";
  if (!/^[a-zA-Z0-9_-]+$/.test(h)) return "";
  return h;
}

export function readPreviewCookie(req: NextRequest): PreviewQuotaState {
  const raw = req.cookies.get(PREVIEW_COOKIE)?.value;
  const today = dayKey();
  if (!raw) return { count: 0, day: today };
  const parts = raw.split(".");
  if (parts.length !== 3 && parts.length !== 4) return { count: 0, day: today };
  const countStr = parts[0];
  const day = parts[1];
  const fpHash = parts.length === 4 ? parts[2] : undefined;
  const sig = parts[parts.length - 1];
  const payload = parts.slice(0, -1).join(".");
  if (!safeEq(sig, sign(payload))) return { count: 0, day: today };
  const count = Number(countStr);
  if (!Number.isFinite(count) || count < 0) return { count: 0, day: today };
  if (day !== today) return { count: 0, day: today };
  return { count, day, fpHash };
}

export function writePreviewCookie(res: NextResponse, state: PreviewQuotaState): void {
  const base = state.fpHash
    ? `${state.count}.${state.day}.${state.fpHash}`
    : `${state.count}.${state.day}`;
  const value = `${base}.${sign(base)}`;
  res.cookies.set(PREVIEW_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function imageFingerprint(rawBase64: string): string {
  const sample = rawBase64.slice(0, 4096) + `:${rawBase64.length}`;
  return createHash("sha256").update(sample).digest("hex").slice(0, 32);
}

export type PreviewGateResult =
  | {
      ok: true;
      nextCount: number;
      day: string;
      fp: string;
      fpHash?: string;
      abuseLevel: AbuseLevel;
      dayCount: number;
      burstCount: number;
    }
  | {
      ok: false;
      status: number;
      code: string;
      error: string;
      retryAfterSec?: number;
      payHint: true;
      challengeRequired?: boolean;
      abuseLevel?: AbuseLevel;
      dayCount?: number;
      burstCount?: number;
    };

export async function gatePreviewGenerate(
  req: NextRequest,
  rawBase64: string,
  opts?: { challengeToken?: string; turnstileToken?: string }
): Promise<PreviewGateResult> {
  const ip = clientIp(req);
  const imgFp = imageFingerprint(rawBase64);
  const cookie = readPreviewCookie(req);
  const deviceRaw = readDeviceFp(req);
  const fpHash = deviceRaw
    ? createHash("sha256").update(deviceRaw).digest("hex").slice(0, 16)
    : cookie.fpHash;

  if (
    process.env.PREVIEW_EMERGENCY === "1" ||
    process.env.PREVIEW_EMERGENCY === "true"
  ) {
    return {
      ok: false,
      status: 503,
      code: "PREVIEW_EMERGENCY",
      error:
        "일시적으로 미리보기를 멈추었습니다. 잠시 후 다시 시도하거나, 결제 후 이용해 주세요.",
      payHint: true,
      abuseLevel: "emergency",
    };
  }

  if (isMaintSmoke(req)) {
    return {
      ok: true,
      nextCount: cookie.count + 1,
      day: cookie.day,
      fp: imgFp,
      fpHash,
      abuseLevel: "ok",
      dayCount: 0,
      burstCount: 0,
    };
  }

  if (cookie.fpHash && fpHash && cookie.fpHash !== fpHash) {
    return {
      ok: false,
      status: 429,
      code: "PREVIEW_DEVICE_MISMATCH",
      error: "기기 정보가 바뀌었습니다. 결제 후 다시 만들기·A/S를 이용해 주세요.",
      payHint: true,
    };
  }

  if (cookie.count >= PER_DEVICE_DAY) {
    return {
      ok: false,
      status: 429,
      code: "PREVIEW_DEVICE_DAY_LIMIT",
      error: `오늘 미리보기는 ${PER_DEVICE_DAY}회까지입니다. 결제 후 「다시 만들기·A/S」로 이어가 주세요.`,
      payHint: true,
    };
  }

  if (fpHash) {
    const d = await durableIncr(
      `pq:dev:${fpHash}:${cookie.day}`,
      PER_DEVICE_DAY,
      DAY_MS
    );
    if (!d.ok) {
      return {
        ok: false,
        status: 429,
        code: "PREVIEW_DEVICE_DAY_LIMIT",
        error: `오늘 미리보기는 ${PER_DEVICE_DAY}회까지입니다. 결제 후 「다시 만들기·A/S」로 이어가 주세요.`,
        payHint: true,
      };
    }
  }

  const rl = await durableIncr(`pq:ip:${ip}`, PER_IP_HOUR, IP_WINDOW_MS);
  if (!rl.ok) {
    return {
      ok: false,
      status: 429,
      code: "RATE_LIMIT",
      error: `요청이 너무 잦습니다. ${rl.retryAfterSec}초 후 또는 결제 후 이용해 주세요.`,
      retryAfterSec: rl.retryAfterSec,
      payHint: true,
    };
  }

  const imgRl = await durableIncr(
    `pq:img:${ip}:${imgFp}`,
    SAME_IMAGE_LIMIT,
    IP_WINDOW_MS
  );
  if (!imgRl.ok) {
    return {
      ok: false,
      status: 429,
      code: "PREVIEW_SAME_IMAGE",
      error:
        "같은 사진으로 미리보기를 너무 많이 요청했습니다. 다른 셀카로 시도하거나, 결제 후 다시 만들기를 이용해 주세요.",
      payHint: true,
    };
  }

  // 기기·IP 통과분만 이상신호 집계
  const signal = await recordPreviewSignal();

  if (signal.level === "emergency") {
    return {
      ok: false,
      status: 503,
      code: "PREVIEW_EMERGENCY",
      error:
        "일시적으로 미리보기를 멈추었습니다. 잠시 후 다시 시도하거나, 결제 후 이용해 주세요.",
      payHint: true,
      abuseLevel: "emergency",
      dayCount: signal.dayCount,
      burstCount: signal.burstCount,
    };
  }

  if (signal.level === "challenge") {
    let passed = false;
    if (opts?.turnstileToken && turnstileConfigured()) {
      passed = await verifyTurnstile(opts.turnstileToken, ip);
    }
    if (!passed && opts?.challengeToken) {
      passed = await consumeChallengeToken(opts.challengeToken);
    }
    if (!passed) {
      return {
        ok: false,
        status: 429,
        code: "CHALLENGE_REQUIRED",
        error:
          "요청이 많아 확인이 필요합니다. 잠시만 기다려 다시 시도해 주세요.",
        payHint: true,
        challengeRequired: true,
        abuseLevel: "challenge",
        dayCount: signal.dayCount,
        burstCount: signal.burstCount,
      };
    }
  }

  if (GLOBAL_DAY > 0) {
    const g = await durableIncr(`pq:global:${dayKey()}`, GLOBAL_DAY, DAY_MS);
    if (!g.ok) {
      return {
        ok: false,
        status: 429,
        code: "PREVIEW_GLOBAL_BUDGET",
        error:
          "오늘 미리보기 생성량이 한도에 도달했습니다. 잠시 후 또는 결제 후 이용해 주세요.",
        retryAfterSec: g.retryAfterSec,
        payHint: true,
      };
    }
  }

  return {
    ok: true,
    nextCount: cookie.count + 1,
    day: cookie.day,
    fp: imgFp,
    fpHash,
    abuseLevel: signal.level,
    dayCount: signal.dayCount,
    burstCount: signal.burstCount,
  };
}

export function previewQuotaConfig() {
  return {
    perDeviceDay: PER_DEVICE_DAY,
    perIpHour: PER_IP_HOUR,
    sameImageLimit: SAME_IMAGE_LIMIT,
    dailyGenBudget: GLOBAL_DAY,
    durableMode: durableQuotaMode(),
    abuse: abuseConfigPublic(),
    thresholds: {
      alert: ABUSE.alertDay,
      challenge: ABUSE.challengeDay,
      emergency: ABUSE.emergencyDay,
      burst: ABUSE.burstLimit,
    },
  };
}
