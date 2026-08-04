import { NextRequest, NextResponse } from "next/server";
import {
  markDownloaded,
  resolveOrder,
  verifyUnlock,
  canDownloadExtraShot,
} from "@/lib/orders";
import {
  getCleanForDownload,
  storePreviewAsset,
  bindPreviewToOrder,
} from "@/lib/previewAssets";
import { unsealPreviewVault } from "@/lib/previewVault";
import {
  isValidDeliverEmail,
  sendPngByEmail,
  type DeliverKind,
} from "@/lib/deliverEmail";

type Body = {
  orderId?: string;
  unlockToken?: string;
  email?: string;
  kind?: DeliverKind;
  /** clean 일 때 */
  previewVault?: string;
  shotId?: string;
  mode?: string;
  /** layout 일 때 — 클라이언트가 만든 타일 PNG */
  pngBase64?: string;
  filename?: string;
  easter?: boolean;
  easterVariant?: "glyph" | "animal";
  easterStrip?: boolean;
};

function siteUrl(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    req.nextUrl.origin ||
    "https://danjeongshot.vercel.app"
  );
}

/**
 * 단정/인화 PNG를 이메일로 전달.
 * 성공 시 downloadedAt 마킹(환불 게이트 = 다운로드와 동일).
 */
export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const orderId = String(body.orderId ?? "");
  const unlockToken = String(body.unlockToken ?? "");
  const email = String(body.email ?? "").trim().toLowerCase();
  const kind: DeliverKind = body.kind === "layout" ? "layout" : "clean";
  const mode = String(body.mode ?? "primary");
  const shotId = String(body.shotId ?? "");
  const previewVault = String(body.previewVault ?? "");

  if (!orderId || !unlockToken) {
    return NextResponse.json({ error: "주문 정보가 없습니다." }, { status: 400 });
  }
  if (!isValidDeliverEmail(email)) {
    return NextResponse.json(
      { error: "이메일 주소를 확인해 주세요.", code: "BAD_EMAIL" },
      { status: 400 }
    );
  }
  if (!verifyUnlock(orderId, unlockToken)) {
    return NextResponse.json(
      {
        error: "결제 확인이 필요합니다. 같은 기기·브라우저에서 다시 결제해 주세요.",
        code: "UNLOCK_FAIL",
      },
      { status: 403 }
    );
  }

  const order = resolveOrder(orderId, unlockToken);
  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  let png: Buffer | null = null;
  let filename = String(body.filename || "").trim() || "danjeongshot.png";

  if (kind === "layout") {
    const b64 = String(body.pngBase64 ?? "").replace(/^data:image\/png;base64,/, "");
    if (!b64 || b64.length < 32) {
      return NextResponse.json(
        { error: "인화 레이아웃 파일이 없습니다. 먼저 레이아웃을 준비해 주세요." },
        { status: 400 }
      );
    }
    if (!order.downloadedAt) {
      return NextResponse.json(
        { error: "먼저 단정 PNG를 받은 뒤 인화 레이아웃을 보낼 수 있어요." },
        { status: 400 }
      );
    }
    try {
      png = Buffer.from(b64, "base64");
    } catch {
      return NextResponse.json({ error: "레이아웃 파일을 읽지 못했습니다." }, { status: 400 });
    }
    if (!filename.includes("layout")) {
      filename = `danjeongshot-layout.png`;
    }
  } else {
    if (mode === "extra") {
      if (!shotId) {
        return NextResponse.json({ error: "추가 컷을 지정해 주세요." }, { status: 400 });
      }
      if (!canDownloadExtraShot(orderId, unlockToken, shotId)) {
        return NextResponse.json(
          { error: "추가 컷은 결제 후 받을 수 있어요.", code: "EXTRA_NOT_PAID" },
          { status: 402 }
        );
      }
    }

    if (previewVault) {
      const opened = unsealPreviewVault(previewVault);
      if (opened) {
        const assetId = order.previewAssetId || `prv_${shotId || "dl"}`;
        const asset = storePreviewAsset({
          cleanPng: opened.cleanPng,
          purposeId: order.purposeId || opened.purposeId,
          id: assetId,
        });
        bindPreviewToOrder(asset.id, orderId);
        png = asset.cleanPng;
      }
    }
    if (!png && order.previewAssetId) {
      png = getCleanForDownload(order.previewAssetId, orderId);
    }
    if (!png) {
      return NextResponse.json(
        {
          error: "세션이 만료되었습니다. 다시 만들기 후 받아 주세요.",
          code: "PREVIEW_EXPIRED",
        },
        { status: 410 }
      );
    }
    if (body.easter === true && body.easterStrip !== true) {
      const { burnEasterWatermark } = await import("@/lib/watermark");
      const variant = body.easterVariant === "animal" ? "animal" : "glyph";
      const burned = await burnEasterWatermark(png, variant);
      png = burned.markedPng;
    }
    filename = filename || `danjeongshot-${order.purposeId}.png`;
  }

  const sent = await sendPngByEmail({
    to: email,
    png,
    filename,
    kind,
    orderId,
    siteUrl: siteUrl(req),
  });

  if (!sent.ok) {
    return NextResponse.json({ error: sent.error, code: "SEND_FAIL" }, { status: 502 });
  }

  let marked = order;
  if (kind === "clean" && (mode === "primary" || mode === "again")) {
    const m = markDownloaded(orderId, unlockToken, "email");
    if (!m) {
      return NextResponse.json({ error: "주문 확인 실패" }, { status: 403 });
    }
    marked = m;
  } else {
    marked = resolveOrder(orderId, unlockToken) || order;
  }

  return NextResponse.json({
    ok: true,
    mock: !!sent.mock,
    downloadedAt: marked.downloadedAt,
    deliverChannel: marked.deliverChannel,
    unlockToken: marked.unlockToken,
    notice: sent.mock
      ? "로컬(모의) 발송으로 처리했어요. RESEND_API_KEY 설정 후 실제 메일이 갑니다."
      : `${email}로 보냈어요. 메일함에서 PNG를 열어 저장한 뒤 프린팅박스에 올리세요.`,
  });
}
