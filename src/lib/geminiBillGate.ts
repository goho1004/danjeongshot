/**
 * geminiBillGate — Gemini 과금 HTTP 단일 출구 · 영속 로그 · 호출/어뷰징 판단 기초.
 *
 * 규칙:
 * - 이 파일만 `@google/genai` 호출 (라우트 SDK ✗).
 * - openGeminiTicket().callLite1K() · 티켓당 hardMax 초과 시 HTTP ✗.
 * - 로그: 이미지·프롬프트·키 ✗ · 메타만 · Upstash 링버퍼(+메모리).
 */

import { createHash } from "crypto";
import { GoogleGenAI } from "@google/genai";
import { ensurePngBuffer } from "@/lib/ensurePng";
import {
  hasUpstash,
  kvLpush,
  kvLrange,
  kvLtrim,
} from "@/lib/upstashKv";

export const GEMINI_LITE_MODEL = "gemini-3.1-flash-lite-image";
export const GEMINI_IMAGE_SIZE = "1K" as const;

const BILL_KEY = "djs:billgate:v1";

export type BillLogEvent =
  | "ticket_open"
  | "http_start"
  | "http_ok"
  | "http_fail"
  | "budget_block"
  | "pause_block"
  | "nokey_block"
  | "route_pause"
  | "cut_already"
  | "inflight_block";

export type BillLogEntry = {
  ts: string;
  product: "danjeong";
  event: BillLogEvent;
  ticketId: string;
  /** preview | redo | asv | pause | ops */
  stage?: string;
  orderPrefix?: string;
  purposeId?: string;
  /** device/ip 짧은 해시 (원문 ✗) */
  actorHash?: string;
  callIndex?: number;
  maxCalls?: number;
  spent?: number;
  ms?: number;
  code?: string;
  model?: string;
  pngBytes?: number;
  imageBytesIn?: number;
  /** 과금 HTTP 실제 발사 여부 */
  billed?: boolean;
};

export type BillAbuseSummary = {
  windowMin: number;
  total: number;
  httpStart: number;
  httpOk: number;
  httpFail: number;
  budgetBlock: number;
  pauseBlock: number;
  routePause: number;
  inflightBlock: number;
  cutAlready: number;
  /** 같은 ticketId에 http_start ≥2 */
  multiHttpTickets: string[];
  /** 분당 http_start 상위 */
  burstPerMinute: { minute: string; n: number }[];
  ok: boolean;
  flags: string[];
};

function billLogMax(): number {
  const n = Number(process.env.BILL_LOG_MAX ?? "500");
  return Number.isFinite(n) && n > 0 ? Math.min(5000, Math.floor(n)) : 500;
}

const billMem: BillLogEntry[] = [];

export function hardMaxCallsPerTicket(): number {
  const n = Number(process.env.GEMINI_HARD_MAX_CALLS_PER_TICKET ?? "1");
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), 3);
}

export function isGeminiBillingPaused(): boolean {
  return (
    process.env.PREVIEW_EMERGENCY === "1" ||
    process.env.PREVIEW_EMERGENCY === "true"
  );
}

/** 원문 PII ✗ — 짧은 해시만 */
export function shortActorHash(raw: string | null | undefined): string | undefined {
  const s = (raw || "").trim();
  if (!s) return undefined;
  return createHash("sha256").update(s).digest("hex").slice(0, 12);
}

export function shortOrderPrefix(orderId: string): string {
  const id = (orderId || "").trim();
  return id ? id.slice(0, 8) : "";
}

async function persistBillLog(entry: BillLogEntry): Promise<void> {
  billMem.unshift(entry);
  const max = billLogMax();
  if (billMem.length > max) billMem.length = max;
  console.info(`[geminiBillGate] ${JSON.stringify(entry)}`);

  if (!hasUpstash()) return;
  try {
    const ok = await kvLpush(BILL_KEY, JSON.stringify(entry));
    if (ok) await kvLtrim(BILL_KEY, 0, max - 1);
  } catch {
    /* ledger never blocks billing path */
  }
}

/** 라우트·게이트 공통 기록 (과금 HTTP 전 차단 포함) */
export async function recordBillEvent(
  partial: Omit<BillLogEntry, "ts" | "product"> & { ts?: string }
): Promise<void> {
  const entry: BillLogEntry = {
    ...partial,
    product: "danjeong",
    ts: partial.ts || new Date().toISOString(),
    billed:
      partial.billed ??
      (partial.event === "http_start" || partial.event === "http_ok"),
  };
  if (partial.event === "http_fail" || partial.event === "http_start") {
    entry.billed = true;
  }
  if (
    partial.event === "budget_block" ||
    partial.event === "pause_block" ||
    partial.event === "route_pause" ||
    partial.event === "nokey_block" ||
    partial.event === "cut_already" ||
    partial.event === "inflight_block" ||
    partial.event === "ticket_open"
  ) {
    entry.billed = false;
  }
  await persistBillLog(entry);
}

