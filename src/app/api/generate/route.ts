import { NextRequest, NextResponse } from "next/server";
import {
  buildPrompt,
  getPurpose,
  parseExtraPresetIds,
  parseSubjectLook,
  parseSubjectSeason,
  sanitizeExtraPrompt,
} from "@/lib/purposes";
import { MAINT_SMOKE_VIA, openGeminiTicket, recordBillEvent, shortActorHash, shortOrderPrefix as billOrderPrefix, withMaintTicketPrefix } from "@/lib/geminiBillGate";
import { isMaintSmokeRequest } from "@/lib/maintSmoke";
import {
  EASTER_LABEL,
  preferCleanShotIndex,
  PREVIEW_SHOT_COUNT,
  rollEasterSlot,
} from "@/lib/easterEgg";
import {
  canRunAsv,
  canRunRedo,
  markCutDelivered,
  putOrder,
} from "@/lib/orders";
import { resolvePaidOrder } from "@/lib/orderPaid";
import {
  claimAsvGenerate,
  claimPreviewGenerate,
  claimRedoGenerate,
  markAsvDurable,
  markRedoDurable,
  persistOrder,
  resolveOrderDurable,
} from "@/lib/orderDurable";
import {
  bindPreviewToOrder,
  replaceCleanAsset,
  storePreviewAsset,
} from "@/lib/previewAssets";
import { sealPreviewVault } from "@/lib/previewVault";
import { gatePaidGenerate } from "@/lib/generateGate";
import { burnEasterWatermark } from "@/lib/watermark";
import {
  STUDIO_BUSY,
  STUDIO_RETRY,
  toUserFacingGenerateError,
} from "@/lib/userFacingErrors";
import {
  appendGenerateLog,
  shortOrderPrefix,
} from "@/lib/generateCallLog";
import { appendProductEvent } from "@/lib/productEventLog";
import { readDeviceFp } from "@/lib/previewQuota";
import { clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 90;

type GenLogCtx = {
  purposeId?: string;
  orderPrefix?: string;
  look?: string;
  season?: string;
  packId?: string;
  paid?: boolean;
  ua?: string | null;
  /** maint 자동 스모크 — "maint_smoke" (uaClass만으로 구분 ✗) */
  via?: string;
};

/** 요청 스코프 분석 메타 — noteGen이 병합 */
let genLogCtx: GenLogCtx = {};

/** Vercel에서 void면 응답 직후 동결되어 Upstash LPUSH가 유실됨 → 반드시 await */
async function noteGen(
  entry: Parameters<typeof appendGenerateLog>[0]
): Promise<void> {
  try {
    const merged = { ...genLogCtx, ...entry };
    await appendGenerateLog(merged);
    const ev =
      entry.code === "STUDIO_PAUSE"
        ? ("pause_hit" as const)
        : entry.code === "CUT_ALREADY"
          ? ("cut_already" as const)
          : entry.code === "PREVIEW_INFLIGHT"
            ? ("inflight_block" as const)
            : ("generate" as const);
    await appendProductEvent({
      event: ev,
      ok: !!entry.ok,
      code: entry.code,
      purposeId: merged.purposeId,
      packId: merged.packId,
      orderPrefix: merged.orderPrefix,
      look: merged.look,
      season: merged.season,
      ua: merged.ua,
      ms: entry.ms,
      geminiCalls: entry.geminiCalls,
      geminiOk: entry.geminiOk,
      stage: entry.stage,
    });
  } catch {
    /* ledger never blocks generate */
  }
}

type ModelResult =
  | { success: true; imageUrl: string; timeSec: string; cleanPng?: Buffer }
  | { success: false; error: string };

type Stage = "preview" | "redo" | "asv";

type ShotPayload = {
  success: true;
  imageUrl: string;
  /** 이스터 슬롯: vault 클린과 동일. 표시·저장은 imageUrl(워터마크). 제거=이 URL/vault */
  imageUrlClean?: string;
  timeSec: string;
  label: string;
  easter?: boolean;
  easterVariant?: "glyph" | "animal";
  watermark?: "easter" | "none";
  previewVault: string;
};

function cleanDataUrl(png: Buffer): string {
  return `data:image/png;base64,${png.toString("base64")}`;
}

async function mockCleanPng(label: string): Promise<Buffer> {
  const { default: sharp } = await import("sharp");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop stop-color="#d8efe9"/><stop offset="1" stop-color="#f4f6f9"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="46%" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#0f4a3f">단정샷 MOCK</text>
    <text x="50%" y="54%" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#5a6578">${label}</text>
  </svg>`;
  try {
    return await sharp(Buffer.from(svg)).png().toBuffer();
  } catch {
    return sharp({
      create: {
        width: 600,
        height: 800,
        channels: 3,
        background: { r: 216, g: 239, b: 233 },
      },
    })
      .png()
      .toBuffer();
  }
}

function parseImage(imageBase64: string): { rawBase64: string; mimeType: string } {
  let rawBase64 = imageBase64;
  let mimeType = "image/jpeg";
  const matches = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
  if (matches) {
    mimeType = matches[1];
    rawBase64 = matches[2];
  } else if (imageBase64.includes("base64,")) {
    rawBase64 = imageBase64.split("base64,")[1];
  }
  return { rawBase64, mimeType };
}

function parseStage(raw: unknown): Stage {
  if (raw === "redo" || raw === "asv") return raw;
  return "preview";
}

/** 프리뷰 슬롯: 0=베이스, 1+ = 미세 변형 (1컷이면 변형 없음) */
function previewVariantIndex(slot: number): number | undefined {
  if (slot <= 0) return undefined;
  return (slot - 1) % 2;
}

export async function POST(req: NextRequest) {
  try {
    const ua = req.headers.get("user-agent");
    const maintSmoke = isMaintSmokeRequest(req);
    const maintVia = maintSmoke ? MAINT_SMOKE_VIA : undefined;
    genLogCtx = { ua, via: maintVia };

    // 비상 정지 — 결제/생성 전에 즉시 차단 (Gemini 과금 차단)
    if (
      process.env.PREVIEW_EMERGENCY === "1" ||
      process.env.PREVIEW_EMERGENCY === "true"
    ) {
      await noteGen({
        stage: "preview",
        geminiCalls: 0,
        geminiOk: 0,
        mock: false,
        ok: false,
        code: "STUDIO_PAUSE",
        purposeId: "pause",
        orderPrefix: "",
        ms: 0,
      });
      return NextResponse.json(
        { error: STUDIO_BUSY, code: "STUDIO_PAUSE" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const stage = parseStage(body.stage);
    const imageBase64: string | undefined = body.imageBase64;
    const purposeId: string = body.purposeId ?? "resume";
    const subjectLook = parseSubjectLook(body.subjectLook);
    const subjectSeason = parseSubjectSeason(body.subjectSeason);
    const orderId = String(body.orderId ?? "");
    const unlockToken = String(body.unlockToken ?? "");
    const easterOptOut = body.easterOptOut === true || body.cleanOnly === true;

    genLogCtx = {
      ua,
      via: maintVia,
      purposeId,
      orderPrefix: shortOrderPrefix(orderId),
      look: subjectLook,
      season: subjectSeason,
      paid: stage === "preview" || stage === "redo" || stage === "asv",
    };

    if (!imageBase64) {
      return NextResponse.json({ error: "셀카를 먼저 업로드해 주세요." }, { status: 400 });
    }
    if (!getPurpose(purposeId)) {
      return NextResponse.json({ error: "지원하지 않는 용도입니다." }, { status: 400 });
    }
    if (imageBase64.length > 12_000_000) {
      return NextResponse.json({ error: "이미지가 너무 큽니다. 8MB 이하로 올려 주세요." }, { status: 400 });
    }

    const { rawBase64, mimeType } = parseImage(imageBase64);

    // pay-first: 무료 미리보기 생성 금지 — 결제된 주문만 첫 컷/재생성
    if (stage === "preview") {
      const order = await resolvePaidOrder(orderId, unlockToken);
      if (!order?.paid) {
        return NextResponse.json(
          {
            error: "팩을 고르고 결제한 뒤 첫 컷을 만들 수 있어요.",
            code: "PAY_REQUIRED",
            payHint: true,
          },
          { status: 402 }
        );
      }
      // 이미 첫 컷 전달됨 → Gemini 재호출 ✗ (이중 제출·새로고침 방어)
      if (order.cutDeliveredAt) {
        await noteGen({
          stage: "preview",
          geminiCalls: 0,
          geminiOk: 0,
          mock: false,
          ok: false,
          code: "CUT_ALREADY",
          purposeId,
          orderPrefix: shortOrderPrefix(orderId),
          ms: 0,
        });
        return NextResponse.json(
          {
            error: "이미 첫 컷을 만들었어요. 다시 만들기·A/S를 이용해 주세요.",
            code: "CUT_ALREADY",
          },
          { status: 409 }
        );
      }
      const claimed = await claimPreviewGenerate(orderId);
      if (claimed === "unavailable") {
        return NextResponse.json(
          { error: STUDIO_BUSY, code: "STORE_UNAVAILABLE" },
          { status: 503 }
        );
      }
      if (claimed === "inflight") {
        return NextResponse.json(
          { error: STUDIO_BUSY, code: "PREVIEW_INFLIGHT" },
          { status: 429 }
        );
      }
    }

    if (stage === "redo") {
      await resolveOrderDurable(orderId, unlockToken);
      const gate = canRunRedo(orderId, unlockToken);
      if (!gate.ok) {
        return NextResponse.json(
          { error: toUserFacingGenerateError(gate.reason, "generic") },
          { status: 403 }
        );
      }
    }
    if (stage === "asv") {
      await resolveOrderDurable(orderId, unlockToken);
      const gate = canRunAsv(orderId, unlockToken);
      if (!gate.ok) {
        return NextResponse.json(
          { error: toUserFacingGenerateError(gate.reason, "generic") },
          { status: 403 }
        );
      }
    }

    // 동시·남용 게이트 (Upstash 권장)
    const traffic = await gatePaidGenerate(req);
    if (!traffic.ok) {
      return NextResponse.json(
        {
          error: traffic.error,
          code: traffic.code,
          retryAfterSec: traffic.retryAfterSec,
        },
        {
          status: traffic.status,
          headers: traffic.retryAfterSec
            ? { "Retry-After": String(traffic.retryAfterSec) }
            : undefined,
        }
      );
    }

    // P0-1: redo/asv도 mock·Gemini 생성 전에 원자 claim — 동시 2 POST면 1승1패, Gemini HTTP 최대 1회.
    // canRun* 통과 후·발사 전이므로 정당한 순차 재시도는 게이트 순서(redo→asv·1회 한도)가 먼저 걸러냄.
    if (stage === "redo") {
      const rc = await claimRedoGenerate(orderId);
      if (rc === "unavailable") {
        return NextResponse.json(
          { error: STUDIO_BUSY, code: "STORE_UNAVAILABLE" },
          { status: 503 }
        );
      }
      if (rc === "inflight") {
        return NextResponse.json(
          { error: STUDIO_BUSY, code: "REDO_INFLIGHT" },
          { status: 429 }
        );
      }
    }
    if (stage === "asv") {
      const ac = await claimAsvGenerate(orderId);
      if (ac === "unavailable") {
        return NextResponse.json(
          { error: STUDIO_BUSY, code: "STORE_UNAVAILABLE" },
          { status: 503 }
        );
      }
      if (ac === "inflight") {
        return NextResponse.json(
          { error: STUDIO_BUSY, code: "ASV_INFLIGHT" },
          { status: 429 }
        );
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const forceMock = process.env.MOCK_GENERATE === "1" || !apiKey || apiKey.trim() === "";

    const extraPresetIds = parseExtraPresetIds(body.extraPresetIds);
    const extraCustom = sanitizeExtraPrompt(body.extraCustom);
    const legacyExtra =
      !extraPresetIds.length && !extraCustom
        ? sanitizeExtraPrompt(body.extraPrompt)
        : "";

    const finishPaidSingle = async (
      cleanPng: Buffer,
      timeSec: string,
      label: string
    ) => {
      let order =
        stage === "redo"
          ? await markRedoDurable(orderId, unlockToken)
          : stage === "asv"
            ? await markAsvDurable(orderId, unlockToken)
            : await resolveOrderDurable(orderId, unlockToken);
      if (!order?.paid) {
        return NextResponse.json(
          { error: "결제 확인 후 만들 수 있습니다." },
          { status: 403 }
        );
      }
      if (order.previewAssetId) {
        const replaced = replaceCleanAsset(order.previewAssetId, orderId, cleanPng);
        if (!replaced) {
          storePreviewAsset({
            cleanPng,
            purposeId,
            id: order.previewAssetId,
          });
          bindPreviewToOrder(order.previewAssetId, orderId);
        }
      } else {
        const asset = storePreviewAsset({ cleanPng, purposeId });
        bindPreviewToOrder(asset.id, orderId);
        order = putOrder({ ...order, previewAssetId: asset.id });
      }
      const delivered = markCutDelivered(order.id, order.unlockToken) || order;
      await persistOrder(delivered);
      const previewVault = sealPreviewVault({ cleanPng, purposeId });
      const imageUrl = cleanDataUrl(cleanPng);
      return NextResponse.json({
        stage,
        mock: forceMock,
        watermark: "none",
        shot: { success: true, imageUrl, timeSec, label },
        preview: { success: true, imageUrl, timeSec, label },
        previewAssetId: delivered.previewAssetId,
        previewVault,
        unlockToken: delivered.unlockToken,
        redoUsed: delivered.redoUsed,
        asvUsed: delivered.asvUsed,
        cutDeliveredAt: delivered.cutDeliveredAt,
      });
    };

    const finishPaidPreview = async (
      shotResults: {
        cleanPng: Buffer;
        timeSec: string;
        easter: boolean;
        easterVariant?: "glyph" | "animal";
      }[]
    ) => {
      let order = await resolveOrderDurable(orderId, unlockToken);
      if (!order?.paid) {
        return NextResponse.json(
          { error: "결제 확인 후 만들 수 있습니다." },
          { status: 403 }
        );
      }
      const flags = shotResults.map((s) => s.easter);
      const primaryIdx = preferCleanShotIndex(flags);
      const primary = shotResults[primaryIdx];

      if (order.previewAssetId) {
        const replaced = replaceCleanAsset(
          order.previewAssetId,
          orderId,
          primary.cleanPng
        );
        if (!replaced) {
          storePreviewAsset({
            cleanPng: primary.cleanPng,
            purposeId,
            id: order.previewAssetId,
          });
          bindPreviewToOrder(order.previewAssetId, orderId);
        }
      } else {
        const asset = storePreviewAsset({ cleanPng: primary.cleanPng, purposeId });
        bindPreviewToOrder(asset.id, orderId);
        order = putOrder({ ...order, previewAssetId: asset.id });
      }
      const delivered = markCutDelivered(order.id, order.unlockToken) || order;
      await persistOrder(delivered);

      const shots: ShotPayload[] = [];
      for (let i = 0; i < shotResults.length; i++) {
        const s = shotResults[i];
        const vault = sealPreviewVault({ cleanPng: s.cleanPng, purposeId });
        const label = s.easter ? EASTER_LABEL : `컷 ${i + 1}`;
        if (s.easter) {
          const variant = s.easterVariant ?? "glyph";
          const burned = await burnEasterWatermark(s.cleanPng, variant);
          shots.push({
            success: true as const,
            imageUrl: burned.markedDataUrl,
            imageUrlClean: cleanDataUrl(s.cleanPng),
            timeSec: s.timeSec,
            label,
            easter: true,
            easterVariant: variant,
            watermark: "easter",
            previewVault: vault,
          });
        } else {
          shots.push({
            success: true as const,
            imageUrl: cleanDataUrl(s.cleanPng),
            timeSec: s.timeSec,
            label,
            watermark: "none",
            previewVault: vault,
          });
        }
      }

      const primaryShot = shots[primaryIdx];
      return NextResponse.json({
        stage,
        mock: forceMock,
        watermark: "none",
        shots,
        selectedIndex: primaryIdx,
        shot: {
          success: true,
          imageUrl: primaryShot.imageUrl,
          timeSec: primaryShot.timeSec,
          label: primaryShot.label,
          easter: primaryShot.easter,
        },
        preview: {
          success: true,
          imageUrl: primaryShot.imageUrl,
          timeSec: primaryShot.timeSec,
          label: primaryShot.label,
        },
        previewAssetId: delivered.previewAssetId,
        previewVault: primaryShot.previewVault,
        unlockToken: delivered.unlockToken,
        redoUsed: delivered.redoUsed,
        asvUsed: delivered.asvUsed,
        cutDeliveredAt: delivered.cutDeliveredAt,
        easter: {
          hit: flags.some(Boolean),
          slot: flags.findIndex(Boolean) >= 0 ? flags.findIndex(Boolean) : null,
        },
      });
    };

    // —— preview: N컷(기본 1) 클린 생성 → 당첨 1슬롯만 워터마크 합성 ——
    if (stage === "preview") {
      const roll = rollEasterSlot({ optOut: easterOptOut });
      const slotMeta = Array.from({ length: PREVIEW_SHOT_COUNT }, (_, i) => {
        const isEaster = roll.hit && roll.slot === i;
        return {
          variantIndex: previewVariantIndex(i),
          easter: isEaster,
          easterVariant: isEaster ? roll.variant ?? undefined : undefined,
          label: isEaster ? EASTER_LABEL : `컷 ${i + 1}`,
        };
      });

      const previewStarted = Date.now();
      if (forceMock) {
        const mocked = await Promise.all(
          slotMeta.map(async (m) => {
            const cleanPng = await mockCleanPng(m.label);
            return {
              cleanPng,
              timeSec: "0.1",
              easter: m.easter,
              easterVariant: m.easterVariant,
            };
          })
        );
        await noteGen({
          stage: "preview",
          geminiCalls: 0,
          geminiOk: 0,
          mock: true,
          ok: true,
          purposeId,
          orderPrefix: shortOrderPrefix(orderId),
          ms: Date.now() - previewStarted,
        });
        return finishPaidPreview(mocked);
      }

      // 과금 HTTP는 geminiBillGate만 — 티켓당 hardMax(기본 1)
      // maint 자동은 ticketId "maint:" 접두 + via 기록 (사람 컷과 구분)
      const ticket = openGeminiTicket({
        ticketId: withMaintTicketPrefix(`preview:${orderId}`, maintSmoke),
        maxCalls: 1,
        stage: "preview",
        orderPrefix: billOrderPrefix(orderId),
        purposeId,
        actorHash: shortActorHash(readDeviceFp(req) || clientIp(req)),
        via: maintVia,
      });

      const callLite = async (v: number | undefined): Promise<ModelResult> => {
        const prompt = buildPrompt(purposeId, v, {
          look: subjectLook,
          season: subjectSeason,
          extraPresetIds,
          extraCustom: extraCustom || undefined,
          extra: legacyExtra || undefined,
        });
        const r = await ticket.callLite1K({
          prompt,
          rawBase64,
          mimeType,
        });
        if (!r.ok) {
          return { success: false, error: STUDIO_BUSY };
        }
        return {
          success: true as const,
          imageUrl: cleanDataUrl(r.cleanPng),
          timeSec: r.timeSec,
          cleanPng: r.cleanPng,
        };
      };

      // 순차 1컷 — Promise.all N연발 ✗ (티켓 예산이 막지만 호출면도 1회)
      const results: ModelResult[] = [];
      for (const m of slotMeta.slice(0, 1)) {
        results.push(await callLite(m.variantIndex));
      }

      const geminiOk = results.filter((r) => r.success && r.cleanPng).length;
      const finalized: {
        cleanPng: Buffer;
        timeSec: string;
        easter: boolean;
        easterVariant?: "glyph" | "animal";
      }[] = [];
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (!r.success || !r.cleanPng) {
          await noteGen({
            stage: "preview",
            geminiCalls: PREVIEW_SHOT_COUNT,
            geminiOk,
            mock: false,
            ok: false,
            code: "STUDIO_BUSY",
            purposeId,
            orderPrefix: shortOrderPrefix(orderId),
            ms: Date.now() - previewStarted,
          });
          return NextResponse.json(
            { error: STUDIO_BUSY, code: "STUDIO_BUSY" },
            { status: 503 }
          );
        }
        finalized.push({
          cleanPng: r.cleanPng,
          timeSec: r.timeSec,
          easter: slotMeta[i].easter,
          easterVariant: slotMeta[i].easterVariant,
        });
      }
      await noteGen({
        stage: "preview",
        geminiCalls: PREVIEW_SHOT_COUNT,
        geminiOk: PREVIEW_SHOT_COUNT,
        mock: false,
        ok: true,
        purposeId,
        orderPrefix: shortOrderPrefix(orderId),
        ms: Date.now() - previewStarted,
      });
      return finishPaidPreview(finalized);
    }

    // —— redo / asv: 단일 컷 (이스터 ✗) ——
    const variantIndex = stage === "redo" ? 0 : 1;
    const label = stage === "redo" ? "다시 만든 컷" : "A/S 서비스 컷";
    const singleStarted = Date.now();

    if (forceMock) {
      const cleanPng = await mockCleanPng(label);
      await noteGen({
        stage,
        geminiCalls: 0,
        geminiOk: 0,
        mock: true,
        ok: true,
        purposeId,
        orderPrefix: shortOrderPrefix(orderId),
        ms: Date.now() - singleStarted,
      });
      return finishPaidSingle(cleanPng, "0.1", label);
    }

    const ticket = openGeminiTicket({
      ticketId: withMaintTicketPrefix(`${stage}:${orderId}`, maintSmoke),
      maxCalls: 1,
      stage,
      orderPrefix: billOrderPrefix(orderId),
      purposeId,
      actorHash: shortActorHash(readDeviceFp(req) || clientIp(req)),
      via: maintVia,
    });
    const prompt = buildPrompt(purposeId, variantIndex, {
      look: subjectLook,
      season: subjectSeason,
      extraPresetIds,
      extraCustom: extraCustom || undefined,
      extra: legacyExtra || undefined,
    });
    const lite = await ticket.callLite1K({
      prompt,
      rawBase64,
      mimeType,
    });
    const result: ModelResult = lite.ok
      ? {
          success: true,
          imageUrl: cleanDataUrl(lite.cleanPng),
          timeSec: lite.timeSec,
          cleanPng: lite.cleanPng,
        }
      : { success: false, error: STUDIO_BUSY };
    if (!result.success || !result.cleanPng) {
      await noteGen({
        stage,
        geminiCalls: 1,
        geminiOk: 0,
        mock: false,
        ok: false,
        code: "STUDIO_BUSY",
        purposeId,
        orderPrefix: shortOrderPrefix(orderId),
        ms: Date.now() - singleStarted,
      });
      return NextResponse.json(
        { error: STUDIO_BUSY, code: "STUDIO_BUSY" },
        { status: 503 }
      );
    }

    await noteGen({
      stage,
      geminiCalls: 1,
      geminiOk: 1,
      mock: false,
      ok: true,
      purposeId,
      orderPrefix: shortOrderPrefix(orderId),
      ms: Date.now() - singleStarted,
    });
    return finishPaidSingle(result.cleanPng, result.timeSec, label);
  } catch (err) {
    console.error("[generate] unhandled", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: STUDIO_RETRY, code: "STUDIO_RETRY" },
      { status: 500 }
    );
  }
}
