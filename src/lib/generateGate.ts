/**
 * 결제 후 생성(/api/generate) 동시·남용 게이트.
 * Upstash 있으면 인스턴스 공유, 없으면 메모리(베타 완화).
 */

import { NextRequest } from "next/server";
import { clientIp } from "@/lib/rateLimit";
import { durableIncr, durableQuotaMode } from "@/lib/durableQuota";
import { readDeviceFp } from "@/lib/previewQuota";
import { createHash } from "crypto";
import { STUDIO_BUSY, STUDIO_WAIT } from "@/lib/userFacingErrors";

const PER_IP_MINUTE = Number(process.env.GENERATE_PER_IP_MINUTE ?? "4");
const PER_IP_HOUR = Number(process.env.GENERATE_RATE_LIMIT ?? "20");
const IP_HOUR_MS = Number(
  process.env.GENERATE_RATE_WINDOW_MS ?? String(60 * 60 * 1000)
);
const GLOBAL_MINUTE = Number(process.env.GENERATE_GLOBAL_MINUTE ?? "30");
const GLOBAL_DAY = Number(process.env.DAILY_GEN_BUDGET ?? "500");
const PER_DEVICE_HOUR = Number(process.env.GENERATE_PER_DEVICE_HOUR ?? "12");

function dayKey(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function isMaintSmoke(req: NextRequest): boolean {
  const expected = process.env.MAINT_SMOKE_SECRET?.trim();
  if (!expected) return false;
  return req.headers.get("x-djs-maint-smoke") === expected;
}

export type GenerateGateOk = {
  ok: true;
  mode: "upstash" | "memory";
};

export type GenerateGateDeny = {
  ok: false;
  status: 429 | 503;
  code: string;
  error: string;
  retryAfterSec?: number;
};

export async function gatePaidGenerate(
  req: NextRequest
): Promise<GenerateGateOk | GenerateGateDeny> {
  if (
    process.env.PREVIEW_EMERGENCY === "1" ||
    process.env.PREVIEW_EMERGENCY === "true"
  ) {
    return {
      ok: false,
      status: 503,
      code: "STUDIO_PAUSE",
      error: STUDIO_BUSY,
    };
  }

  if (isMaintSmoke(req)) {
    return { ok: true, mode: durableQuotaMode() };
  }

  const ip = clientIp(req);
  const deviceRaw = readDeviceFp(req);
  const fpHash = deviceRaw
    ? createHash("sha256").update(deviceRaw).digest("hex").slice(0, 16)
    : "";

  // 1) IP · 분당
  if (PER_IP_MINUTE > 0) {
    const m = await durableIncr(`gen:ip:m:${ip}`, PER_IP_MINUTE, 60_000);
    if (!m.ok) {
      return {
        ok: false,
        status: 429,
        code: "GEN_IP_MINUTE",
        error: STUDIO_WAIT,
        retryAfterSec: m.retryAfterSec,
      };
    }
  }

  // 2) IP · 시간
  if (PER_IP_HOUR > 0) {
    const h = await durableIncr(`gen:ip:h:${ip}`, PER_IP_HOUR, IP_HOUR_MS);
    if (!h.ok) {
      return {
        ok: false,
        status: 429,
        code: "GEN_IP_HOUR",
        error: STUDIO_WAIT,
        retryAfterSec: h.retryAfterSec,
      };
    }
  }

  // 3) 기기 · 시간
  if (fpHash && PER_DEVICE_HOUR > 0) {
    const d = await durableIncr(
      `gen:dev:h:${fpHash}`,
      PER_DEVICE_HOUR,
      IP_HOUR_MS
    );
    if (!d.ok) {
      return {
        ok: false,
        status: 429,
        code: "GEN_DEVICE_HOUR",
        error: STUDIO_WAIT,
        retryAfterSec: d.retryAfterSec,
      };
    }
  }

  // 4) 글로벌 · 분당
  if (GLOBAL_MINUTE > 0) {
    const g = await durableIncr(`gen:global:m`, GLOBAL_MINUTE, 60_000);
    if (!g.ok) {
      return {
        ok: false,
        status: 503,
        code: "GEN_GLOBAL_MINUTE",
        error: STUDIO_BUSY,
        retryAfterSec: g.retryAfterSec,
      };
    }
  }

  // 5) 글로벌 · 일 (0이면 스킵 — .env.example 옛 기본과 호환하려면 >0일 때만)
  if (GLOBAL_DAY > 0) {
    const day = dayKey();
    const g = await durableIncr(
      `gen:global:d:${day}`,
      GLOBAL_DAY,
      24 * 60 * 60 * 1000
    );
    if (!g.ok) {
      return {
        ok: false,
        status: 503,
        code: "GEN_GLOBAL_DAY",
        error: STUDIO_BUSY,
        retryAfterSec: g.retryAfterSec,
      };
    }
  }

  return { ok: true, mode: durableQuotaMode() };
}
