import { NextRequest, NextResponse } from "next/server";
import { createSandboxOrder, type PackId } from "@/lib/orders";
import {
  PLUS_LAYOUT_SIZE_IDS,
  getPack,
  getPurpose,
  packAmountKrw,
} from "@/lib/purposes";
import {
  bindPreviewToOrder,
  getPreviewAsset,
  storePreviewAsset,
} from "@/lib/previewAssets";
import { unsealPreviewVault } from "@/lib/previewVault";
import { getPaymentMode, getTossClientKey } from "@/lib/toss";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const purposeId = String(body.purposeId ?? "resume");
  const packId: PackId = body.packId === "plus" ? "plus" : "basic";
  const previewAssetId = String(body.previewAssetId ?? "");
  const previewVault = String(body.previewVault ?? "");

  if (!getPurpose(purposeId)) {
    return NextResponse.json({ error: "잘못된 용도" }, { status: 400 });
  }

  let asset = previewAssetId ? getPreviewAsset(previewAssetId) : undefined;
  if (!asset && previewVault) {
    const opened = unsealPreviewVault(previewVault);
    if (opened) {
      asset = storePreviewAsset({
        cleanPng: opened.cleanPng,
        purposeId: opened.purposeId || purposeId,
        id: previewAssetId || undefined,
      });
    }
  }
  if (!asset) {
    return NextResponse.json(
      {
        error: "미리보기 세션이 만료되었습니다. 첫 컷을 다시 만들어 주세요.",
        code: "PREVIEW_EXPIRED",
      },
      { status: 400 }
    );
  }

  const pack = getPack(packId);
  const amountKrw = packAmountKrw(packId);
  const includeSheet = packId === "plus";
  const layoutPaidSizeIds =
    packId === "plus" ? [...PLUS_LAYOUT_SIZE_IDS] : [];

  const order = createSandboxOrder({
    purposeId,
    packId,
    includeSheet,
    amountKrw,
    previewAssetId: asset.id,
    layoutPaidSizeIds,
    layoutFreeUsed: layoutPaidSizeIds.length > 0,
  });
  bindPreviewToOrder(asset.id, order.id);

  const mode = getPaymentMode();
  const clientKey = mode === "toss" ? getTossClientKey() : null;

  return NextResponse.json({
    mode,
    clientKey,
    orderId: order.id,
    orderTicket: order.unlockToken,
    amountKrw: order.amountKrw,
    packId: order.packId,
    includeLayout: includeSheet,
    layoutPaidSizeIds: order.layoutPaidSizeIds,
    previewAssetId: asset.id,
    orderName: `증명사진 -단정- ${pack.name}`,
    notice:
      mode === "toss"
        ? `${pack.name} ₩${amountKrw.toLocaleString("ko-KR")} · 토스페이먼츠 결제 · 받은 뒤 환불 어려움`
        : `${pack.name} ₩${amountKrw.toLocaleString("ko-KR")} · 여권·관공서 제출용 아님 · 받은 뒤 환불 어려움 · 샌드박스 결제`,
  });
}
