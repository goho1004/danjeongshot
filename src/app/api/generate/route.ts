import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { buildPrompt, getPurpose, parseSubjectLook, parseSubjectSeason } from "@/lib/purposes";
import {
  canRunAsv,
  canRunRedo,
  markAsv,
  markRedo,
  putOrder,
  resolveOrder,
} from "@/lib/orders";
import {
  gatePreviewGenerate,
  previewQuotaConfig,
  writePreviewCookie,
} from "@/lib/previewQuota";
import { burnSubtleWatermark } from "@/lib/watermark";
import {
  bindPreviewToOrder,
  replaceCleanAsset,
  storePreviewAsset,
} from "@/lib/previewAssets";
import { sealPreviewVault } from "@/lib/previewVault";

export const runtime = "nodejs";
export const maxDuration = 90;

type ModelResult =
  | { success: true; imageUrl: string; timeSec: string; cleanPng?: Buffer }
  | { success: false; error: string };

type Stage = "preview" | "redo" | "asv";

function mockPngDataUrl(label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop stop-color="#d8efe9"/><stop offset="1" stop-color="#f4f6f9"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="46%" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#0f4a3f">단정샷 MOCK</text>
    <text x="50%" y="54%" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#5a6578">${label}</text>
  </svg>`;
  const b64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}

async function mockAsPng(label: string): Promise<{ previewDataUrl: string; cleanPng: Buffer }> {
  // SVG → PNG via sharp path inside burnSubtleWatermark
  const dataUrl = mockPngDataUrl(label);
  try {
    return await burnSubtleWatermark(dataUrl);
  } catch {
    // sharp가 SVG를 못 읽으면 최소 PNG 생성
    const { default: sharp } = await import("sharp");
    const cleanPng = await sharp({
      create: {
        width: 600,
        height: 800,
        channels: 3,
        background: { r: 216, g: 239, b: 233 },
      },
    })
      .png()
      .toBuffer();
    return burnSubtleWatermark(cleanPng);
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

function jsonWithQuota(
  body: Record<string, unknown>,
  init: { status?: number },
  quota?: { count: number; day: string; fpHash?: string }
): NextResponse {
  const res = NextResponse.json(body, init);
  if (quota) writePreviewCookie(res, quota);
  return res;
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

    let previewQuota: { count: number; day: string; fpHash?: string } | undefined;
    if (stage === "preview") {
      const gate = await gatePreviewGenerate(req, rawBase64, {
        challengeToken: String(body.challengeToken ?? ""),
        turnstileToken: String(body.turnstileToken ?? ""),
      });
      if (!gate.ok) {
        return NextResponse.json(
          {
            error: gate.error,
            code: gate.code,
            payHint: true,
            challengeRequired: !!gate.challengeRequired,
            abuseLevel: gate.abuseLevel,
            dayCount: gate.dayCount,
            burstCount: gate.burstCount,
            makeHint: "결제 후 다시 만들기·A/S를 이용하세요.",
            quota: previewQuotaConfig(),
          },
          {
            status: gate.status,
            headers: {
              ...(gate.retryAfterSec
                ? { "Retry-After": String(gate.retryAfterSec) }
                : {}),
              ...(gate.abuseLevel
                ? { "X-Djs-Abuse-Level": gate.abuseLevel }
                : {}),
            },
          }
        );
      }
      previewQuota = { count: gate.nextCount, day: gate.day, fpHash: gate.fpHash };
    }

    if (stage === "redo") {
      const gate = canRunRedo(orderId, unlockToken);
      if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 });
    }
    if (stage === "asv") {
      const gate = canRunAsv(orderId, unlockToken);
      if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const forceMock = process.env.MOCK_GENERATE === "1" || !apiKey || apiKey.trim() === "";

    const variantIndex = stage === "preview" ? undefined : stage === "redo" ? 0 : 1;
    const label =
      stage === "preview" ? "첫 컷" : stage === "redo" ? "다시 만든 컷" : "A/S 서비스 컷";

    const finishPaid = async (cleanPng: Buffer, previewDataUrl: string, timeSec: string) => {
      let order =
        stage === "redo"
          ? markRedo(orderId, unlockToken)
          : stage === "asv"
            ? markAsv(orderId, unlockToken)
            : resolveOrder(orderId, unlockToken);
      if (!order) {
        return NextResponse.json(
          { error: "결제 확인 후 다시 만들 수 있습니다." },
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
      const previewVault = sealPreviewVault({ cleanPng, purposeId });
      return NextResponse.json({
        stage,
        mock: forceMock,
        shot: { success: true, imageUrl: previewDataUrl, timeSec, label },
        previewAssetId: order.previewAssetId,
        previewVault,
        unlockToken: order.unlockToken,
        redoUsed: order.redoUsed,
        asvUsed: order.asvUsed,
      });
    };

    if (forceMock) {
      const marked = await mockAsPng(label);
      if (stage === "preview") {
        const asset = storePreviewAsset({ cleanPng: marked.cleanPng, purposeId });
        const previewVault = sealPreviewVault({
          cleanPng: marked.cleanPng,
          purposeId,
        });
        return jsonWithQuota(
          {
            mock: true,
            stage,
            previewAssetId: asset.id,
            previewVault,
            watermark: "subtle",
            preview: {
              success: true,
              imageUrl: marked.previewDataUrl,
              timeSec: "0.1",
              label,
            },
            previewLeft: Math.max(
              0,
              previewQuotaConfig().perDeviceDay - (previewQuota?.count ?? 0)
            ),
          },
          {},
          previewQuota
        );
      }
      return finishPaid(marked.cleanPng, marked.previewDataUrl, "0.1");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey! });

    /**
     * lite@2K → Google이 404 반환 (모델 없음이 아니라 size 조합 미지원).
     * 2.5-flash-image는 2026-10-02 종료 예정 → 폴백에서 제외, 3.1만 사용.
     */
    const modelChain: { model: string; imageSize: "1K" | "2K" }[] =
      stage === "preview"
        ? [
            { model: "gemini-3.1-flash-lite-image", imageSize: "1K" },
            { model: "gemini-3.1-flash-image", imageSize: "1K" },
          ]
        : [
            { model: "gemini-3.1-flash-image", imageSize: "2K" },
            { model: "gemini-3.1-flash-image", imageSize: "1K" },
            { model: "gemini-3.1-flash-lite-image", imageSize: "1K" },
          ];

    const callLite = async (v?: number): Promise<ModelResult> => {
      const prompt = buildPrompt(purposeId, v, {
        look: subjectLook,
        season: subjectSeason,
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
          errors.push(`${model}@${imageSize}: no image`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[generate] ${model}@${imageSize}:`, msg.slice(0, 200));
          errors.push(`${model}@${imageSize}`);
        }
      }

      return {
        success: false,
        error: `이미지 생성 실패 (${errors.join(" → ")}). 잠시 후 다시 시도해 주세요.`,
      };
    };

    const result = await callLite(variantIndex);
    if (!result.success || !result.cleanPng) {
      return NextResponse.json(
        { error: `생성 실패. ${!result.success ? result.error : "버퍼 없음"}` },
        { status: 500 }
      );
    }

    const marked = await burnSubtleWatermark(result.cleanPng);

    if (stage === "preview") {
      const asset = storePreviewAsset({ cleanPng: marked.cleanPng, purposeId });
      const previewVault = sealPreviewVault({
        cleanPng: marked.cleanPng,
        purposeId,
      });
      return jsonWithQuota(
        {
          stage,
          mock: false,
          previewAssetId: asset.id,
          previewVault,
          watermark: "subtle",
          preview: {
            success: true,
            imageUrl: marked.previewDataUrl,
            timeSec: result.timeSec,
            label,
          },
          previewLeft: Math.max(
            0,
            previewQuotaConfig().perDeviceDay - (previewQuota?.count ?? 0)
          ),
        },
        {},
        previewQuota
      );
    }

    return finishPaid(marked.cleanPng, marked.previewDataUrl, result.timeSec);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "생성 처리 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
