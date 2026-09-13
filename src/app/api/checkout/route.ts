import { NextRequest, NextResponse } from "next/server";
import {
  getAgent,
  normalizePartnerCode,
  snapshotFromAgent,
} from "@/lib/agents";
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
import { persistOrder } from "@/lib/orderDurable";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const purposeId = String(body.purposeId ?? "resume");
  const packId: PackId = body.packId === "plus" ? "plus" : "basic";
  const previewAssetId = String(body.previewAssetId ?? "");
  const previewVault = String(body.previewVault ?? "");
  const partnerRaw = normalizePartnerCode(body.partnerCode ?? body.partner);
  const agent = partnerRaw ? getAgent(partnerRaw) : null;
  const snap = agent ? snapshotFromAgent(agent) : null;

  if (!getPurpose(purposeId)) {
    return NextResponse.json({ error: "잘못된 용도" }, { status: 400 });
  }

  // pay-first: 결제 전 미리보기 자산 없이도 주문 생성 가능
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
    previewAssetId: asset?.id ?? null,
    layoutPaidSizeIds,
    layoutFreeUsed: layoutPaidSizeIds.length > 0,
    partnerCode: snap?.partnerCode ?? null,
    ratePctSnapshot: snap?.ratePctSnapshot ?? null,
    agentTypeSnapshot: snap?.agentTypeSnapshot ?? null,
    taxModeSnapshot: snap?.taxModeSnapshot ?? null,
    payoutCycleSnapshot: snap?.payoutCycleSnapshot ?? null,
    holdCapPctSnapshot: snap?.holdCapPctSnapshot ?? null,
    holdTargetPctSnapshot: snap?.holdTargetPctSnapshot ?? null,
    refundLagSnapshot: snap?.refundLagSnapshot ?? null,
  });
  if (asset) bindPreviewToOrder(asset.id, order.id);
  await persistOrder(order);

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
    previewAssetId: asset?.id ?? null,
    partnerCode: order.partnerCode,
    orderName: `증명사진 -단정- ${pack.name}`,
    notice:
      mode === "toss"
        ? `${pack.name} ₩${amountKrw.toLocaleString("ko-KR")} · 토스페이먼츠 결제 · 받은 뒤 환불 어려움`
        : `${pack.name} ₩${amountKrw.toLocaleString("ko-KR")} · 여권·관공서 제출용 아님 · 받은 뒤 환불 어려움 · 샌드박스 결제`,
    partnerIgnored: partnerRaw && !agent ? partnerRaw : null,
  });
}