export async function listBillLogs(limit = 100): Promise<{
  mode: "upstash" | "memory";
  max: number;
  entries: BillLogEntry[];
}> {
  const take = Math.min(billLogMax(), Math.max(1, Math.floor(limit)));
  let entries: BillLogEntry[] = [];

  if (hasUpstash()) {
    try {
      const raw = await kvLrange(BILL_KEY, 0, take - 1);
      entries = (raw ?? [])
        .map((line) => {
          try {
            return JSON.parse(line) as BillLogEntry;
          } catch {
            return null;
          }
        })
        .filter((e): e is BillLogEntry => !!e && typeof e.ts === "string");
    } catch {
      entries = [];
    }
  }
  if (!entries.length) {
    entries = billMem.slice(0, take);
  }
  return {
    mode: hasUpstash() ? "upstash" : "memory",
    max: billLogMax(),
    entries,
  };
}

export function summarizeBillAbuse(
  entries: BillLogEntry[],
  windowMin = 60
): BillAbuseSummary {
  const now = Date.now();
  const winMs = Math.max(1, windowMin) * 60_000;
  const inWin = entries.filter((e) => {
    const t = Date.parse(e.ts);
    return Number.isFinite(t) && now - t <= winMs;
  });

  const httpStart = inWin.filter((e) => e.event === "http_start").length;
  const httpOk = inWin.filter((e) => e.event === "http_ok").length;
  const httpFail = inWin.filter((e) => e.event === "http_fail").length;
  const budgetBlock = inWin.filter((e) => e.event === "budget_block").length;
  const pauseBlock = inWin.filter((e) => e.event === "pause_block").length;
  const routePause = inWin.filter((e) => e.event === "route_pause").length;
  const inflightBlock = inWin.filter((e) => e.event === "inflight_block").length;
  const cutAlready = inWin.filter((e) => e.event === "cut_already").length;

  const startsByTicket = new Map<string, number>();
  const byMinute = new Map<string, number>();
  for (const e of inWin) {
    if (e.event === "http_start") {
      startsByTicket.set(e.ticketId, (startsByTicket.get(e.ticketId) || 0) + 1);
      const minute = e.ts.slice(0, 16); // YYYY-MM-DDTHH:MM
      byMinute.set(minute, (byMinute.get(minute) || 0) + 1);
    }
  }
  const multiHttpTickets = Array.from(startsByTicket.entries())
    .filter(([, n]) => n >= 2)
    .map(([id]) => id)
    .slice(0, 20);
  const burstPerMinute = Array.from(byMinute.entries())
    .map(([minute, n]) => ({ minute, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 10);

  const flags: string[] = [];
  if (multiHttpTickets.length) flags.push("MULTI_HTTP_SAME_TICKET");
  if (burstPerMinute.some((b) => b.n >= 6)) flags.push("BURST_GE_6_PER_MIN");
  if (budgetBlock >= 3) flags.push("BUDGET_BLOCKS");
  if (httpStart >= 20) flags.push("HIGH_VOLUME_HOUR");
  if (httpFail > httpOk && httpFail >= 3) flags.push("FAIL_GT_OK");

  return {
    windowMin,
    total: inWin.length,
    httpStart,
    httpOk,
    httpFail,
    budgetBlock,
    pauseBlock,
    routePause,
    inflightBlock,
    cutAlready,
    multiHttpTickets,
    burstPerMinute,
    ok: flags.length === 0,
    flags,
  };
}

/** @deprecated 메모리만 — listBillLogs 사용 */
export function recentBillLogs(limit = 40): BillLogEntry[] {
  return billMem.slice(0, Math.max(1, Math.min(limit, billLogMax())));
}

export type LiteOk = {
  ok: true;
  cleanPng: Buffer;
  timeSec: string;
  model: string;
};

export type LiteFail = {
  ok: false;
  code: "STUDIO_PAUSE" | "NO_KEY" | "BUDGET" | "PROVIDER" | "EMPTY";
  error: string;
};

export type LiteResult = LiteOk | LiteFail;

export type GeminiTicket = {
  readonly ticketId: string;
  readonly maxCalls: number;
  readonly spent: () => number;
  callLite1K: (input: {
    prompt: string;
    rawBase64: string;
    mimeType: string;
  }) => Promise<LiteResult>;
};

export function openGeminiTicket(opts: {
  ticketId: string;
  maxCalls?: number;
  stage?: string;
  orderPrefix?: string;
  purposeId?: string;
  actorHash?: string;
}): GeminiTicket {
  const hard = hardMaxCallsPerTicket();
  const maxCalls = Math.min(
    Math.max(1, Math.floor(opts.maxCalls ?? 1)),
    hard
  );
  let spent = 0;
  const meta = {
    stage: opts.stage,
    orderPrefix: opts.orderPrefix,
    purposeId: opts.purposeId,
    actorHash: opts.actorHash,
  };

  void recordBillEvent({
    event: "ticket_open",
    ticketId: opts.ticketId,
    maxCalls,
    spent: 0,
    ...meta,
  });

  return {
    ticketId: opts.ticketId,
    maxCalls,
    spent: () => spent,
    async callLite1K(input) {
      const imageBytesIn = Math.floor((input.rawBase64?.length || 0) * 0.75);
      if (isGeminiBillingPaused()) {
        await recordBillEvent({
          event: "pause_block",
          ticketId: opts.ticketId,
          maxCalls,
          spent,
          code: "STUDIO_PAUSE",
          ...meta,
        });
        return { ok: false, code: "STUDIO_PAUSE", error: "studio paused" };
      }
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        await recordBillEvent({
          event: "nokey_block",
          ticketId: opts.ticketId,
          maxCalls,
          spent,
          code: "NO_KEY",
          ...meta,
        });
        return { ok: false, code: "NO_KEY", error: "no api key" };
      }
      if (spent >= maxCalls) {
        await recordBillEvent({
          event: "budget_block",
          ticketId: opts.ticketId,
          maxCalls,
          spent,
          code: "BUDGET",
          ...meta,
        });
        return {
          ok: false,
          code: "BUDGET",
          error: `ticket budget ${maxCalls} exhausted (spent=${spent})`,
        };
      }

      spent += 1;
      const callIndex = spent;
      const start = Date.now();
      await recordBillEvent({
        event: "http_start",
        ticketId: opts.ticketId,
        callIndex,
        maxCalls,
        spent,
        model: GEMINI_LITE_MODEL,
        imageBytesIn,
        billed: true,
        ...meta,
      });

      try {
        const ai = new GoogleGenAI({ apiKey });
        const interaction = await ai.interactions.create({
          model: GEMINI_LITE_MODEL,
          input: [
            { type: "text", text: input.prompt },
            {
              type: "image",
              data: input.rawBase64,
              mime_type: input.mimeType,
            },
          ],
          response_format: {
            type: "image",
            aspect_ratio: "3:4",
            image_size: GEMINI_IMAGE_SIZE,
          },
        });
        const ms = Date.now() - start;
        const timeSec = (ms / 1000).toFixed(1);
        const data = interaction?.output_image?.data;
        if (!data) {
          await recordBillEvent({
            event: "http_fail",
            ticketId: opts.ticketId,
            callIndex,
            maxCalls,
            spent,
            ms,
            code: "EMPTY",
            model: GEMINI_LITE_MODEL,
            imageBytesIn,
            billed: true,
            ...meta,
          });
          return { ok: false, code: "EMPTY", error: "empty image" };
        }
        const cleanPng = await ensurePngBuffer(Buffer.from(data, "base64"));
        await recordBillEvent({
          event: "http_ok",
          ticketId: opts.ticketId,
          callIndex,
          maxCalls,
          spent,
          ms,
          code: "OK",
          model: GEMINI_LITE_MODEL,
          pngBytes: cleanPng.length,
          imageBytesIn,
          billed: true,
          ...meta,
        });
        return {
          ok: true,
          cleanPng,
          timeSec,
          model: GEMINI_LITE_MODEL,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const ms = Date.now() - start;
        await recordBillEvent({
          event: "http_fail",
          ticketId: opts.ticketId,
          callIndex,
          maxCalls,
          spent,
          ms,
          code: "PROVIDER",
          model: GEMINI_LITE_MODEL,
          imageBytesIn,
          billed: true,
          ...meta,
        });
        console.warn(
          `[geminiBillGate] provider ticket=${opts.ticketId} #${callIndex}:`,
          msg.slice(0, 240)
        );
        return { ok: false, code: "PROVIDER", error: msg.slice(0, 200) };
      }
    },
  };
}
