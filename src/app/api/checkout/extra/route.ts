import { NextRequest, NextResponse } from "next/server";
import {
  markExtraShotPaid,
  resolveOrder,
  canDownloadExtraShot,
} from "@/lib/orders";
import { PRICE } from "@/lib/purposes";
import { sealPreviewVault, unsealPreviewVault } from "@/lib/previewVault";
import { storePreviewAsset, bindPreviewToOrder } from "@/lib/previewAssets";

/**
 * 추가 컷: 샌드박스 결제 + 클린 PNG를 한 번에.
 * previewVault를 같이 보내면 cleanBase64까지 반환 (왕복·토큰 불일치 방지).
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const orderId = String(body.orderId ?? "");
  const unlockToken = String(body.unlockToken ?? "");
  const shotId = String(body.shotId ?? "");
  const previewVault = String(body.previewVault ?? "");

  if (!orderId || !unlockToken || !shotId) {
    return NextResponse.json({ error: "주문·컷 정보가 필요합니다." }, { status: 400 });
  }

  const order = resolveOrder(orderId, unlockToken);
  if (!order || !order.paid) {
    return NextResponse.json({ error: "결제 확인 후 이용할 수 있습니다." }, { status: 403 });
  }
  if (!order.downloadedAt) {
    return NextResponse.json(
      {
        error: "먼저 마음에 드는 컷을 받아 주세요. 그다음 다른 컷을 추가할 수 있어요.",
        code: "PRIMARY_FIRST",
      },
      { status: 400 }
    );
  }

  let updated = order;
  let amountKrw = 0;
  if (!order.extraPaidShotIds.includes(shotId)) {
    const paid = markExtraShotPaid(orderId, unlockToken, shotId);
    if (!paid) {
      return NextResponse.json({ error: "추가 결제에 실패했습니다." }, { status: 500 });
    }
    updated = paid;
    amountKrw = PRICE.extraShotKrw;
  }

  if (!previewVault) {
    return NextResponse.json({
      ok: true,
      mode: "sandbox",
      orderId,
      shotId,
      unlockToken: updated.unlockToken,
      amountKrw,
      notice:
        amountKrw > 0
          ? `추가 컷 ₩${amountKrw.toLocaleString("ko-KR")} (샌드박스 결제 완료)`
          : "이미 결제된 컷입니다.",
    });
  }

  if (!canDownloadExtraShot(orderId, updated.unlockToken, shotId)) {
    return NextResponse.json(
      { error: "추가 컷은 결제 후 받을 수 있어요.", code: "EXTRA_NOT_PAID" },
      { status: 402 }
    );
  }

  const opened = unsealPreviewVault(previewVault);
  if (!opened) {
    return NextResponse.json(
      {
        error: "이 컷 파일이 만료되었거나 손상되었습니다. 다시 만들기를 이용해 주세요.",
        code: "VAULT_INVALID",
      },
      { status: 410 }
    );
  }

  const assetId = `prv_extra_${shotId}`;
  storePreviewAsset({
    cleanPng: opened.cleanPng,
    purposeId: order.purposeId || opened.purposeId,
    id: assetId,
  });
  bindPreviewToOrder(assetId, orderId);

  const nextVault = sealPreviewVault({
    cleanPng: opened.cleanPng,
    purposeId: opened.purposeId,
  });

  let outPng = opened.cleanPng;
  if (body.easter === true && body.easterStrip !== true) {
    const { burnEasterWatermark } = await import("@/lib/watermark");
    const variant = body.easterVariant === "animal" ? "animal" : "glyph";
    const burned = await burnEasterWatermark(opened.cleanPng, variant);
    outPng = burned.markedPng;
  }

  return NextResponse.json({
    ok: true,
    mode: "sandbox",
    orderId,
    shotId,
    unlockToken: updated.unlockToken,
    amountKrw,
    mimeType: "image/png",
    cleanBase64: outPng.toString("base64"),
    previewVault: nextVault,
    notice:
      amountKrw > 0
        ? `추가 컷 ₩${amountKrw.toLocaleString("ko-KR")} · 다운로드 준비됨`
        : "추가 컷 다운로드 준비됨",
  });
}
