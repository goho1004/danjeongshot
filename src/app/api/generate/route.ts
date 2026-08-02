import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  buildPrompt,
  getPurpose,
  parseExtraPresetIds,
  parseSubjectLook,
  parseSubjectSeason,
  sanitizeExtraPrompt,
} from "@/lib/purposes";
import {
  canRunAsv,
  canRunRedo,
  markAsv,
  markCutDelivered,
  markRedo,
  putOrder,
  resolveOrder,
} from "@/lib/orders";
import {
  bindPreviewToOrder,
  replaceCleanAsset,
  storePreviewAsset,
} from "@/lib/previewAssets";
import { sealPreviewVault } from "@/lib/previewVault";
import { gatePaidGenerate } from "@/lib/generateGate";
import {
  STUDIO_BUSY,
  STUDIO_RETRY,
  toUserFacingGenerateError,
} from "@/lib/userFacingErrors";

export const runtime = "nodejs";
export const maxDuration = 90;

type ModelResult =
  | { success: true; imageUrl: string; timeSec: string; cleanPng?: Buffer }
  | { success: false; error: string };

type Stage = "preview" | "redo" | "asv";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const stage = parseStage(body.stage);
    const imageBase64: string | undefined = body.imageBase64;
    const purposeId: string = body.purposeId ?? "resume";
    const subjectLook = parseSubjectLook(body.subjectLook);
    const subjectSeason = parseSubjectSeason(body.subjectSeason);
    const orderId = String(body.orderId ?? "");
    const unlockToken = String(body.unlockToken ?? "");

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
      const order = resolveOrder(orderId, unlockToken);
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
    }

    if (stage === "redo") {
      const gate = canRunRedo(orderId, unlockToken);
      if (!gate.ok) {
        return NextResponse.json(
          { error: toUserFacingGenerateError(gate.reason, "generic") },
          { status: 403 }
        );
      }
    }
    if (stage === "asv") {
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

    const apiKey = process.env.GEMINI_API_KEY;
    const forceMock = process.env.MOCK_GENERATE === "1" || !apiKey || apiKey.trim() === "";

    const variantIndex = stage === "preview" ? undefined : stage === "redo" ? 0 : 1;
    const label =
      stage === "preview" ? "첫 컷" : stage === "redo" ? "다시 만든 컷" : "A/S 서비스 컷";

    const finishPaid = async (cleanPng: Buffer, timeSec: string) => {
      let order =
        stage === "redo"
          ? markRedo(orderId, unlockToken)
          : stage === "asv"
            ? markAsv(orderId, unlockToken)
            : resolveOrder(orderId, unlockToken);
      if (!order?.paid) {
        return NextResponse.json(
          { error: "결제 확인 후 만들 수 있습니다." },
          { status: 403 }
        );
      }
      // 서버리스: 메모리가 비면 replace가 실패 → vault + 재저장으로 인스턴스 복구
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
      const previewVault = sealPreviewVault({ cleanPng, purposeId });
      const imageUrl = cleanDataUrl(cleanPng);
      return NextResponse.json({
        stage,
        mock: forceMock,
        watermark: "none",
        shot: { success: true, imageUrl, timeSec, label },
        // 첫 컷 응답 호환 (클라이언트가 preview 키를 볼 수 있음)
        preview: { success: true, imageUrl, timeSec, label },
        previewAssetId: delivered.previewAssetId,
        previewVault,
        unlockToken: delivered.unlockToken,
        redoUsed: delivered.redoUsed,
        asvUsed: delivered.asvUsed,
        cutDeliveredAt: delivered.cutDeliveredAt,
      });
    };

    if (forceMock) {
      const cleanPng = await mockCleanPng(label);
      return finishPaid(cleanPng, "0.1");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey! });

    /**
     * 정책: 전 구간 gemini-3.1-flash-lite-image @ 1K만.
     * lite@2K는 미지원(404). flash/pro 폴백 금지(원가·품질 정책).
     */
    const modelChain: { model: string; imageSize: "1K" }[] = [
      { model: "gemini-3.1-flash-lite-image", imageSize: "1K" },
    ];

    const callLite = async (v?: number): Promise<ModelResult> => {
      const extraPresetIds = parseExtraPresetIds(body.extraPresetIds);
      const extraCustom = sanitizeExtraPrompt(body.extraCustom);
      // 레거시: 클라이언트가 합친 extraPrompt만 보낸 경우
      const legacyExtra =
        !extraPresetIds.length && !extraCustom
          ? sanitizeExtraPrompt(body.extraPrompt)
          : "";
      const prompt = buildPrompt(purposeId, v, {
        look: subjectLook,
        season: subjectSeason,
        extraPresetIds,
        extraCustom: extraCustom || undefined,
        extra: legacyExtra || undefined,
      });
      const start = Date.now();
      const errors: string[] = [];

      for (const { model, imageSize } of modelChain) {
        try {
          const interaction = await ai.interactions.create({
            model,
            input: [
              { type: "text", text: prompt },
              { type: "image", data: rawBase64, mime_type: mimeType },
            ],
            response_format: {
              type: "image",
              aspect_ratio: "3:4",
              image_size: imageSize,
            },
          });
          const timeSec = ((Date.now() - start) / 1000).toFixed(1);
          if (interaction?.output_image?.data) {
            const cleanBuf = Buffer.from(interaction.output_image.data, "base64");
            return {
              success: true as const,
              imageUrl: `data:image/png;base64,${interaction.output_image.data}`,
              timeSec,
              cleanPng: cleanBuf,
            };
          }
          errors.push("no_image");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          // 원문은 서버 로그만 — 클라이언트로 절대 전달 금지
          console.warn(`[generate] provider:`, msg.slice(0, 240));
          errors.push("provider");
        }
      }

      return {
        success: false,
        error: STUDIO_BUSY,
      };
    };

    const result = await callLite(variantIndex);
    if (!result.success || !result.cleanPng) {
      return NextResponse.json(
        { error: STUDIO_BUSY, code: "STUDIO_BUSY" },
        { status: 503 }
      );
    }

    // 결제 후 컷은 워터마크 없이 클린본만
    return finishPaid(result.cleanPng, result.timeSec);
  } catch (err) {
    console.error("[generate] unhandled", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: STUDIO_RETRY, code: "STUDIO_RETRY" },
      { status: 500 }
    );
  }
}
