import { NextRequest, NextResponse } from "next/server";
import { getOrder, markPaid, unsealOrder } from "@/lib/orders";

/** 샌드박스 즉시 결제 완료. toss 는 /api/checkout/confirm 사용. */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const orderId = String(body.orderId ?? "");
  const orderTicket = String(body.orderTicket ?? body.unlockToken ?? "");

  if (!orderId) {
    return NextResponse.json({ error: "주문 ID가 없습니다." }, { status: 400 });
  }

  let base = getOrder(orderId);
  if (!base && orderTicket) base = unsealOrder(orderTicket) ?? undefined;
  if (!base || base.id !== orderId) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  if (base.paid) {
    return NextResponse.json({
      ok: true,
      alreadyPaid: true,
      orderId: base.id,
      unlockToken: base.unlockToken,
      amountKrw: base.amountKrw,
      packId: base.packId,
      includeLayout: base.includeSheet,
      layoutPaidSizeIds: base.layoutPaidSizeIds,
      redoUsed: base.redoUsed,
      asvUsed: base.asvUsed,
    });
  }

  const paid = markPaid(orderId, orderTicket || base.unlockToken);
  if (!paid) {
    return NextResponse.json({ error: "결제 반영에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    orderId: paid.id,
    unlockToken: paid.unlockToken,
    amountKrw: paid.amountKrw,
    packId: paid.packId,
    includeLayout: paid.includeSheet,
    layoutPaidSizeIds: paid.layoutPaidSizeIds,
    redoUsed: paid.redoUsed,
    asvUsed: paid.asvUsed,
  });
}
